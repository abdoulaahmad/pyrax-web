// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Network selection + the live-or-sample data provider. SSR pages read the selected chain from the
// pyrax_net cookie, query that network's RPC (eth_* + pyrax_*), and fall back to clearly-labeled
// sample data when the node is unreachable — so the explorer always renders.
import { NETWORKS, networkByChain, DEFAULT_CHAIN, type ExplorerNetwork } from "../lib/networks";
import { rpc, rpcAll, hexToNum } from "./rpc";
import { sampleOverview, sampleBlocks, sampleBlockDetail, sampleTxs, sampleTxDetail, sampleAddress, sampleShielded, sampleDag, sampleNetwork, sampleGas, sampleValidators, sampleContracts, sampleTokens, sampleLogs } from "./sample";

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

// Seal lane reconstructed from the stream, per pyrax-consensus `lane_algo` (production `real_lanes`):
//   Stream A → BLAKE3 (even blue score) / SHA-256d (odd);  Stream B → kHeavyHash (GPU primary);
//   Stream C → PoS/BLS. The eth block JSON and pyrax_dagRecent don't carry header.seal_algo, so we
//   rebuild the lane from the authoritative per-stream rule rather than guessing across streams —
//   the displayed seal is therefore ALWAYS consistent with the block's stream.
function deriveSeal(stream: string, blueScore: number): string {
  if (stream === "C") return "pos";
  if (stream === "B") return "kheavyhash";
  return blueScore % 2 === 0 ? "blake3" : "sha256d";
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
  const sealAlgo = b.sealAlgo || deriveSeal(stream, blueScore);
  return {
    number: hexToNum(b.number), blueScore, hash: b.hash,
    parents: b.parents || (b.parentHash ? [b.parentHash] : []), stream, sealAlgo,
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
        return { hash: d.hash, blueScore, stream, sealAlgo: deriveSeal(stream, blueScore), timestamp: Number(d.timestamp), parents: (d.parents || []).map((p: string) => idx.get(p)).filter((n: number | undefined) => n !== undefined) as number[] };
      });
      const streamCounts: Record<string, number> = { A: 0, B: 0, C: 0 };
      for (const n of nodes) streamCounts[n.stream]++;
      return { source: "live" as const, nodes, streamCounts, tips: [nodes[0]?.hash].filter(Boolean), head: nodes[0]?.blueScore || 0 };
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
      const sealLanes: Record<string, number> = { blake3: 0, sha256d: 0, kheavyhash: 0, argon2id: 0, pos: 0 };
      for (const [bs, st] of dag.entries()) sealLanes[deriveSeal(st, bs)]++;
      return {
        source: "live" as const, mode: consensus?.mode || "—", modeNote: consensus?.single_stream_note || null,
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
      const tip = gp ? Number(hexToNum(gp)) / 1e9 : 0.1;
      return { source: "live" as const, baseFee: cur.toFixed(2), tiers: { low: (cur + tip * 0.5).toFixed(2), avg: (cur + tip).toFixed(2), high: (cur + tip * 2).toFixed(2) }, history, avgUtil: history.length ? (history.reduce((a: number, h: any) => a + h.gasUsedRatio, 0) / history.length * 100).toFixed(0) : "0" };
    }
  } catch {}
  return sampleGas();
}

/** Validators (Stream C PoS). No RPC surface yet — sample with a clear note until staking RPC lands. */
export async function getValidators(_net: ExplorerNetwork) {
  return sampleValidators();
}

/** Contracts registry. Needs the indexer to enumerate deployments — sample until it's wired. */
export async function getContracts(_net: ExplorerNetwork) {
  return { source: "sample" as const, contracts: sampleContracts() };
}

/** Token registry. Discovered from Transfer events by the indexer — sample until it's wired. */
export async function getTokens(_net: ExplorerNetwork) {
  return { source: "sample" as const, tokens: sampleTokens() };
}

/** Event logs: live eth_getLogs over a recent window, else sample. */
export async function getLogs(net: ExplorerNetwork) {
  if (net.rpc) try {
    const head = hexToNum(await rpc(net.rpc, "eth_blockNumber", [], 4000));
    if (Number.isFinite(head)) {
      const from = Math.max(0, head - 50);
      const raw = await rpc(net.rpc, "eth_getLogs", [{ fromBlock: "0x" + from.toString(16), toBlock: "0x" + head.toString(16) }], 8000);
      if (Array.isArray(raw)) return {
        source: "live" as const, logs: raw.slice(-40).reverse().map((l: any) => ({
          address: l.address, event: null, topic0: (l.topics || [])[0] || "0x", topics: l.topics || [], data: l.data || "0x",
          block: hexToNum(l.blockNumber), txHash: l.transactionHash, logIndex: hexToNum(l.logIndex), timestamp: 0,
        })),
      };
    }
  } catch {}
  return { source: "sample" as const, logs: sampleLogs() };
}
