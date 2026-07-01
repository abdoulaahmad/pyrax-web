// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Read-only Postgres access to the explorer indexer's data, used FIRST by the SSR data layer
// (chain.ts) for history + search + registries — the live RPC can't paginate blocks, list
// transactions, or give an address's tx/transfer history; the indexer can.
//
// Fail-safe by design: the pool is created ONLY when an explorer DB URL is configured
// (EXPLORER_DATABASE_URL / DATABASE_URL). With no DB, every reader returns null and the caller
// falls through to live-RPC → PYRAX-native sample. Any query error also returns null. So the
// explorer renders identically whether or not the indexer is provisioned.
import pg from "pg";
import { deriveSeal } from "./rpc";

const DB_URL = process.env.EXPLORER_DATABASE_URL || process.env.DATABASE_URL || "";

let pool: pg.Pool | null = null;
let initialized = false;
function getPool(): pg.Pool | null {
  if (initialized) return pool;
  initialized = true;
  if (!DB_URL) return (pool = null);
  try {
    pg.types.setTypeParser(20, (v: string) => (v === null ? null : Number(v)));
    const ssl = /sslmode=require/i.test(DB_URL) || process.env.DATABASE_SSL === "1";
    pool = new pg.Pool({
      connectionString: DB_URL.replace(/[?&]sslmode=[^&]*/gi, ""),
      ssl: ssl ? { rejectUnauthorized: !!process.env.DATABASE_CA, ca: process.env.DATABASE_CA || undefined } : false,
      max: Number(process.env.EXPLORER_PG_POOL_MAX ?? 4),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 6_000,
    });
    pool.on("error", () => {});
  } catch {
    pool = null;
  }
  return pool;
}

/** True when an explorer DB is configured (so chain.ts can prefer indexed reads). */
export const ready = (): boolean => !!getPool();

async function q<T = any>(text: string, params: unknown[]): Promise<T[] | null> {
  const p = getPool();
  if (!p) return null;
  try { return (await p.query(text, params)).rows as T[]; } catch { return null; }
}

// ---- mappers: indexer rows → the shapes the pages already consume ----
const PYRX = (wei: unknown): string => { try { return (Number(BigInt(String(wei ?? "0"))) / 1e18).toFixed(4); } catch { return "0.0000"; } };
const GWEI = (wei: unknown): string => (wei == null ? "0" : (Number(wei) / 1e9).toFixed(2));

function mapBlock(r: any) {
  const blueScore = Number(r.blue_score ?? r.number);
  const stream = r.stream || "A";
  return {
    number: Number(r.number), blueScore, hash: r.hash, parents: r.parent_hash ? [r.parent_hash] : [],
    stream, sealAlgo: r.seal_algo || deriveSeal(stream, blueScore), miner: r.miner || "0x",
    timestamp: Number(r.timestamp), txCount: Number(r.tx_count) || 0, gasUsed: Number(r.gas_used) || 0,
    gasLimit: Number(r.gas_limit) || 0, baseFee: GWEI(r.base_fee), size: Number(r.size) || 0,
  };
}
function mapTxRow(r: any) {
  return {
    hash: r.hash, type: r.tx_type || "ethereum", block: Number(r.block_number), timestamp: Number(r.block_time) || 0,
    status: r.status == null ? 1 : Number(r.status), from: r.from_addr, to: r.to_addr ?? null,
    value: PYRX(r.value), valueBalance: null,
  };
}

// ---- readers (return null ⇒ caller falls back to live/sample) ----
export async function blocks(chainId: number, beforeNum?: number) {
  const rows = beforeNum != null
    ? await q("SELECT * FROM blocks WHERE chain_id=$1 AND number<=$2 ORDER BY number DESC LIMIT 25", [chainId, beforeNum])
    : await q("SELECT * FROM blocks WHERE chain_id=$1 ORDER BY number DESC LIMIT 25", [chainId]);
  if (!rows || !rows.length) return null;
  return { source: "indexer" as const, head: Number(rows[0].number), blocks: rows.map(mapBlock) };
}

export async function block(chainId: number, idOrHash: string) {
  const isHash = /^0x[0-9a-fA-F]{64}$/.test(idOrHash);
  const rows = isHash
    ? await q("SELECT * FROM blocks WHERE chain_id=$1 AND hash=$2", [chainId, idOrHash.toLowerCase()])
    : await q("SELECT * FROM blocks WHERE chain_id=$1 AND number=$2", [chainId, Number(idOrHash)]);
  if (!rows || !rows.length) return null;
  const base = mapBlock(rows[0]);
  const txRows = (await q("SELECT * FROM txns WHERE chain_id=$1 AND block_number=$2 ORDER BY tx_index ASC", [chainId, base.number])) || [];
  return {
    source: "indexer" as const, ...base, txs: txRows.map(mapTxRow),
    // The indexer stores the block envelope, not the EVM state roots — shown as "—" on the page.
    stateRoot: null, transactionsRoot: null, receiptsRoot: null, blueWork: null, daaScore: base.blueScore, difficulty: null, finalized: false,
  };
}

// clamp + normalize pagination so the page layer can pass user query params straight through.
const lim = (v?: number, def = 25, max = 100) => Math.min(Math.max(1, Math.floor(Number(v) || def)), max);
const off = (v?: number) => Math.max(0, Math.floor(Number(v) || 0));

export async function txs(chainId: number, page: { limit?: number; offset?: number } = {}) {
  const limit = lim(page.limit), offset = off(page.offset);
  const rows = await q("SELECT * FROM txns WHERE chain_id=$1 ORDER BY block_number DESC, tx_index DESC LIMIT $2 OFFSET $3", [chainId, limit, offset]);
  if (!rows || !rows.length) return null;
  return { source: "indexer" as const, txs: rows.map(mapTxRow) };
}

export async function tx(chainId: number, hash: string) {
  const rows = await q("SELECT * FROM txns WHERE chain_id=$1 AND hash=$2", [chainId, hash.toLowerCase()]);
  if (!rows || !rows.length) return null;
  const r = rows[0];
  const logRows = (await q("SELECT * FROM logs WHERE chain_id=$1 AND tx_hash=$2 ORDER BY log_index ASC", [chainId, hash.toLowerCase()])) || [];
  return {
    source: "indexer" as const, hash: r.hash, type: r.tx_type || "ethereum", block: Number(r.block_number), blockHash: null,
    txIndex: Number(r.tx_index) || 0, timestamp: Number(r.block_time) || 0, status: r.status == null ? 1 : Number(r.status),
    from: r.from_addr, to: r.to_addr ?? null, value: PYRX(r.value), valueBalance: null, nonce: Number(r.nonce) || 0,
    gasLimit: Number(r.gas) || 0, gasUsed: 0, gasPrice: GWEI(r.gas_price), fee: "0",
    input: r.method_id || "0x", contractCreated: r.contract_created ?? null, nullifiers: [], commitments: [], anchor: null,
    logs: logRows.map((l: any) => ({ address: l.address, topics: [l.topic0, l.topic1, l.topic2, l.topic3].filter(Boolean), data: l.data })),
  };
}

export async function address(chainId: number, a: string) {
  const lc = a.toLowerCase();
  const [txCount, txRows] = await Promise.all([
    q("SELECT COUNT(*) c FROM txns WHERE chain_id=$1 AND (from_addr=$2 OR to_addr=$2)", [chainId, lc]),
    q("SELECT * FROM txns WHERE chain_id=$1 AND (from_addr=$2 OR to_addr=$2) ORDER BY block_number DESC, tx_index DESC LIMIT 25", [chainId, lc]),
  ]);
  if (txCount == null && txRows == null) return null;
  const code = await q("SELECT 1 FROM contracts WHERE chain_id=$1 AND address=$2", [chainId, lc]);
  return {
    source: "indexer" as const, address: a, isContract: !!(code && code.length),
    vm: code && code.length ? "evm" : null, txCount: Number(txCount?.[0]?.c) || 0,
    txs: (txRows || []).map(mapTxRow),
  };
}

export async function logs(chainId: number, opts: { address?: string; topic0?: string; fromBlock?: number; toBlock?: number; limit?: number; offset?: number } = {}) {
  const where = ["chain_id=$1"]; const args: unknown[] = [chainId];
  if (opts.address) { args.push(opts.address.toLowerCase()); where.push(`address=$${args.length}`); }
  if (opts.topic0) { args.push(opts.topic0.toLowerCase()); where.push(`topic0=$${args.length}`); }
  if (Number.isFinite(opts.fromBlock!)) { args.push(opts.fromBlock); where.push(`block_number>=$${args.length}`); }
  if (Number.isFinite(opts.toBlock!)) { args.push(opts.toBlock); where.push(`block_number<=$${args.length}`); }
  args.push(lim(opts.limit, 40)); const lp = args.length;
  args.push(off(opts.offset)); const op = args.length;
  const rows = await q(`SELECT * FROM logs WHERE ${where.join(" AND ")} ORDER BY block_number DESC, log_index DESC LIMIT $${lp} OFFSET $${op}`, args);
  if (!rows || !rows.length) return null;
  return { source: "indexer" as const, logs: rows.map((l: any) => ({
    address: l.address, event: null, topic0: l.topic0, topics: [l.topic0, l.topic1, l.topic2, l.topic3].filter(Boolean),
    data: l.data, block: Number(l.block_number), txHash: l.tx_hash, logIndex: Number(l.log_index), timestamp: 0,
  })) };
}

export async function contracts(chainId: number, page: { limit?: number; offset?: number } = {}) {
  const rows = await q("SELECT chain_id,address,name,compiler,verified_at FROM contracts WHERE chain_id=$1 ORDER BY verified_at DESC LIMIT $2 OFFSET $3", [chainId, lim(page.limit, 50), off(page.offset)]);
  if (!rows || !rows.length) return null;
  return { source: "indexer" as const, contracts: rows.map((c: any) => ({
    address: c.address, name: c.name || "Contract", vm: "evm", verified: !!c.verified_at,
    txCount: 0, balance: "0.0000", deployedBlock: 0, language: "Solidity",
  })) };
}

export async function tokens(chainId: number, page: { limit?: number; offset?: number } = {}) {
  const rows = await q(
    `SELECT t.*, (SELECT COUNT(*) FROM transfers x WHERE x.chain_id=t.chain_id AND x.token=t.address) AS transfer_count
     FROM tokens t WHERE t.chain_id=$1 ORDER BY transfer_count DESC LIMIT $2 OFFSET $3`, [chainId, lim(page.limit, 50), off(page.offset)]);
  if (!rows || !rows.length) return null;
  return { source: "indexer" as const, tokens: rows.map((t: any) => ({
    address: t.address, name: t.name || "Token", symbol: t.symbol || "—", decimals: Number(t.decimals) || 18,
    kind: t.kind === "erc721" ? "ERC-721" : t.kind === "erc1155" ? "ERC-1155" : "ERC-20",
    holders: 0, transfers: Number(t.transfer_count) || 0, supply: "—", verified: false,
  })) };
}

/** One contract's verification metadata (source/abi/compiler) — null when not verified/not indexed. */
export async function contract(chainId: number, a: string) {
  const rows = await q("SELECT * FROM contracts WHERE chain_id=$1 AND address=$2", [chainId, a.toLowerCase()]);
  if (!rows || !rows.length) return null;
  const c: any = rows[0];
  return {
    source: "indexer" as const, address: c.address, name: c.name || "Contract", vm: "evm",
    verified: !!c.verified_at, compiler: c.compiler || null, language: "Solidity",
    optimization: c.optimization == null ? null : !!c.optimization, runs: c.runs == null ? null : Number(c.runs),
    evmVersion: c.evm_version || null, verifiedAt: c.verified_at == null ? null : Number(c.verified_at),
    sourceCode: c.source || null, abi: c.abi || null,
  };
}

/** One token's registry row + recent transfers — null when the token isn't indexed. */
export async function token(chainId: number, a: string) {
  const lc = a.toLowerCase();
  const rows = await q(
    `SELECT t.*, (SELECT COUNT(*) FROM transfers x WHERE x.chain_id=t.chain_id AND x.token=t.address) AS transfer_count
     FROM tokens t WHERE t.chain_id=$1 AND t.address=$2`, [chainId, lc]);
  if (!rows || !rows.length) return null;
  const t: any = rows[0];
  const xfers = (await q("SELECT * FROM transfers WHERE chain_id=$1 AND token=$2 ORDER BY block_number DESC, log_index DESC LIMIT 25", [chainId, lc])) || [];
  return {
    source: "indexer" as const, address: t.address, name: t.name || "Token", symbol: t.symbol || "—",
    decimals: Number(t.decimals) || 18, kind: t.kind === "erc721" ? "ERC-721" : t.kind === "erc1155" ? "ERC-1155" : "ERC-20",
    holders: 0, transfers: Number(t.transfer_count) || 0, supply: "—", verified: false,
    transfersList: xfers.map((x: any) => ({ txHash: x.tx_hash, from: x.from_addr, to: x.to_addr, amount: PYRX(x.amount), block: Number(x.block_number), timestamp: Number(x.block_time) || 0 })),
  };
}
