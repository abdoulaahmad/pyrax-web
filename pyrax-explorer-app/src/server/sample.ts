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

// ---- DAG & Streams ----
export function sampleDag(nowSec = Math.floor(Date.now() / 1000)) {
  const head = HEAD + Math.floor(rnd() * 200);
  const N = 22;
  // Build a column-banded DAG: each block points back to 1-2 recent ancestors.
  const nodes = Array.from({ length: N }, (_, i) => {
    const blueScore = head - i;
    const stream = pick(STREAMS);
    return {
      hash: hash(), blueScore, stream, sealAlgo: pick(STREAM_ALGOS[stream]),
      timestamp: nowSec - i * 4, parents: [] as number[],
    };
  });
  // parents reference earlier indices (higher i = older); selected parent first, plus an
  // occasional merge parent — the multi-parent structure that makes this a DAG, not a chain.
  for (let i = 0; i < N; i++) {
    if (i + 1 < N) nodes[i].parents.push(i + 1);
    const merge = i + 2 + (rnd() > 0.6 ? 1 : 0);
    if (rnd() > 0.55 && merge < N) nodes[i].parents.push(merge);
  }
  const streamCounts: Record<string, number> = { A: 0, B: 0, C: 0 };
  for (const n of nodes) streamCounts[n.stream]++;
  return { source: "sample" as const, nodes, streamCounts, tips: [nodes[0].hash], head };
}

// ---- Network health ----
export function sampleNetwork() {
  const height = HEAD + Math.floor(rnd() * 400);
  const sealLanes: Record<string, number> = { blake3: 0, sha256d: 0, kheavyhash: 0, argon2id: 0, pos: 0 };
  for (let i = 0; i < 40; i++) { const s = pick(STREAMS); sealLanes[pick(STREAM_ALGOS[s])]++; }
  const peers = Array.from({ length: 8 }, (_, i) => ({
    id: "12D3Koo" + hex(20).slice(2), addr: `/ip4/${10 + Math.floor(rnd() * 240)}.${Math.floor(rnd() * 255)}.${Math.floor(rnd() * 255)}.${Math.floor(rnd() * 255)}/tcp/${30000 + Math.floor(rnd() * 5000)}`,
    height: height - Math.floor(rnd() * 6), latency: 20 + Math.floor(rnd() * 180), direction: rnd() > 0.5 ? "outbound" : "inbound",
  }));
  return {
    source: "sample" as const, mode: "simulated", modeNote: null as string | null, activeStreams: ["A", "B", "C"],
    height, target: height + Math.floor(rnd() * 3), finalizedHeight: height - 18, syncing: false, targetKnown: true,
    peerCount: peers.length, incompatiblePeers: 0, updateRequired: false,
    nodeInfo: { peerId: "12D3KooW" + hex(18).slice(2), listenAddrs: ["/ip4/0.0.0.0/tcp/30333", "/ip4/0.0.0.0/udp/30333/quic-v1"], p2pPort: 30333 },
    chainId: 0, clientVersion: "pyrax-node/v0.3.0", gasPrice: "1.42", baseFee: "1.18", sealLanes, peers,
  };
}

// ---- Gas tracker ----
export function sampleGas() {
  const base = 1 + rnd() * 2;
  const history = Array.from({ length: 24 }, (_, i) => {
    const b = base + Math.sin(i / 3) * 0.4 + rnd() * 0.25;
    return { block: HEAD - (23 - i), baseFee: Number(b.toFixed(3)), gasUsedRatio: Math.min(0.99, 0.25 + rnd() * 0.7) };
  });
  const cur = history[history.length - 1].baseFee;
  return {
    source: "sample" as const, baseFee: cur.toFixed(2),
    tiers: { low: (cur + 0.05).toFixed(2), avg: (cur + 0.15).toFixed(2), high: (cur + 0.4).toFixed(2) },
    history, avgUtil: (history.reduce((a, h) => a + h.gasUsedRatio, 0) / history.length * 100).toFixed(0),
  };
}

// ---- Validators (Stream C PoS) ----
const VAL_NAMES = ["Phoenix", "Ember", "Inferno", "Solace", "Cinder", "Pyre", "Forge", "Helios", "Vesta", "Ignis", "Aurora", "Flux"];
export function sampleValidators() {
  const total = 12;
  const stakes = Array.from({ length: total }, () => 1 + rnd() * 9);
  const sum = stakes.reduce((a, b) => a + b, 0);
  const validators = stakes.map((s, i) => ({
    rank: i + 1, address: addr(), name: VAL_NAMES[i % VAL_NAMES.length] + "-" + (i + 1),
    stake: (s * 1_000_000).toFixed(0), share: ((s / sum) * 100).toFixed(2),
    uptime: (97 + rnd() * 3).toFixed(2), blocksProposed: Math.floor(rnd() * 40000), status: rnd() > 0.1 ? "active" : "jailed",
  })).sort((a, b) => Number(b.stake) - Number(a.stake)).map((v, i) => ({ ...v, rank: i + 1 }));
  return {
    source: "sample" as const, validators,
    totalStaked: (sum * 1_000_000).toLocaleString("en-US"), activeCount: validators.filter((v) => v.status === "active").length,
    finalityRounds: 2, bondedRatio: (38 + rnd() * 8).toFixed(1),
  };
}

// ---- Contracts (multi-VM registry) ----
const VMS = ["evm", "wasm", "cairo"] as const;
const CONTRACT_NAMES = ["PyraxSwap Router", "PYRX Staking", "Phoenix NFT", "Ember Vault", "Treasury Multisig", "DAO Governor", "Bridge Adapter", "Oracle Aggregator", "Lending Pool", "Cinder Token", "Compute Escrow", "Solace Vesting"];
export function sampleContracts(count = 18) {
  return Array.from({ length: count }, (_, i) => {
    const vm = i < 12 ? "evm" : pick(["wasm", "cairo"] as const); // EVM is live today; WASM/Cairo are emerging
    return {
      address: addr(), name: CONTRACT_NAMES[i % CONTRACT_NAMES.length], vm,
      verified: vm === "evm" && rnd() > 0.35, txCount: Math.floor(rnd() * 80000), balance: pyrx(Math.floor(rnd() * 50000)),
      deployedBlock: HEAD - Math.floor(rnd() * 200000), language: vm === "evm" ? "Solidity" : vm === "wasm" ? "Rust" : "Cairo",
    };
  });
}

// ---- Contract detail (single) ----
const SAMPLE_ABI = JSON.stringify([
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "transfer", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "event", name: "Transfer", inputs: [{ name: "from", type: "address", indexed: true }, { name: "to", type: "address", indexed: true }, { name: "value", type: "uint256", indexed: false }] },
], null, 2);
const SAMPLE_SOURCE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Sample verified contract (illustrative — network offline)
contract PyraxSample {
    string public name = "Pyrax Sample";
    string public symbol = "PXS";
    mapping(address => uint256) public balanceOf;
    event Transfer(address indexed from, address indexed to, uint256 value);

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
}`;
export function sampleContractDetail(a: string) {
  const verified = rnd() > 0.4;
  return {
    source: "sample" as const, address: a, isContract: true, name: CONTRACT_NAMES[Math.floor(rnd() * CONTRACT_NAMES.length)],
    vm: "evm", verified, compiler: verified ? "v0.8.24+commit.e11b9ed9" : null, language: "Solidity",
    optimization: verified ? rnd() > 0.5 : null, runs: verified ? 200 : null, evmVersion: verified ? "cancun" : null,
    verifiedAt: verified ? Math.floor(Date.now() / 1000) - Math.floor(rnd() * 5_000_000) : null,
    abi: verified ? SAMPLE_ABI : null, sourceCode: verified ? SAMPLE_SOURCE : null,
    codeSize: 1200 + Math.floor(rnd() * 9000), balance: pyrx(Math.floor(rnd() * 50000)),
  };
}

// ---- Token detail (single) ----
export function sampleTokenDetail(a: string) {
  const [name, symbol, decimals, kind] = TOKEN_DEFS[Math.floor(rnd() * TOKEN_DEFS.length)];
  return {
    source: "sample" as const, address: a, name, symbol, decimals, kind,
    holders: Math.floor(500 + rnd() * 40000), transfers: Math.floor(1000 + rnd() * 900000),
    supply: kind === "ERC-20" ? (Math.floor(rnd() * 900) + 100).toLocaleString("en-US") + "M" : fmtCount(Math.floor(rnd() * 10000) + 100),
    verified: rnd() > 0.25,
    transfersList: Array.from({ length: 12 }, (_, i) => ({ txHash: hash(), from: addr(), to: addr(), amount: pyrx(Math.floor(rnd() * 5000)), block: HEAD - i * 2, timestamp: Math.floor(Date.now() / 1000) - i * 300 })),
  };
}

// ---- Tokens ----
const TOKEN_DEFS = [
  ["Pyrax USD", "pUSD", 6, "ERC-20"], ["Wrapped PYRX", "WPYRX", 18, "ERC-20"], ["Phoenix Gold", "PXG", 18, "ERC-20"],
  ["Ember Stable", "EMB", 18, "ERC-20"], ["Cinder", "CDR", 18, "ERC-20"], ["Solace", "SOL", 9, "ERC-20"],
  ["Phoenix Genesis", "PHX", 0, "ERC-721"], ["Forge Artifacts", "FRG", 0, "ERC-721"], ["Pyrax Items", "ITM", 0, "ERC-1155"],
] as const;
export function sampleTokens() {
  return TOKEN_DEFS.map(([name, symbol, decimals, kind], i) => ({
    address: addr(), name, symbol, decimals, kind,
    holders: Math.floor(500 + rnd() * 40000), transfers: Math.floor(1000 + rnd() * 900000),
    supply: kind === "ERC-20" ? (Math.floor(rnd() * 900) + 100).toLocaleString("en-US") + "M" : fmtCount(Math.floor(rnd() * 10000) + 100),
    verified: rnd() > 0.25,
  }));
}
const fmtCount = (n: number) => n.toLocaleString("en-US");

// ---- Event logs ----
const EVENT_SIGS = [
  { name: "Transfer(address,address,uint256)", topic: "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" },
  { name: "Approval(address,address,uint256)", topic: "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925" },
  { name: "Swap(address,uint256,uint256,address)", topic: "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822" },
  { name: "Staked(address,uint256)", topic: "0x9e71bc8eea02a63969f509818f2dafb9254532904319f9dbda79b67bd34a5f3d" },
];
export function sampleLogs(count = 20, nowSec = Math.floor(Date.now() / 1000)) {
  return Array.from({ length: count }, (_, i) => {
    const sig = pick(EVENT_SIGS);
    return {
      address: addr(), event: sig.name, topic0: sig.topic,
      topics: [sig.topic, "0x000000000000000000000000" + hex(40).slice(2), "0x000000000000000000000000" + hex(40).slice(2)],
      data: hex(64), block: HEAD - Math.floor(i / 2), txHash: hash(), logIndex: i % 6, timestamp: nowSec - i * 12,
    };
  });
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
