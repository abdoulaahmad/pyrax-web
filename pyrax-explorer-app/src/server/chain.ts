// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Network selection + the live-or-sample data provider. SSR pages read the selected chain from the
// pyrax_net cookie, query that network's RPC (eth_* + pyrax_*), and fall back to clearly-labeled
// sample data when the node is unreachable — so the explorer always renders.
import { NETWORKS, networkByChain, DEFAULT_CHAIN, type ExplorerNetwork } from "../lib/networks";
import { rpc, rpcAll, hexToNum } from "./rpc";
import { sampleOverview, sampleBlocks, sampleBlockDetail, sampleTxs, sampleTxDetail, sampleAddress, sampleShielded } from "./sample";

export function selectedChainId(cookieHeader: string | null): number {
  const m = (cookieHeader || "").match(/(?:^|;\s*)pyrax_net=(\d+)/);
  const id = m ? Number(m[1]) : NaN;
  return networkByChain(id) ? id : DEFAULT_CHAIN;
}
export function netFor(chainId: number): ExplorerNetwork { return networkByChain(chainId) || NETWORKS[0]; }

export async function liveStatus(net: ExplorerNetwork): Promise<{ online: boolean; height?: number }> {
  if (!net.rpc) return { online: false };
  try { const n = hexToNum(await rpc(net.rpc, "eth_blockNumber", [], 3500)); if (Number.isFinite(n)) return { online: true, height: n }; } catch {}
  try { const n = Number(await rpc(net.rpc, "pyrax_blockNumber", [], 3500)); if (Number.isFinite(n)) return { online: true, height: n }; } catch {}
  return { online: false };
}

const ethBlock = (b: any) => ({
  number: hexToNum(b.number), blueScore: hexToNum(b.blueScore ?? b.number), hash: b.hash,
  parents: b.parents || (b.parentHash ? [b.parentHash] : []), stream: b.stream || "A", sealAlgo: b.sealAlgo || "blake3",
  miner: b.miner || b.coinbase || "0x", timestamp: hexToNum(b.timestamp), txCount: Array.isArray(b.transactions) ? b.transactions.length : hexToNum(b.txCount),
  gasUsed: hexToNum(b.gasUsed), gasLimit: hexToNum(b.gasLimit), baseFee: b.baseFeePerGas ? (Number(hexToNum(b.baseFeePerGas)) / 1e9).toFixed(2) : "0", size: hexToNum(b.size),
});

/** Overview dashboard: assembled live from the node when reachable, else PYRAX-native sample. */
export async function getOverview(net: ExplorerNetwork) {
  if (!net.rpc) return sampleOverview();
  try {
    const [bn, gp, consensus, note, sync] = await rpcAll(net.rpc, [["eth_blockNumber"], ["eth_gasPrice"], ["pyrax_consensusInfo"], ["pyrax_noteState"], ["pyrax_syncStatus"]], 5000);
    const height = hexToNum(bn);
    if (!Number.isFinite(height)) throw new Error("offline");
    const nums = Array.from({ length: 8 }, (_, i) => height - i).filter((n) => n >= 0);
    const raw = await Promise.all(nums.map((n) => rpc(net.rpc, "eth_getBlockByNumber", ["0x" + n.toString(16), true], 5000).catch(() => null)));
    const blocks = raw.filter(Boolean).map(ethBlock);
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
  if (net.rpc) try {
    const head = beforeNum ?? hexToNum(await rpc(net.rpc, "eth_blockNumber", [], 4000));
    if (Number.isFinite(head)) {
      const nums = Array.from({ length: 25 }, (_, i) => head - i).filter((n) => n >= 0);
      const raw = await Promise.all(nums.map((n) => rpc(net.rpc, "eth_getBlockByNumber", ["0x" + n.toString(16), false], 5000).catch(() => null)));
      const blocks = raw.filter(Boolean).map(ethBlock);
      if (blocks.length) return { source: "live" as const, head, blocks };
    }
  } catch {}
  return { source: "sample" as const, head: beforeNum ?? undefined, blocks: sampleBlocks(25, beforeNum) };
}
export async function getBlock(net: ExplorerNetwork, idOrHash: string) {
  if (net.rpc) try {
    const isHash = /^0x[0-9a-fA-F]{64}$/.test(idOrHash);
    const b = await rpc(net.rpc, isHash ? "eth_getBlockByHash" : "eth_getBlockByNumber", [isHash ? idOrHash : "0x" + Number(idOrHash).toString(16), true], 6000);
    if (b) { const base = ethBlock(b); return { source: "live" as const, ...base, txs: (b.transactions || []).map((t: any) => ({ hash: t.hash, type: "ethereum", block: base.number, timestamp: base.timestamp, status: 1, from: t.from, to: t.to ?? null, value: (Number(hexToNum(t.value)) / 1e18).toFixed(4), valueBalance: null })), stateRoot: b.stateRoot, transactionsRoot: b.transactionsRoot, receiptsRoot: b.receiptsRoot, blueWork: b.blueWork, daaScore: hexToNum(b.daaScore), difficulty: String(hexToNum(b.difficulty)), finalized: false }; }
  } catch {}
  return sampleBlockDetail(/^0x/.test(idOrHash) ? 4_812_800 : Number(idOrHash) || 4_812_800);
}
export async function getTxs(net: ExplorerNetwork) {
  // A live tx feed needs the indexer; until it's wired, sample. (Detail pages read live per-hash.)
  return { source: "sample" as const, txs: sampleTxs(25) };
}
export async function getTx(net: ExplorerNetwork, hash: string) {
  if (net.rpc) try {
    const [t, r] = await Promise.all([rpc(net.rpc, "eth_getTransactionByHash", [hash], 5000).catch(() => null), rpc(net.rpc, "eth_getTransactionReceipt", [hash], 5000).catch(() => null)]);
    if (t) return { source: "live" as const, hash, type: "ethereum", block: hexToNum(t.blockNumber), blockHash: t.blockHash, txIndex: hexToNum(t.transactionIndex), timestamp: 0, status: r ? hexToNum(r.status) : 1, from: t.from, to: t.to ?? null, value: (Number(hexToNum(t.value)) / 1e18).toFixed(4), valueBalance: null, nonce: hexToNum(t.nonce), gasLimit: hexToNum(t.gas), gasUsed: r ? hexToNum(r.gasUsed) : 0, gasPrice: (Number(hexToNum(t.gasPrice)) / 1e9).toFixed(2), fee: "0", input: t.input || "0x", contractCreated: r?.contractAddress ?? null, nullifiers: [], commitments: [], anchor: null, logs: (r?.logs || []).map((l: any) => ({ address: l.address, topics: l.topics, data: l.data })) };
  } catch {}
  return sampleTxDetail(hash);
}
export async function getAddress(net: ExplorerNetwork, a: string) {
  if (net.rpc) try {
    const [bal, nonce, code] = await Promise.all([rpc(net.rpc, "eth_getBalance", [a, "latest"], 4000).catch(() => null), rpc(net.rpc, "eth_getTransactionCount", [a, "latest"], 4000).catch(() => null), rpc(net.rpc, "eth_getCode", [a, "latest"], 4000).catch(() => null)]);
    if (bal !== null) { const isContract = !!code && code !== "0x"; return { source: "live" as const, address: a, isContract, vm: isContract ? "evm" : null, balance: (Number(hexToNum(bal)) / 1e18).toFixed(4), nonce: hexToNum(nonce), txCount: hexToNum(nonce), verified: false, txs: [], tokens: [] }; }
  } catch {}
  return sampleAddress(a);
}
export async function getShielded(net: ExplorerNetwork) {
  if (net.rpc) try { const n = await rpc(net.rpc, "pyrax_noteState", [], 5000); if (n) return { source: "live" as const, anchor: n.anchor, noteCount: Number(n.note_count) || 0, nullifierCount: Number(n.nullifier_count) || 0, shieldedTxShare: "—", treeDepth: 32, capacity: 2 ** 32, recent: [] }; } catch {}
  return sampleShielded();
}
