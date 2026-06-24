// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// PostgreSQL store for the explorer indexer (DigitalOcean Managed PostgreSQL, `pg`).
// Multi-network — every row carries chain_id. Async; `init()` creates the schema and
// MUST be awaited before the ingest worker / read API runs.

import pg from "pg";
import { DATABASE_URL, DATABASE_SSL, DATABASE_CA } from "./config.js";

// int8 (BIGINT) -> JS number. Everything we store as an integer (block numbers, gas,
// unix-second timestamps, counts) fits comfortably under 2^53, so this is safe and
// keeps the ingest + read logic numeric (no bigint-as-string surprises).
pg.types.setTypeParser(20, (v) => (v === null ? null : Number(v)));

const pool = new pg.Pool({
  // Strip sslmode from the URL so node-postgres uses our explicit `ssl` below. Otherwise the
  // connection string's sslmode=require forces full chain verification, and DO's CA (not in
  // Node's trust store) fails as "self-signed certificate in certificate chain". On the private
  // VPC the connection is still encrypted; it's just not chain-verified unless DATABASE_CA is set.
  connectionString: DATABASE_URL.replace(/[?&]sslmode=[^&]*/gi, ""),
  ssl: DATABASE_SSL ? { rejectUnauthorized: !!DATABASE_CA, ca: DATABASE_CA || undefined } : false,
  max: Number(process.env.PG_POOL_MAX ?? 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});
pool.on("error", (e) => console.error("[explorer] pg pool error:", e?.message ?? e));

const q = (text, params) => pool.query(text, params);

export async function init() {
  await q(`
    CREATE TABLE IF NOT EXISTS sync_state (chain_id BIGINT PRIMARY KEY, last_block BIGINT NOT NULL);

    -- Per-chain metadata. genesis_hash pins the chain's identity: if a disposable
    -- network is wiped + re-genesised, its block 0 hash changes, and the indexer
    -- detects the mismatch and re-indexes from scratch so old + new data never mix.
    CREATE TABLE IF NOT EXISTS chain_meta (chain_id BIGINT PRIMARY KEY, genesis_hash TEXT);

    CREATE TABLE IF NOT EXISTS blocks (
      chain_id BIGINT NOT NULL, number BIGINT NOT NULL, hash TEXT NOT NULL, parent_hash TEXT,
      miner TEXT, timestamp BIGINT, gas_used BIGINT, gas_limit BIGINT, base_fee TEXT,
      tx_count BIGINT, size BIGINT,
      PRIMARY KEY (chain_id, number)
    );
    CREATE INDEX IF NOT EXISTS idx_blocks_hash ON blocks(chain_id, hash);

    CREATE TABLE IF NOT EXISTS txns (
      chain_id BIGINT NOT NULL, hash TEXT NOT NULL, block_number BIGINT, block_time BIGINT,
      tx_index BIGINT, from_addr TEXT, to_addr TEXT, value TEXT, gas BIGINT, gas_price TEXT,
      status BIGINT, nonce BIGINT, input_size BIGINT, method_id TEXT, contract_created TEXT,
      PRIMARY KEY (chain_id, hash)
    );
    CREATE INDEX IF NOT EXISTS idx_txns_block ON txns(chain_id, block_number DESC, tx_index DESC);
    CREATE INDEX IF NOT EXISTS idx_txns_from ON txns(chain_id, from_addr, block_number DESC);
    CREATE INDEX IF NOT EXISTS idx_txns_to ON txns(chain_id, to_addr, block_number DESC);

    CREATE TABLE IF NOT EXISTS logs (
      chain_id BIGINT NOT NULL, tx_hash TEXT NOT NULL, log_index BIGINT NOT NULL,
      block_number BIGINT, address TEXT, topic0 TEXT, topic1 TEXT, topic2 TEXT, topic3 TEXT, data TEXT,
      PRIMARY KEY (chain_id, tx_hash, log_index)
    );
    CREATE INDEX IF NOT EXISTS idx_logs_addr ON logs(chain_id, address, block_number DESC);
    CREATE INDEX IF NOT EXISTS idx_logs_topic0 ON logs(chain_id, topic0, block_number DESC);

    CREATE TABLE IF NOT EXISTS transfers (
      chain_id BIGINT NOT NULL, tx_hash TEXT NOT NULL, log_index BIGINT NOT NULL,
      block_number BIGINT, block_time BIGINT, token TEXT, from_addr TEXT, to_addr TEXT,
      amount TEXT, kind TEXT,
      PRIMARY KEY (chain_id, tx_hash, log_index)
    );
    CREATE INDEX IF NOT EXISTS idx_xfer_token ON transfers(chain_id, token, block_number DESC);
    CREATE INDEX IF NOT EXISTS idx_xfer_from ON transfers(chain_id, from_addr, block_number DESC);
    CREATE INDEX IF NOT EXISTS idx_xfer_to ON transfers(chain_id, to_addr, block_number DESC);

    CREATE TABLE IF NOT EXISTS tokens (
      chain_id BIGINT NOT NULL, address TEXT NOT NULL, kind TEXT, name TEXT, symbol TEXT,
      decimals BIGINT, first_block BIGINT,
      PRIMARY KEY (chain_id, address)
    );

    CREATE TABLE IF NOT EXISTS contracts (
      chain_id BIGINT NOT NULL, address TEXT NOT NULL, name TEXT, compiler TEXT,
      optimization BIGINT, runs BIGINT, evm_version TEXT, source TEXT, abi TEXT,
      constructor_args TEXT, verified_at BIGINT,
      PRIMARY KEY (chain_id, address)
    );
  `);
}

// ---- upsert helpers --------------------------------------------------------
function upsertSQL(table, cols, conflict) {
  const ph = cols.map((_, i) => `$${i + 1}`).join(",");
  const upd = cols.filter((c) => !conflict.includes(c)).map((c) => `${c}=EXCLUDED.${c}`).join(", ");
  return `INSERT INTO ${table} (${cols.join(",")}) VALUES (${ph}) ON CONFLICT (${conflict.join(",")}) ${upd ? `DO UPDATE SET ${upd}` : "DO NOTHING"}`;
}
const vals = (cols, o) => cols.map((c) => o[c] ?? null);

const BLOCK_COLS = ["chain_id", "number", "hash", "parent_hash", "miner", "timestamp", "gas_used", "gas_limit", "base_fee", "tx_count", "size"];
const TX_COLS = ["chain_id", "hash", "block_number", "block_time", "tx_index", "from_addr", "to_addr", "value", "gas", "gas_price", "status", "nonce", "input_size", "method_id", "contract_created"];
const LOG_COLS = ["chain_id", "tx_hash", "log_index", "block_number", "address", "topic0", "topic1", "topic2", "topic3", "data"];
const XFER_COLS = ["chain_id", "tx_hash", "log_index", "block_number", "block_time", "token", "from_addr", "to_addr", "amount", "kind"];
const CONTRACT_COLS = ["chain_id", "address", "name", "compiler", "optimization", "runs", "evm_version", "source", "abi", "constructor_args", "verified_at"];
const TOKEN_COLS = ["chain_id", "address", "kind", "name", "symbol", "decimals", "first_block"];

const BLOCK_SQL = upsertSQL("blocks", BLOCK_COLS, ["chain_id", "number"]);
const TX_SQL = upsertSQL("txns", TX_COLS, ["chain_id", "hash"]);
const LOG_SQL = upsertSQL("logs", LOG_COLS, ["chain_id", "tx_hash", "log_index"]);
const XFER_SQL = upsertSQL("transfers", XFER_COLS, ["chain_id", "tx_hash", "log_index"]);
const CONTRACT_SQL = upsertSQL("contracts", CONTRACT_COLS, ["chain_id", "address"]);
// tokens preserves any previously-resolved name/symbol/decimals (COALESCE), so a later
// bare Transfer-derived row can't blank out richer metadata.
const TOKEN_SQL = `INSERT INTO tokens (chain_id,address,kind,name,symbol,decimals,first_block) VALUES ($1,$2,$3,$4,$5,$6,$7)
  ON CONFLICT (chain_id,address) DO UPDATE SET kind=EXCLUDED.kind,
    name=COALESCE(EXCLUDED.name, tokens.name), symbol=COALESCE(EXCLUDED.symbol, tokens.symbol),
    decimals=COALESCE(EXCLUDED.decimals, tokens.decimals)`;

// ---- sync state ------------------------------------------------------------
export const getSyncState = async (chainId) =>
  (await q("SELECT last_block FROM sync_state WHERE chain_id=$1", [chainId])).rows[0]?.last_block ?? -1;
export const setSyncState = (chainId, n) =>
  q("INSERT INTO sync_state(chain_id,last_block) VALUES ($1,$2) ON CONFLICT(chain_id) DO UPDATE SET last_block=EXCLUDED.last_block", [chainId, n]);

// ---- chain identity (genesis hash) -----------------------------------------
export const getGenesisHash = async (chainId) =>
  (await q("SELECT genesis_hash FROM chain_meta WHERE chain_id=$1", [chainId])).rows[0]?.genesis_hash ?? null;
export const setGenesisHash = (chainId, hash) =>
  q("INSERT INTO chain_meta(chain_id,genesis_hash) VALUES ($1,$2) ON CONFLICT(chain_id) DO UPDATE SET genesis_hash=EXCLUDED.genesis_hash", [chainId, hash]);

/** Wipe EVERY indexed row for a chain (used when a disposable network is reset /
 *  re-genesised), atomically: blocks, txns, logs, transfers, tokens, contracts,
 *  and the sync cursor — so re-indexing starts cleanly from block 0. */
export async function wipeChain(chainId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const t of ["blocks", "txns", "logs", "transfers", "tokens", "contracts"]) {
      await client.query(`DELETE FROM ${t} WHERE chain_id=$1`, [chainId]);
    }
    await client.query("DELETE FROM sync_state WHERE chain_id=$1", [chainId]);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

// ---- writes ----------------------------------------------------------------
export const upsertBlock = (b) => q(BLOCK_SQL, vals(BLOCK_COLS, b));
export const insertTx = (t) => q(TX_SQL, vals(TX_COLS, t));
export const insertLog = (l) => q(LOG_SQL, vals(LOG_COLS, l));
export const insertTransfer = (x) => q(XFER_SQL, vals(XFER_COLS, x));
export const upsertToken = (tk) => q(TOKEN_SQL, vals(TOKEN_COLS, tk));
export const contractPut = (c) => q(CONTRACT_SQL, vals(CONTRACT_COLS, c));

export const blockHashAt = async (chainId, number) =>
  (await q("SELECT hash FROM blocks WHERE chain_id=$1 AND number=$2", [chainId, number])).rows[0]?.hash ?? null;

/** Reorg rollback: delete everything at or above `number` for a chain, atomically. */
export async function rollbackFrom(chainId, number) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM blocks WHERE chain_id=$1 AND number>=$2", [chainId, number]);
    await client.query("DELETE FROM txns WHERE chain_id=$1 AND block_number>=$2", [chainId, number]);
    await client.query("DELETE FROM logs WHERE chain_id=$1 AND block_number>=$2", [chainId, number]);
    await client.query("DELETE FROM transfers WHERE chain_id=$1 AND block_number>=$2", [chainId, number]);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/** Atomically write one fully-decoded block + its txns/logs/transfers/tokens. */
export async function writeBlockBundle({ block, txns, logs, transfers, tokens }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(BLOCK_SQL, vals(BLOCK_COLS, block));
    for (const t of txns) await client.query(TX_SQL, vals(TX_COLS, t));
    for (const l of logs) await client.query(LOG_SQL, vals(LOG_COLS, l));
    for (const x of transfers) await client.query(XFER_SQL, vals(XFER_COLS, x));
    for (const tk of tokens) await client.query(TOKEN_SQL, vals(TOKEN_COLS, tk));
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

// ---- reads -----------------------------------------------------------------
export const stats = async (chainId) => {
  const count = async (sql) => (await q(sql, [chainId])).rows[0].c;
  return {
    chainId,
    lastBlock: await getSyncState(chainId),
    blocks: await count("SELECT COUNT(*) c FROM blocks WHERE chain_id=$1"),
    txns: await count("SELECT COUNT(*) c FROM txns WHERE chain_id=$1"),
    transfers: await count("SELECT COUNT(*) c FROM transfers WHERE chain_id=$1"),
    tokens: await count("SELECT COUNT(*) c FROM tokens WHERE chain_id=$1"),
    contracts: await count("SELECT COUNT(*) c FROM contracts WHERE chain_id=$1"),
  };
};

export const latestBlocks = async (chainId, limit = 25, offset = 0) =>
  (await q("SELECT * FROM blocks WHERE chain_id=$1 ORDER BY number DESC LIMIT $2 OFFSET $3", [chainId, limit, offset])).rows;
export const blockByNumber = async (chainId, n) =>
  (await q("SELECT * FROM blocks WHERE chain_id=$1 AND number=$2", [chainId, n])).rows[0] ?? null;
export const blockByHash = async (chainId, h) =>
  (await q("SELECT * FROM blocks WHERE chain_id=$1 AND hash=$2", [chainId, h.toLowerCase()])).rows[0] ?? null;
export const txsInBlock = async (chainId, n) =>
  (await q("SELECT * FROM txns WHERE chain_id=$1 AND block_number=$2 ORDER BY tx_index ASC", [chainId, n])).rows;

export const latestTxs = async (chainId, limit = 25, offset = 0) =>
  (await q("SELECT * FROM txns WHERE chain_id=$1 ORDER BY block_number DESC, tx_index DESC LIMIT $2 OFFSET $3", [chainId, limit, offset])).rows;
export const txByHash = async (chainId, h) =>
  (await q("SELECT * FROM txns WHERE chain_id=$1 AND hash=$2", [chainId, h.toLowerCase()])).rows[0] ?? null;
export const txsByAddress = async (chainId, addr, limit = 25, offset = 0) =>
  (await q("SELECT * FROM txns WHERE chain_id=$1 AND (from_addr=$2 OR to_addr=$2) ORDER BY block_number DESC, tx_index DESC LIMIT $3 OFFSET $4", [chainId, addr.toLowerCase(), limit, offset])).rows;
export const txCountByAddress = async (chainId, addr) =>
  (await q("SELECT COUNT(*) c FROM txns WHERE chain_id=$1 AND (from_addr=$2 OR to_addr=$2)", [chainId, addr.toLowerCase()])).rows[0].c;

export const transfersByAddress = async (chainId, addr, limit = 25, offset = 0) =>
  (await q("SELECT * FROM transfers WHERE chain_id=$1 AND (from_addr=$2 OR to_addr=$2) ORDER BY block_number DESC LIMIT $3 OFFSET $4", [chainId, addr.toLowerCase(), limit, offset])).rows;
export const transfersByToken = async (chainId, token, limit = 25, offset = 0) =>
  (await q("SELECT * FROM transfers WHERE chain_id=$1 AND token=$2 ORDER BY block_number DESC LIMIT $3 OFFSET $4", [chainId, token.toLowerCase(), limit, offset])).rows;

export const tokenInfo = async (chainId, addr) =>
  (await q("SELECT * FROM tokens WHERE chain_id=$1 AND address=$2", [chainId, addr.toLowerCase()])).rows[0] ?? null;
export const listTokens = async (chainId, limit = 50, offset = 0) =>
  (await q(
    `SELECT t.*, (SELECT COUNT(*) FROM transfers x WHERE x.chain_id=t.chain_id AND x.token=t.address) AS transfer_count
     FROM tokens t WHERE t.chain_id=$1 ORDER BY transfer_count DESC LIMIT $2 OFFSET $3`,
    [chainId, limit, offset],
  )).rows;

export const logsQuery = async (chainId, { address, topic0, fromBlock, toBlock, limit = 50, offset = 0 }) => {
  const where = ["chain_id=$1"];
  const args = [chainId];
  if (address) { args.push(address.toLowerCase()); where.push(`address=$${args.length}`); }
  if (topic0) { args.push(topic0.toLowerCase()); where.push(`topic0=$${args.length}`); }
  if (Number.isFinite(fromBlock)) { args.push(fromBlock); where.push(`block_number>=$${args.length}`); }
  if (Number.isFinite(toBlock)) { args.push(toBlock); where.push(`block_number<=$${args.length}`); }
  args.push(limit);
  const lp = args.length;
  args.push(offset);
  const op = args.length;
  return (await q(`SELECT * FROM logs WHERE ${where.join(" AND ")} ORDER BY block_number DESC, log_index DESC LIMIT $${lp} OFFSET $${op}`, args)).rows;
};

export const contractGet = async (chainId, addr) =>
  (await q("SELECT * FROM contracts WHERE chain_id=$1 AND address=$2", [chainId, addr.toLowerCase()])).rows[0] ?? null;
export const listContracts = async (chainId, limit = 50, offset = 0) =>
  (await q("SELECT chain_id,address,name,compiler,verified_at FROM contracts WHERE chain_id=$1 ORDER BY verified_at DESC LIMIT $2 OFFSET $3", [chainId, limit, offset])).rows;

export default pool;
