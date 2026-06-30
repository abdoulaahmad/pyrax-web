// SPDX-License-Identifier: LicenseRef-Proprietary
//
// PYRAX-native SAMPLE data — used ONLY when a network's RPC is unreachable, so the explorer's design
// (and its PYRAX-specific surfaces: GhostDAG streams, 5 seal lanes, 6 tx types, shielded pool) is
// fully reviewable before a node is live. Every payload is flagged `source:"sample"` and the UI labels
// it clearly. Mirrors the real shapes returned by pyrax-core's RPC.
export const SEAL_ALGOS = ["blake3", "sha256d", "kheavyhash", "argon2id", "pos"] as const;
export const STREAMS = ["A", "B", "C"] as const;
export const TX_TYPES = ["transparent", "ethereum", "shielded", "escrow", "stake", "gov"] as const;
export const SEAL_LABEL: Record<string, string> = { blake3: "BLAKE3 PoW", sha256d: "SHA-256d PoW", kheavyhash: "kHeavyHash PoW", argon2id: "Argon2id PoW", pos: "PoS / BLS" };
export const STREAM_LABEL: Record<string, string> = { A: "Stream A · BLAKE3 / SHA-256d (ASIC)", B: "Stream B · kHeavyHash / Argon2id (GPU/CPU)", C: "Stream C · PoS / BLS finality" };
export const TX_TYPE_LABEL: Record<string, string> = { transparent: "Transparent", ethereum: "Ethereum", shielded: "Shielded", escrow: "Escrow", stake: "Stake", gov: "Governance" };

// Canonical TriStream seal-lane mapping (authoritative — pyrax-primitives Stream enum + pyrax-consensus lane_algo):
//   Stream A  = ASIC PoW   → BLAKE3 (even rotor) / SHA-256d (odd rotor)
//   Stream B  = GPU/CPU PoW → kHeavyHash (GPU lane) / Argon2id (CPU lane)
//   Stream C  = Proof-of-Stake + BLS finality (no PoW lane)
export const STREAM_ALGOS: Record<string, readonly string[]> = {
  A: ["blake3", "sha256d"],
  B: ["kheavyhash", "argon2id"],
  C: ["pos"],
};

let seed = 0x9e3779b9;
function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0xffffffff; }
const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];
const hex = (n: number) => "0x" + Array.from({ length: n }, () => "0123456789abcdef"[Math.floor(rnd() * 16)]).join("");
const addr = () => hex(40);
const hash = () => hex(64);
const pyrx = (whole: number) => (whole + rnd()).toFixed(4);

export function sampleBlock(num: number, nowSec: number) {
  const stream = pick(STREAMS);
  // Seal lane is bound to the stream (never random across streams): A→blake3/sha256d, B→kheavyhash/argon2id, C→pos.
  const seal = pick(STREAM_ALGOS[stream]);
  const txCount = Math.floor(rnd() * 40);
  const gasLimit = 30_000_000;
  return {
    number: num, blueScore: num, hash: hash(), parents: [hash(), ...(rnd() > 0.6 ? [hash()] : [])],
    stream, sealAlgo: seal, miner: addr(), timestamp: nowSec - (0) , txCount,
    gasUsed: Math.floor(rnd() * gasLimit * 0.8), gasLimit, baseFee: (1 + rnd() * 4).toFixed(2), size: 800 + Math.floor(rnd() * 40000),
  };
}
export function sampleTx(block: number, nowSec: number) {
  const type = rnd() > 0.55 ? (rnd() > 0.5 ? "transparent" : "ethereum") : pick(TX_TYPES);
  const shielded = type === "shielded";
  return {
    hash: hash(), type, block, timestamp: nowSec, status: rnd() > 0.06 ? 1 : 0,
    from: shielded ? null : addr(), to: shielded ? null : (rnd() > 0.15 ? addr() : null),
    value: shielded ? null : pyrx(Math.floor(rnd() * 500)), valueBalance: shielded ? (rnd() > 0.5 ? "-" : "+") + pyrx(Math.floor(rnd() * 50)) : null,
  };
}

const HEAD = 4_812_900;
export function sampleBlocks(count = 25, beforeNum?: number, nowSec = Math.floor(Date.now() / 1000)) {
  const head = beforeNum ?? HEAD + Math.floor(rnd() * 500);
  return Array.from({ length: count }, (_, i) => ({ ...sampleBlock(head - i, nowSec - i * 5), txCount: Math.floor(rnd() * 60) }));
}
export function sampleBlockDetail(num: number, nowSec = Math.floor(Date.now() / 1000)) {
  const b = sampleBlock(num, nowSec - Math.floor(rnd() * 600));
  const txs = Array.from({ length: b.txCount }, () => sampleTx(num, b.timestamp));
  return {
    source: "sample" as const, ...b, txs,
    stateRoot: hash(), transactionsRoot: hash(), receiptsRoot: hash(), blueWork: (BigInt(num) * 1_000_000n).toString(),
    daaScore: num, difficulty: (1e12 + rnd() * 1e12).toFixed(0), finalized: num <= HEAD - 18,
  };
}
export function sampleTxs(count = 25, nowSec = Math.floor(Date.now() / 1000)) {
  return Array.from({ length: count }, (_, i) => sampleTx(HEAD - Math.floor(i / 3), nowSec - i * 4));
}
export function sampleTxDetail(h: string, nowSec = Math.floor(Date.now() / 1000)) {
  const type = pick(TX_TYPES);
  const shielded = type === "shielded";
  const block = HEAD - Math.floor(rnd() * 50);
  return {
    source: "sample" as const, hash: h, type, block, blockHash: hash(), txIndex: Math.floor(rnd() * 30), timestamp: nowSec - Math.floor(rnd() * 3600), status: rnd() > 0.06 ? 1 : 0,
    from: shielded ? null : addr(), to: shielded ? null : (rnd() > 0.2 ? addr() : null),
    value: shielded ? null : pyrx(Math.floor(rnd() * 800)), valueBalance: shielded ? (rnd() > 0.5 ? "-" : "+") + pyrx(Math.floor(rnd() * 80)) : null,
    nonce: Math.floor(rnd() * 400), gasLimit: 21000 + Math.floor(rnd() * 200000), gasUsed: 21000 + Math.floor(rnd() * 150000), gasPrice: (1 + rnd() * 3).toFixed(2), fee: pyrx(0),
    input: type === "ethereum" ? hex(8 + Math.floor(rnd() * 200) * 2) : "0x", contractCreated: rnd() > 0.9 ? addr() : null,
    nullifiers: shielded ? Array.from({ length: 1 + Math.floor(rnd() * 2) }, () => hash()) : [],
    commitments: shielded ? Array.from({ length: 1 + Math.floor(rnd() * 2) }, () => hash()) : [],
    anchor: shielded ? hash() : null,
    logs: type === "ethereum" ? Array.from({ length: Math.floor(rnd() * 4) }, () => ({ address: addr(), topics: [hash()], data: hex(64) })) : [],
  };
}
export function sampleAddress(a: string) {
  const isContract = rnd() > 0.6;
  return {
    source: "sample" as const, address: a, isContract, vm: isContract ? pick(["evm", "wasm", "cairo"] as const) : null,
    balance: pyrx(Math.floor(rnd() * 100000)), nonce: Math.floor(rnd() * 800), txCount: Math.floor(rnd() * 5000), verified: isContract && rnd() > 0.5,
    txs: sampleTxs(12), tokens: Array.from({ length: Math.floor(rnd() * 5) }, () => ({ token: addr(), symbol: pick(["PYRX20", "USDX", "WBTC", "ART"]), amount: pyrx(Math.floor(rnd() * 5000)) })),
  };
}
export function sampleShielded() {
  const o = sampleOverview();
  return { source: "sample" as const, anchor: o.shielded.anchor, noteCount: o.shielded.noteCount, nullifierCount: o.shielded.nullifierCount, shieldedTxShare: o.shielded.shieldedTxShare, treeDepth: 32, capacity: 2 ** 32,
    recent: Array.from({ length: 10 }, (_, i) => { const op = pick(["shield", "deshield", "transfer"] as const); return { hash: hash(), op, valueBalance: op === "transfer" ? "0" : (op === "shield" ? "-" : "+") + pyrx(Math.floor(rnd() * 50)), block: HEAD - i * 2, timestamp: Math.floor(Date.now() / 1000) - i * 240 }; }) };
}

export function sampleOverview(nowSec = Math.floor(Date.now() / 1000)) {
  const height = 4_812_900 + Math.floor(rnd() * 1000);
  const blocks = Array.from({ length: 8 }, (_, i) => { const b = sampleBlock(height - i, nowSec - i * 5); return b; });
  const txs = Array.from({ length: 8 }, (_, i) => sampleTx(height - Math.floor(i / 2), nowSec - i * 3));
  const streamCounts = { A: 0, B: 0, C: 0 } as Record<string, number>;
  for (const b of blocks) streamCounts[b.stream]++;
  return {
    source: "sample" as const,
    height, blueScore: height, finalizedHeight: height - 18, daaScore: height,
    streamMode: "tri-stream", activeStreams: ["A", "B", "C"], streamCounts,
    gasPrice: "1.42", baseFee: "1.18", peers: 24, tps: (12 + rnd() * 40).toFixed(1),
    supplyCirculating: "37,508,420,000", supplyCap: "50,000,000,000",
    shielded: { anchor: hash(), noteCount: 184_204 + Math.floor(rnd() * 100), nullifierCount: 96_140 + Math.floor(rnd() * 100), shieldedTxShare: (8 + rnd() * 6).toFixed(1) },
    blocks, txs,
  };
}
export type SampleOverview = ReturnType<typeof sampleOverview>;
