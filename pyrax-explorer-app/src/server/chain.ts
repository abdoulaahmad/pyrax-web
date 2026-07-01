// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Network selection + the live-or-sample data provider. SSR pages read the selected chain from the
// pyrax_net cookie, query that network's RPC (eth_* + pyrax_*), and fall back to clearly-labeled
// sample data when the node is unreachable — so the explorer always renders.
import { NETWORKS, networkByChain, DEFAULT_CHAIN, type ExplorerNetwork } from "../lib/networks";
import { rpc, rpcAll, hexToNum, deriveSeal } from "./rpc";
import * as idx from "./indexer";
import { sampleOverview, sampleBlocks, sampleBlockDetail, sampleTxs, sampleTxDetail, sampleAddress, sampleShielded, sampleDag, sampleNetwork, sampleGas, sampleValidators, sampleContracts, sampleTokens, sampleLogs, sampleContractDetail, sampleTokenDetail } from "./sample";

export function selectedChainId(cookieHeader: string | null): number {
  return cookieChainId(cookieHeader) ?? DEFAULT_CHAIN;
}
/** The chain explicitly chosen in the pyrax_net cookie, or null when unset/invalid (the caller then
 *  applies the team-managed cross-site default). */
export function cookieChainId(cookieHeader: string | null): number | null {
  const m = (cookieHeader || "").match(/(?:^|;\s*)pyrax_net=(\d+)/);
  const id = m ? Number(m[1]) : NaN;
  return networkByChain(id) ? id : null;
}
export function netFor(chainId: number): ExplorerNetwork { return networkByChain(chainId) || NETWORKS[0]; }

/** A 0x-prefixed 20-byte hex address, lower-cased — or null. Used to gate detail getters so a
 *  non-address path param (junk, oversized, SQLi probe) never reaches the indexer SQL or the node RPC;
 *  callers fall straight through to clearly-labeled sample data instead. */
const asAddress = (a: unknown): string | null => (typeof a === "string" && /^0x[0-9a-fA-F]{40}$/.test(a) ? a.toLowerCase() : null);

export async function liveStatus(net: ExplorerNetwork): Promise<{ online: boolean; height?: number }> {
  if (!net.rpc) return { online: false };
  try { const n = hexToNum(await rpc(net.rpc, "eth_blockNumber", [], 3500)); if (Number.isFinite(n)) return { online: true, height: n }; } catch {}
  try { const n = Number(await rpc(net.rpc, "pyrax_blockNumber", [], 3500)); if (Number.isFinite(n)) return { online: true, height: n }; } catch {}
  return { online: false };
}

/** Fetch the real per-block stream from pyrax_dagRecent → a {blueScore → "A"|"B"|"C"} lookup. */
async function dagStreamMap(net: ExplorerNetwork): Promise<Map<number, string>> {
  const m = new Map<number, string>();
  if (!net.rpc) return m;
  try {
    const recent = await rpc(net.rpc, "pyrax_dagRecent", [64], 4000);
    if (Array.isArray(recent)) for (const d of recent) {
      const bs = Number(d.blueScore);
      if (Number.isFinite(bs) && (d.stream === "A" || d.stream === "B" || d.stream === "C") && !m.has(bs)) m.set(bs, d.stream);
    }
  } catch {}
  return m;
}

const ethBlock = (b: any, streams?: Map<number, string>) => {
  const blueScore = hexToNum(b.blueScore ?? b.number);
  const stream = b.stream || streams?.get(blueScore) || "A";
  // `seal_algo` is NOT surfaced by eth_getBlockBy* or pyrax_dagRecent; when absent we reconstruct the
  // lane from the (real) stream and flag it `sealDerived` so the UI never presents the guess as fact.
  const realSeal = typeof b.sealAlgo === "string" && b.sealAlgo;
  const sealAlgo = realSeal || deriveSeal(stream, blueScore);
  return {
    number: hexToNum(b.number), blueScore, hash: b.hash,
    parents: b.parents || (b.parentHash ? [b.parentHash] : []), stream, sealAlgo, sealDerived: !realSeal,
    miner: b.miner || b.coinbase || "0x", timestamp: hexToNum(b.timestamp), txCount: Array.isArray(b.transactions) ? b.transactions.length : hexToNum(b.txCount),
    gasUsed: hexToNum(b.gasUsed), gasLimit: hexToNum(b.gasLimit), baseFee: b.baseFeePerGas ? (Number(hexToNum(b.baseFeePerGas)) / 1e9).toFixed(2) : "0", size: hexToNum(b.size),
  };
};

/** Overview dashboard: assembled live from the node when reachable, else PYRAX-native sample. */
export async function getOverview(net: ExplorerNetwork) {
  if (!net.rpc) return sampleOverview();
  try {
    const [bn, gp, consensus, note, sync] = await rpcAll(net.rpc, [["eth_blockNumber"], ["eth_gasPrice"], ["pyrax_consensusInfo"], ["pyrax_noteState"], ["pyrax_syncStatus"]], 5000);
    const height = hexToNum(bn);
    if (!Number.isFinite(height)) throw new Error("offline");
    const nums = Array.from({ length: 8 }, (_, i) => height - i).filter((n) => n >= 0);
    const [raw, streams] = await Promise.all([
      Promise.all(nums.map((n) => rpc(net.rpc, "eth_getBlockByNumber", ["0x" + n.toString(16), true], 5000).catch(() => null))),
      dagStreamMap(net),
    ]);
    const blocks = raw.filter(Boolean).map((b) => ethBlock(b, streams));
    const txs = blocks.flatMap((b: any, bi: number) => (raw[bi]?.transactions || []).slice(0, 3).map((t: any) => ({ hash: t.hash, type: "ethereum", block: b.number, timestamp: b.timestamp, status: 1, from: t.from, to: t.to ?? null, value: (Number(hexToNum(t.value)) / 1e18).toFixed(4), valueBalance: null }))).slice(0, 8);
    const streamCounts: Record<string, number> = { A: 0, B: 0, C: 0 };
    for (const b of blocks) streamCounts[b.stream] = (streamCounts[b.stream] || 0) + 1;
    return {
      source: "live" as const, height, blueScore: hexToNum((blocks[0] as any)?.blueScore) || height, finalizedHeight: hexToNum(sync?.finalizedBlueScore) || height,
      streamMode: consensus?.mode || "tri-stream", activeStreams: consensus?.active_streams || ["A", "B", "C"], streamCounts,
      gasPrice: gp ? (Number(hexToNum(gp)) / 1e9).toFixed(2) : "—", baseFee: blocks[0]?.baseFee || "—", peers: 0, tps: "—",
      supplyCirculating: "—", supplyCap: "50,000,000,000",
      shielded: note ? { anchor: note.anchor, noteCount: Number(note.note_count) || 0, nullifierCount: Number(note.nullifier_count) || 0, shieldedTxShare: "—" } : { anchor: "—", noteCount: 0, nullifierCount: 0, shieldedTxShare: "—" },
      blocks, txs,
    };
  } catch { return sampleOverview(); }
}

// ---- list + detail getters (live attempt → PYRAX-native sample fallback) ----
export async function getBlocks(net: ExplorerNetwork, beforeNum?: number) {
  // Indexer first: it can paginate full history; the live RPC can only walk back from the tip.
  const ix = await idx.blocks(net.chainId, beforeNum); if (ix) return ix;
  if (net.rpc) try {
    const head = beforeNum ?? hexToNum(await rpc(net.rpc, "eth_blockNumber", [], 4000));
    if (Number.isFinite(head)) {
      const nums = Array.from({ length: 25 }, (_, i) => head - i).filter((n) => n >= 0);
      const [raw, streams] = await Promise.all([
        Promise.all(nums.map((n) => rpc(net.rpc, "eth_getBlockByNumber", ["0x" + n.toString(16), false], 5000).catch(() => null))),
        dagStreamMap(net),
      ]);
      const blocks = raw.filter(Boolean).map((b) => ethBlock(b, streams));
      if (blocks.length) return { source: "live" as const, head, blocks };
    }
  } catch {}
  return { source: "sample" as const, head: beforeNum ?? undefined, blocks: sampleBlocks(25, beforeNum) };
}
export async function getBlock(net: ExplorerNetwork, idOrHash: string) {
  if (net.rpc) try {
    const isHash = /^0x[0-9a-fA-F]{64}$/.test(idOrHash);
    const [b, streams] = await Promise.all([
      rpc(net.rpc, isHash ? "eth_getBlockByHash" : "eth_getBlockByNumber", [isHash ? idOrHash : "0x" + Number(idOrHash).toString(16), true], 6000),
      dagStreamMap(net),
    ]);
    if (b) { const base = ethBlock(b, streams); return { source: "live" as const, ...base, txs: (b.transactions || []).map((t: any) => ({ hash: t.hash, type: "ethereum", block: base.number, timestamp: base.timestamp, status: 1, from: t.from, to: t.to ?? null, value: (Number(hexToNum(t.value)) / 1e18).toFixed(4), valueBalance: null })), stateRoot: b.stateRoot, transactionsRoot: b.transactionsRoot, receiptsRoot: b.receiptsRoot, blueWork: b.blueWork, daaScore: hexToNum(b.daaScore), difficulty: String(hexToNum(b.difficulty)), finalized: false }; }
  } catch {}
  // Indexer fallback for blocks the live node has pruned / for off-tip history.
  const ix = await idx.block(net.chainId, idOrHash); if (ix) return ix;
  return sampleBlockDetail(/^0x/.test(idOrHash) ? 4_812_800 : Number(idOrHash) || 4_812_800);
}
export async function getTxs(net: ExplorerNetwork, page: { limit?: number; offset?: number } = {}) {
  // A live tx FEED needs the indexer (the RPC can't list txs); when it's wired we serve real history.
  const ix = await idx.txs(net.chainId, page); if (ix) return ix;
  return { source: "sample" as const, txs: sampleTxs(page.limit ?? 25) };
}
export async function getTx(net: ExplorerNetwork, hash: string) {
  if (net.rpc) try {
    const [t, r] = await Promise.all([rpc(net.rpc, "eth_getTransactionByHash", [hash], 5000).catch(() => null), rpc(net.rpc, "eth_getTransactionReceipt", [hash], 5000).catch(() => null)]);
    if (t) return { source: "live" as const, hash, type: "ethereum", block: hexToNum(t.blockNumber), blockHash: t.blockHash, txIndex: hexToNum(t.transactionIndex), timestamp: 0, status: r ? hexToNum(r.status) : 1, from: t.from, to: t.to ?? null, value: (Number(hexToNum(t.value)) / 1e18).toFixed(4), valueBalance: null, nonce: hexToNum(t.nonce), gasLimit: hexToNum(t.gas), gasUsed: r ? hexToNum(r.gasUsed) : 0, gasPrice: (Number(hexToNum(t.gasPrice)) / 1e9).toFixed(2), fee: "0", input: t.input || "0x", contractCreated: r?.contractAddress ?? null, nullifiers: [], commitments: [], anchor: null, logs: (r?.logs || []).map((l: any) => ({ address: l.address, topics: l.topics, data: l.data })) };
  } catch {}
  // Indexer fallback: a shielded/native tx returns null from eth_getTransactionByHash, but the
  // indexer may still have its envelope; and it serves history the node has pruned.
  const ix = await idx.tx(net.chainId, hash); if (ix) return ix;
  return sampleTxDetail(hash);
}
export async function getAddress(net: ExplorerNetwork, a: string) {
  // Reject a non-address path param up front so junk/oversized/SQLi-probe input never reaches the
  // indexer SQL or the node RPC — fall straight through to (clearly-labeled) sample data.
  const addr = asAddress(a);
  if (!addr) return sampleAddress(a);
  // Indexed history (real tx list + count + contract flag) and live state (balance/nonce/code) are
  // complementary — the RPC has no tx history, the indexer has no balance. Fetch both and merge.
  const [ix, live] = await Promise.all([
    idx.address(net.chainId, addr),
    (async () => {
      if (!net.rpc) return null;
      try {
        const [bal, nonce, code] = await Promise.all([rpc(net.rpc, "eth_getBalance", [addr, "latest"], 4000).catch(() => null), rpc(net.rpc, "eth_getTransactionCount", [addr, "latest"], 4000).catch(() => null), rpc(net.rpc, "eth_getCode", [addr, "latest"], 4000).catch(() => null)]);
        if (bal === null) return null;
        return { balance: (Number(hexToNum(bal)) / 1e18).toFixed(4), nonce: hexToNum(nonce), isContract: !!code && code !== "0x" };
      } catch { return null; }
    })(),
  ]);
  if (ix || live) {
    const isContract = ix?.isContract || live?.isContract || false;
    return {
      source: (ix ? "indexer" : "live") as const, address: addr, isContract, vm: isContract ? "evm" : null,
      balance: live?.balance ?? "—", nonce: live?.nonce ?? 0, txCount: ix?.txCount ?? live?.nonce ?? 0,
      verified: false, txs: ix?.txs ?? [], tokens: [],
    };
  }
  return sampleAddress(addr);
}
export async function getShielded(net: ExplorerNetwork) {
  if (net.rpc) try { const n = await rpc(net.rpc, "pyrax_noteState", [], 5000); if (n) return { source: "live" as const, anchor: n.anchor, noteCount: Number(n.note_count) || 0, nullifierCount: Number(n.nullifier_count) || 0, shieldedTxShare: "—", treeDepth: 32, capacity: 2 ** 32, recent: [] }; } catch {}
  return sampleShielded();
}

/** DAG & Streams: live pyrax_dagRecent (parents/blueScore/stream) → derived seal lane, else sample. */
export async function getDag(net: ExplorerNetwork) {
  if (net.rpc) try {
    const recent = await rpc(net.rpc, "pyrax_dagRecent", [48], 5000);
    if (Array.isArray(recent) && recent.length) {
      // Map native pyr-hashes to compact indices so the view can draw parent edges.
      const idx = new Map<string, number>();
      recent.forEach((d: any, i: number) => idx.set(String(d.hash), i));
      const nodes = recent.map((d: any) => {
        const blueScore = Number(d.blueScore);
        const stream = d.stream === "A" || d.stream === "B" || d.stream === "C" ? d.stream : "A";
        // pyrax_dagRecent doesn't carry seal_algo → the lane is reconstructed from the stream (derived).
        const realSeal = typeof d.sealAlgo === "string" && d.sealAlgo;
        return { hash: d.hash, blueScore, stream, sealAlgo: realSeal || deriveSeal(stream, blueScore), sealDerived: !realSeal, timestamp: Number(d.timestamp), parents: (d.parents || []).map((p: string) => idx.get(p)).filter((n: number | undefined) => n !== undefined) as number[] };
      });
      const streamCounts: Record<string, number> = { A: 0, B: 0, C: 0 };
      for (const n of nodes) streamCounts[n.stream]++;
      return { source: "live" as const, sealDerived: nodes.some((n: any) => n.sealDerived), nodes, streamCounts, tips: [nodes[0]?.hash].filter(Boolean), head: nodes[0]?.blueScore || 0 };
    }
  } catch {}
  return sampleDag();
}

/** Network health: consensus mode, sync/finality, peers, node identity — live or sample. */
export async function getNetwork(net: ExplorerNetwork) {
  if (net.rpc) try {
    const [consensus, sync, peerCount, nodeInfo, peers, gp, cid, dag] = await Promise.all([
      rpc(net.rpc, "pyrax_consensusInfo", [], 5000).catch(() => null),
      rpc(net.rpc, "pyrax_syncStatus", [], 5000).catch(() => null),
      rpc(net.rpc, "pyrax_peerCount", [], 4000).catch(() => null),
      rpc(net.rpc, "pyrax_nodeInfo", [], 4000).catch(() => null),
      rpc(net.rpc, "pyrax_peers", [], 4000).catch(() => null),
      rpc(net.rpc, "eth_gasPrice", [], 4000).catch(() => null),
      rpc(net.rpc, "eth_chainId", [], 4000).catch(() => null),
      dagStreamMap(net),
    ]);
    if (sync || consensus) {
      // Lanes are tallied from the stream via deriveSeal (RPC doesn't surface seal_algo) → derived.
      const sealLanes: Record<string, number> = { blake3: 0, sha256d: 0, kheavyhash: 0, argon2id: 0, pos: 0 };
      for (const [bs, st] of dag.entries()) sealLanes[deriveSeal(st, bs)]++;
      return {
        source: "live" as const, sealLanesDerived: true, mode: consensus?.mode || "—", modeNote: consensus?.single_stream_note || null,
        activeStreams: consensus?.active_streams || [], height: Number(sync?.height) || 0, target: Number(sync?.target) || 0,
        finalizedHeight: Number(sync?.finalizedBlueScore ?? sync?.height) || 0, syncing: !!sync?.syncing, targetKnown: !!sync?.targetKnown,
        peerCount: Number(peerCount) || (Array.isArray(peers) ? peers.length : 0), incompatiblePeers: Number(sync?.incompatiblePeers) || 0, updateRequired: !!sync?.updateRequired,
        nodeInfo: nodeInfo ? { peerId: nodeInfo.peerId, listenAddrs: nodeInfo.listenAddrs || [], p2pPort: nodeInfo.p2pPort } : null,
        chainId: cid ? hexToNum(cid) : net.chainId, clientVersion: "pyrax-node", gasPrice: gp ? (Number(hexToNum(gp)) / 1e9).toFixed(2) : "—", baseFee: "—", sealLanes,
        peers: (Array.isArray(peers) ? peers : []).map((p: any) => ({ id: p.peerId || p.id || "—", addr: p.addr || (p.listenAddrs && p.listenAddrs[0]) || "—", height: Number(p.height) || 0, latency: Number(p.latencyMs ?? p.latency) || 0, direction: p.direction || "—" })),
      };
    }
  } catch {}
  return sampleNetwork();
}

/** Gas tracker: EIP-1559 base-fee history + suggested tiers — live or sample. */
export async function getGas(net: ExplorerNetwork) {
  if (net.rpc) try {
    const [gp, fh] = await Promise.all([
      rpc(net.rpc, "eth_gasPrice", [], 4000).catch(() => null),
      rpc(net.rpc, "eth_feeHistory", ["0x18", "latest", [10, 50, 90]], 6000).catch(() => null),
    ]);
    if (fh && Array.isArray(fh.baseFeePerGas)) {
      const oldest = hexToNum(fh.oldestBlock);
      const history = fh.baseFeePerGas.slice(0, -1).map((b: string, i: number) => ({ block: oldest + i, baseFee: Number((Number(hexToNum(b)) / 1e9).toFixed(3)), gasUsedRatio: Number(fh.gasUsedRatio?.[i]) || 0 }));
      const cur = Number(hexToNum(fh.baseFeePerGas[fh.baseFeePerGas.length - 1])) / 1e9;
      // Priority-tip tiers from the requested reward percentiles [10,50,90] = Low/Avg/High, averaged
      // across the window (gwei). Falls back to a fraction of eth_gasPrice when no reward data exists.
      const rewards: string[][] = Array.isArray(fh.reward) ? fh.reward : [];
      const tipPctl = (col: number): number | null => {
        const vals = rewards.map((r) => (Array.isArray(r) ? Number(hexToNum(r[col])) / 1e9 : NaN)).filter((v) => Number.isFinite(v));
        return vals.length ? vals.reduce((a, v) => a + v, 0) / vals.length : null;
      };
      const gpTip = gp ? Number(hexToNum(gp)) / 1e9 : 0.1;
      const lowTip = tipPctl(0) ?? gpTip * 0.5;
      const avgTip = tipPctl(1) ?? gpTip;
      const highTip = tipPctl(2) ?? gpTip * 2;
      return { source: "live" as const, baseFee: cur.toFixed(2), tiers: { low: (cur + lowTip).toFixed(2), avg: (cur + avgTip).toFixed(2), high: (cur + highTip).toFixed(2) }, history, avgUtil: history.length ? (history.reduce((a: number, h: any) => a + h.gasUsedRatio, 0) / history.length * 100).toFixed(0) : "0" };
    }
  } catch {}
  return sampleGas();
}

/** Validators (Stream C PoS). No RPC surface yet — sample with a clear note until staking RPC lands. */
export async function getValidators(_net: ExplorerNetwork) {
  return sampleValidators();
}

/** Contracts registry. Enumerated by the indexer from verifications/deployments — sample until wired. */
export async function getContracts(net: ExplorerNetwork, page: { limit?: number; offset?: number } = {}) {
  const ix = await idx.contracts(net.chainId, page); if (ix) return ix;
  return { source: "sample" as const, contracts: sampleContracts() };
}

/** Token registry. Discovered from Transfer events by the indexer — sample until it's wired. */
export async function getTokens(net: ExplorerNetwork, page: { limit?: number; offset?: number } = {}) {
  const ix = await idx.tokens(net.chainId, page); if (ix) return ix;
  return { source: "sample" as const, tokens: sampleTokens() };
}

/** A single deployed contract: indexer verification metadata + live eth_getCode → sample fallback. */
export async function getContract(net: ExplorerNetwork, a: string) {
  const addr = asAddress(a);
  if (!addr) return sampleContractDetail(a);
  const [ix, live] = await Promise.all([
    idx.contract(net.chainId, addr),
    (async () => {
      if (!net.rpc) return null;
      try {
        const [code, bal] = await Promise.all([
          rpc(net.rpc, "eth_getCode", [addr, "latest"], 4000).catch(() => null),
          rpc(net.rpc, "eth_getBalance", [addr, "latest"], 4000).catch(() => null),
        ]);
        if (code === null) return null;
        const isContract = !!code && code !== "0x";
        return { isContract, codeSize: isContract ? (code.length - 2) / 2 : 0, balance: bal !== null ? (Number(hexToNum(bal)) / 1e18).toFixed(4) : "—" };
      } catch { return null; }
    })(),
  ]);
  if (ix || live) {
    const isContract = live ? live.isContract : true;
    return {
      source: (ix ? "indexer" : "live") as const, address: addr, isContract,
      name: ix?.name || (isContract ? "Contract" : "Address"), vm: "evm",
      verified: !!ix?.verified, compiler: ix?.compiler || null, language: ix?.language || "Solidity",
      optimization: ix?.optimization ?? null, runs: ix?.runs ?? null, evmVersion: ix?.evmVersion || null,
      verifiedAt: ix?.verifiedAt || null, sourceCode: ix?.sourceCode || null, abi: ix?.abi || null,
      codeSize: live?.codeSize ?? 0, balance: live?.balance ?? "—",
    };
  }
  return sampleContractDetail(a);
}

/** A single token: indexer registry row + live eth_call (name/symbol/decimals) → sample fallback. */
export async function getToken(net: ExplorerNetwork, a: string) {
  const addr = asAddress(a);
  if (!addr) return sampleTokenDetail(a);
  const ix = await idx.token(net.chainId, addr);
  const live = await (async () => {
    if (!net.rpc) return null;
    try {
      // ERC-20 metadata via eth_call: name() 0x06fdde03, symbol() 0x95d89b41, decimals() 0x313ce567.
      const [nameHex, symHex, decHex] = await Promise.all([
        rpc(net.rpc, "eth_call", [{ to: addr, data: "0x06fdde03" }, "latest"], 4000).catch(() => null),
        rpc(net.rpc, "eth_call", [{ to: addr, data: "0x95d89b41" }, "latest"], 4000).catch(() => null),
        rpc(net.rpc, "eth_call", [{ to: addr, data: "0x313ce567" }, "latest"], 4000).catch(() => null),
      ]);
      const name = decodeAbiString(nameHex), symbol = decodeAbiString(symHex);
      const decimals = decHex && decHex !== "0x" ? hexToNum(decHex) : null;
      if (!name && !symbol && decimals === null) return null;
      return { name, symbol, decimals };
    } catch { return null; }
  })();
  if (ix || live) {
    return {
      source: (ix ? "indexer" : "live") as const, address: addr,
      name: live?.name || ix?.name || "Token", symbol: live?.symbol || ix?.symbol || "—",
      decimals: (live?.decimals ?? ix?.decimals ?? 18) as number, kind: ix?.kind || "ERC-20",
      holders: ix?.holders ?? 0, transfers: ix?.transfers ?? 0, supply: ix?.supply ?? "—", verified: !!ix?.verified,
      transfersList: ix?.transfersList ?? [],
    };
  }
  return sampleTokenDetail(a);
}

/** Decode an ABI-encoded `string` return (offset + length + UTF-8 bytes). Returns "" on failure. */
function decodeAbiString(hex: unknown): string {
  if (typeof hex !== "string" || !hex.startsWith("0x") || hex.length < 130) return "";
  try {
    const body = hex.slice(2);
    const len = parseInt(body.slice(64, 128), 16);
    if (!Number.isFinite(len) || len <= 0 || len > 256) return "";
    const bytes = body.slice(128, 128 + len * 2);
    let s = "";
    for (let i = 0; i < bytes.length; i += 2) { const c = parseInt(bytes.slice(i, i + 2), 16); if (c >= 32 && c < 127) s += String.fromCharCode(c); }
    return s.trim();
  } catch { return ""; }
}

export interface LogFilter { address?: string; topic0?: string; fromBlock?: number; toBlock?: number; limit?: number; offset?: number }

/** Event logs: indexer (deep history + filters) → live eth_getLogs over a recent window → sample. */
export async function getLogs(net: ExplorerNetwork, filter: LogFilter = {}) {
  const address = /^0x[0-9a-fA-F]{40}$/.test(filter.address || "") ? filter.address!.toLowerCase() : undefined;
  const topic0 = /^0x[0-9a-fA-F]{64}$/.test(filter.topic0 || "") ? filter.topic0!.toLowerCase() : undefined;
  const ix = await idx.logs(net.chainId, { address, topic0, fromBlock: filter.fromBlock, toBlock: filter.toBlock, limit: filter.limit, offset: filter.offset }); if (ix) return ix;
  if (net.rpc) try {
    const head = hexToNum(await rpc(net.rpc, "eth_blockNumber", [], 4000));
    if (Number.isFinite(head)) {
      // Cap the live window so a wide explicit range can't ask the node for an unbounded scan.
      const MAX_WINDOW = 5000;
      let to = Number.isFinite(filter.toBlock!) ? Math.min(filter.toBlock!, head) : head;
      let from = Number.isFinite(filter.fromBlock!) ? Math.max(0, filter.fromBlock!) : Math.max(0, to - 50);
      if (to - from > MAX_WINDOW) from = to - MAX_WINDOW;
      const f: Record<string, unknown> = { fromBlock: "0x" + from.toString(16), toBlock: "0x" + to.toString(16) };
      if (address) f.address = address;
      if (topic0) f.topics = [topic0];
      const raw = await rpc(net.rpc, "eth_getLogs", [f], 8000);
      if (Array.isArray(raw)) return {
        source: "live" as const, logs: raw.slice(-(filter.limit ?? 40)).reverse().map((l: any) => ({
          address: l.address, event: null, topic0: (l.topics || [])[0] || "0x", topics: l.topics || [], data: l.data || "0x",
          block: hexToNum(l.blockNumber), txHash: l.transactionHash, logIndex: hexToNum(l.logIndex), timestamp: 0,
        })),
      };
    }
  } catch {}
  return { source: "sample" as const, logs: sampleLogs() };
}
