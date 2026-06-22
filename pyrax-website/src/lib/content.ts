// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// pyrax-website marketing copy + facts. The shared NAV DATA (SITE · LINKS · NAV · MEGA · NETWORKS) now
// lives ONCE in @pyrax/shared and is re-exported here, so the nav can never drift from the other PYRAX
// properties and existing `./lib/content.js` imports keep working. EVERYTHING below the re-exports is
// this site's OWN marketing copy — every number grounded in the ratified tokenomics + the vetted AMA
// (ama.md): no hype, no invented figures. If a fact changes upstream, change it here once.

import { LINKS } from "@pyrax/shared";

// Single source of truth for the chrome/nav — defined in @pyrax/shared/content.ts. Change the nav THERE.
export { SITE, LINKS, NAV, MEGA, NETWORKS, DEVNET2_LAUNCH_ISO } from "@pyrax/shared";
export type { NavLink, MegaItem, MegaAction, MegaSpotlight, Mega } from "@pyrax/shared";

// Headline stats (accurate, from the AMA / ratified tokenomics).
export const STATS: { value: string; label: string; tone?: "brand" | "bolt" | "violet" | "gold" }[] = [
  { value: "500k+", label: "TPS aggregate target", tone: "brand" },
  { value: "50B", label: "PYRX hard supply cap", tone: "gold" },
  { value: "3", label: "mining streams (TriStream)", tone: "bolt" },
  { value: "3", label: "contract VMs (EVM·WASM·Cairo)", tone: "violet" },
];

export type Feature = { title: string; desc: string; icon: string; tone?: "brand" | "bolt" | "violet" };

export const NETWORK_FEATURES: Feature[] = [
  { title: "GhostDAG blockDAG", desc: "Many block lanes produced in parallel, then ordered fairly — the path to a 500k+ TPS network-wide aggregate, measured by a reproducible benchmark.", icon: "lanes", tone: "brand" },
  { title: "TriStream mining", desc: "Stream A (ASIC, dual BLAKE3+SHA-256), Stream B (GPU KAWPOW / CPU RandomX — wired to AI earning), and Stream C (proof-of-stake). Rewards split roughly evenly.", icon: "streams", tone: "brand" },
  { title: "Shielded by default", desc: "The default transaction hides sender, receiver and amount with zero-knowledge proofs and no trusted setup. Transparent sends exist when you want them.", icon: "shield", tone: "bolt" },
  { title: "Three contract VMs", desc: "EVM (MetaMask, Hardhat, Foundry, ethers/viem work unchanged), WASM and Cairo — executing in the base layer, able to call each other across VMs.", icon: "cube", tone: "violet" },
  { title: "ISP-resistant mesh", desc: "No central boot server — nodes find each other through several decentralized methods. File & media sharing rides an onion-routed mixnet.", icon: "globe", tone: "bolt" },
  { title: "Anonymous file & media", desc: "Encrypted files and live media streams travel as uniform, padded onions — an observer sees that traffic moves, not what it is or who's talking.", icon: "lock", tone: "violet" },
];

export const NEURAX_PILLARS: Feature[] = [
  { title: "Runs on your GPU", desc: "NEURAX is built local-first on a consumer RTX 3060 baseline — your AI works on your machine, private and offline, and only reaches the network when a job is too big for your card.", icon: "chip", tone: "violet" },
  { title: "A real compute marketplace", desc: "Need AI work done? Pay in PYRX. Own a GPU? Run verified jobs and earn PYRX. The network matches the job to capable hardware and settles on-chain.", icon: "market", tone: "brand" },
  { title: "Verified, escrowed, trustless", desc: "Every job flows submit → escrow → match → run → verify → settle. Payment is locked on-chain up front and released only for work the network proves is real.", icon: "check", tone: "bolt" },
];

// NEURAX modalities — BRAND names only (never the underlying open-model names).
export const NEURAX_MODALITIES: { name: string; model: string; blurb: string; icon: string }[] = [
  { name: "Text & code", model: "neurax-coder", blurb: "An everyday assistant + coding copilot that runs locally; route the hard problems to the network.", icon: "code" },
  { name: "Image", model: "neurax-image", blurb: "High-quality text-to-image, tuned to fit consumer VRAM with quality/speed profiles.", icon: "image" },
  { name: "Audio", model: "neurax-scribe · speech · music", blurb: "Speech-to-text, natural text-to-speech, and text-to-music — all behind one job ABI.", icon: "wave" },
  { name: "Video", model: "neurax-video", blurb: "Efficient consumer-GPU video generation — short clips on a 16 GB card with the right profile.", icon: "film" },
  { name: "Spatial", model: "neurax-spatial", blurb: "Immersive 3D-audio upscaling — binaural, 5.1 & 7.1 — royalty-free and deterministic.", icon: "spatial" },
  { name: "Embeddings", model: "neurax-embed", blurb: "Fast vector embeddings for search and retrieval, powering the on-device copilot.", icon: "vector" },
];

// Tokenomics — ratified numbers from the AMA.
export const TOKEN_FACTS: { value: string; label: string }[] = [
  { value: "50,000,000,000", label: "Hard supply cap (PYRX) — bounded forever" },
  { value: "$0.0025", label: "Genesis price (funds the build + wide distribution)" },
  { value: "~54%", label: "Circulating at launch (≈27.1B) — high public float" },
  { value: "12.5B", label: "Lifetime mining cap, then fees-only (~26 yrs)" },
  { value: "25%", label: "Of every base fee burned — usage-driven scarcity" },
  { value: "$125M", label: "Genesis fully-diluted valuation" },
];

export const TOKEN_ALLOCATION: { label: string; amount: string; note: string; pct: number; tone: string }[] = [
  { label: "Genesis (public)", amount: "25B", note: "20B purchased + 5B bonus — all unlocked at launch, no vesting", pct: 50, tone: "var(--color-brand)" },
  { label: "Mining (TriStream)", amount: "12.5B", note: "Minted block-by-block over ~26 years, then fees-only", pct: 25, tone: "var(--color-gold)" },
  { label: "Ecosystem & Liquidity", amount: "5B", note: "Grants, integrations & launch liquidity (10% of supply)", pct: 10, tone: "var(--color-bolt)" },
  { label: "AI-compute pool", amount: "4B", note: "Metered out to subsidize NEURAX provider payouts early", pct: 8, tone: "var(--color-violet)" },
  { label: "Team & advisors", amount: "2.5B", note: "12-month cliff, then vests over 36 months", pct: 5, tone: "var(--color-faint)" },
  { label: "DAO treasury", amount: "1B", note: "Community-governed; releases on schedule", pct: 2, tone: "var(--color-positive)" },
];

export const TOKEN_UTILITY: { title: string; desc: string; icon: string }[] = [
  { title: "Gas", desc: "PYRX pays for every transaction and smart-contract call across the three VMs.", icon: "bolt" },
  { title: "AI compute", desc: "Requesters spend PYRX for NEURAX jobs; providers earn PYRX for verified work.", icon: "chip" },
  { title: "Staking", desc: "Lock at least 100,000 PYRX to run a validator, help finalize blocks, and earn.", icon: "shield" },
  { title: "Governance", desc: "The DAO tunes governance-set parameters and directs the treasury.", icon: "scale" },
];

export const TRISTREAM: { name: string; algo: string; who: string; icon: string }[] = [
  { name: "Stream A — ASIC", algo: "Dual BLAKE3 + SHA-256 proof-of-work", who: "ASIC-class hardware", icon: "asic" },
  { name: "Stream B — GPU / CPU", algo: "KAWPOW (GPU) · RandomX (CPU)", who: "Gaming GPUs & many-core CPUs — also wired to AI earning", icon: "gpu" },
  { name: "Stream C — Staking", algo: "Proof-of-stake finality", who: "Lock 100,000+ PYRX and run a validator", icon: "stake" },
];

export const VMS: { name: string; desc: string }[] = [
  { name: "EVM", desc: "Ethereum contracts + tooling (MetaMask, Hardhat, Foundry, ethers/viem) work unchanged." },
  { name: "WASM", desc: "WebAssembly contracts for builders coming from Rust and beyond." },
  { name: "Cairo", desc: "Cairo contracts — and all three VMs can call each other in-chain." },
];

// "Why decentralized AI" pillars (from the AMA essay).
export const WHY_AI: { title: string; desc: string }[] = [
  { title: "Access", desc: "Run real AI without a big-tech account or a gatekeeper's permission." },
  { title: "Affordability", desc: "An open market for the world's idle GPUs tends to undercut monopoly pricing." },
  { title: "Ownership & privacy", desc: "Your AI runs on your machine — private and offline — reaching out only when a job is too big." },
  { title: "A second income", desc: "Own the hardware? Your GPU earns from AI work, not just block rewards." },
];

// The NEURAX model catalog — BRAND ids only (never the underlying open-model names).
export const NEURAX_CATALOG: { id: string; modality: string; vram: string; tier: string }[] = [
  { id: "neurax-coder", modality: "Text & code", vram: "8 GB", tier: "Open" },
  { id: "neurax-coder-mini", modality: "Text & code · lite", vram: "2 GB", tier: "Open" },
  { id: "neurax-image", modality: "Image", vram: "8–16 GB", tier: "Open" },
  { id: "neurax-image-lite", modality: "Image · lite", vram: "2–6 GB", tier: "Open" },
  { id: "neurax-image-xl", modality: "Image · XL", vram: "12–16 GB", tier: "Open" },
  { id: "neurax-scribe", modality: "Audio · speech → text", vram: "3 GB", tier: "Open" },
  { id: "neurax-speech", modality: "Audio · text → speech", vram: "1 GB", tier: "Open" },
  { id: "neurax-music", modality: "Audio · music", vram: "8–14 GB", tier: "Open" },
  { id: "neurax-spatial", modality: "Audio · immersive 3D", vram: "1 GB", tier: "Open" },
  { id: "neurax-video", modality: "Video", vram: "8–24 GB", tier: "Open" },
  { id: "neurax-embed", modality: "Embeddings", vram: "1 GB", tier: "Open" },
];

// The NEURAX verification ladder.
export const NEURAX_VERIFY: { title: string; desc: string }[] = [
  { title: "Redundant quorum", desc: "Multiple workers run the same job in a pinned kernel-class; an exact-hash majority settles it." },
  { title: "Perceptual tolerance", desc: "For media (e.g. video), an advisory perceptual check — never an automatic slash." },
  { title: "Optimistic fraud-proof", desc: "A challenger can dispute a huge computation; an interactive bisection settles it by re-checking one tiny step." },
  { title: "TEE attestation", desc: "Trusted-tier jobs run only on attested datacenter GPUs (hardware-sealed execution)." },
];

// Fee market (EIP-1559 producer-forward, consensus-frozen).
export const FEE_SPLIT = {
  base: [
    { label: "Burned", pct: 25, tone: "var(--color-brand)" },
    { label: "PYRAX treasury", pct: 50, tone: "var(--color-bolt)" },
    { label: "DAO", pct: 25, tone: "var(--color-violet)" },
  ],
  tip: [
    { label: "Block producer", pct: 70, tone: "var(--color-gold)" },
    { label: "PYRAX", pct: 20, tone: "var(--color-bolt)" },
    { label: "DAO", pct: 10, tone: "var(--color-violet)" },
  ],
};

// Honest, dateless roadmap — grouped by what it MEANS to the community (no phase numbers, no dates).
export const ROADMAP: { shipped: { title: string; desc: string }[]; inProgress: { title: string; desc: string }[]; planned: { title: string; desc: string }[] } = {
  shipped: [
    { title: "Private Layer-1 core", desc: "The GhostDAG blockDAG; three mining streams (ASIC BLAKE3+SHA-256 · GPU/CPU KAWPOW+RandomX · proof-of-stake); BLS-aggregated >2/3 finality; an even three-way reward split." },
    { title: "Shielded privacy", desc: "Shielded-by-default transfers with real zero-knowledge proofs and no trusted setup; the wallet-side prover keeps the spending key off the node. (Mainnet use is gated by the external audit.)" },
    { title: "Bootstrapless networking", desc: "A libp2p mesh with no project boot server, an onion-routed Sphinx mixnet, and multi-peer chain sync." },
    { title: "PYRAX Wallet", desc: "One wallet across browser extension, desktop and mobile — built on a single shared core; your recovery phrase is the portable identity." },
    { title: "Inferno Node", desc: "The desktop node + miner + staking + AI app, with signed installers and self-hosted over-the-air updates." },
    { title: "Anonymous file & media", desc: "End-to-end file and live-media sharing over the live mixnet, with Files + Cast in the apps." },
    { title: "Smart contracts — three VMs", desc: "EVM, WASM and Cairo, L1-integrated; full Ethereum JSON-RPC (filters + subscriptions); precompiles + the L1↔rollup bridge; cross-VM calls; EIP-1559; CREATE2 — 351 tests, clean." },
    { title: "NEURAX substrate", desc: "On-chain escrow + the 4B AI-compute pool + the VRAM/tier scheduler + the model registry; the verification ladder; image + GPU pooling; audio, Spatial & video; the local runtime + the in-app NEURAX tab." },
    { title: "Tokenomics — ratified & coded", desc: "The 50B cap, the genesis allocation, capped halving emissions, the fee split, staking params, and the five networks." },
  ],
  inProgress: [
    { title: "PYRAX Copilot + the NEURAX gateway", desc: "The local coding copilot (guard-before-agent; no testnet/mainnet signing key) and the gateway that routes marketplace jobs into the real on-chain escrow path." },
    { title: "Private-throughput scaling", desc: "Recursive proof aggregation — the lever that scales shielded throughput." },
    { title: "Explorer, faucet & SDK helpers", desc: "A public block explorer, a faucet service, and transaction-submit/receipt SDK helpers (the CLI is already done)." },
    { title: "Mainnet hardening", desc: "Fuzzing → cryptography & circuit audits → an external consensus + privacy review → an incentivized public testnet → a bug bounty." },
    { title: "This website", desc: "An active workstream — depth, docs and integrations continue." },
  ],
  planned: [
    { title: "The recursive ZK rollup", desc: "Wire the batch-proof verifier that finalizes the L1↔rollup bridge batches — it carries the bulk of the 500k-TPS aggregate target." },
    { title: "NEURAX's remaining pillars", desc: "The ML + data platform, the full agentic Copilot, sealed Trusted-tier compute (TEE attestation), and an external AI-security audit." },
    { title: "Mainnet genesis", desc: "Only after the hardening and external audit gate completes. No date is committed anywhere — we decline dated promises." },
  ],
};

// Security & audit posture (the honesty centerpiece).
export const SECURITY_POINTS: { title: string; desc: string; icon: string }[] = [
  { title: "Shielded pool — real & hardened", desc: "Shielded-by-default transfers with real ZK (no trusted setup); the spending key never leaves the wallet — the node only verifies.", icon: "lock" },
  { title: "The hard gate", desc: "Privacy stays dev/testnet-grade until a formal external ZK-security audit. We won't turn it on for real money until it's independently vetted.", icon: "shield" },
  { title: "Adversarial review track record", desc: "Every subsystem gets independent red-team passes. Two real bugs were caught and fixed — a critical fork-choice bypass and a high prover overflow.", icon: "check" },
  { title: "The path to mainnet", desc: "Fuzzing → cryptography & circuit audits → external consensus + privacy review → an incentivized public testnet → a bug bounty → genesis.", icon: "map" },
  { title: "51%-resistance by design", desc: "TriStream combines three unrelated mechanisms (ASIC + GPU/CPU PoW + PoS) so capturing the chain means dominating all three at once.", icon: "streams" },
  { title: "Honest performance", desc: "We never quote a throughput number we can't reproduce — the 500k+ TPS aggregate is gated by the pyrax-bench methodology we publish.", icon: "pulse" },
];

// The product + service ecosystem (Ember is INTERNAL — never listed as a download).
export const ECOSYSTEM: { name: string; desc: string; kind: "Download" | "Service" | "Tooling"; href: string; icon: string }[] = [
  { name: "Inferno Node", desc: "The one-click desktop node — run a full node, mine three streams, stake, and contribute AI compute.", kind: "Download", href: "/node.html", icon: "server" },
  { name: "PYRAX CLI", desc: "Create and run nodes from the terminal — multi-node, auto-isolated ports.", kind: "Download", href: "/build.html#getting-started", icon: "terminal" },
  { name: "Block Explorer", desc: "Browse blocks, transactions and contracts across the networks.", kind: "Service", href: LINKS.explorer, icon: "globe" },
  { name: "Peer Directory", desc: "The live registry of reachable PYRAX nodes, per network.", kind: "Service", href: LINKS.peers, icon: "pulse" },
  { name: "Developer Docs", desc: "The full developer documentation site.", kind: "Tooling", href: LINKS.docs, icon: "book" },
  { name: "Brand & Press Kit", desc: "The phoenix mark, logos and the palette.", kind: "Tooling", href: "/company.html#brand", icon: "image" },
];

// Developer reference — system precompiles (all reachable from every VM, in the 0x…01xx range).
export const PRECOMPILES: { name: string; fn: string }[] = [
  { name: "BRIDGE", fn: "L1↔rollup deposit / withdraw / postCommitment" },
  { name: "BLAKE3", fn: "BLAKE3 hash" },
  { name: "SHA256", fn: "SHA-256 hash" },
  { name: "KECCAK256", fn: "Keccak-256 hash" },
  { name: "ECRECOVER", fn: "secp256k1 signature recovery" },
  { name: "CHAIN_CONTEXT", fn: "block number · timestamp · base fee · coinbase" },
  { name: "SHIELDED_VIEW", fn: "shielded-pool view access" },
];

// JSON-RPC surface (a representative slice of the full eth_* + pyrax_* methods).
export const RPC_GROUPS: { group: string; methods: string[] }[] = [
  { group: "Chain & state", methods: ["eth_chainId", "eth_blockNumber", "eth_getBalance", "eth_call", "eth_getCode", "eth_getStorageAt"] },
  { group: "Transactions", methods: ["eth_sendRawTransaction", "eth_getTransactionByHash", "eth_getTransactionReceipt", "eth_estimateGas"] },
  { group: "Blocks, logs & filters", methods: ["eth_getBlockByNumber", "eth_getLogs", "eth_newFilter", "eth_getFilterChanges"] },
  { group: "Fees (EIP-1559)", methods: ["eth_gasPrice", "eth_maxPriorityFeePerGas", "eth_feeHistory"] },
  { group: "WebSocket subscriptions", methods: ["eth_subscribe", "eth_unsubscribe"] },
  { group: "PYRAX native", methods: ["pyrax_blockNumber", "pyrax_dialPeers", "+ native node helpers"] },
];

// Execution limits + engine versions.
export const LIMITS: [string, string][] = [
  ["Block gas limit", "30,000,000"],
  ["Cross-VM call gas", "EIP-150 63/64 rule"],
  ["Call depth", "Capped at 1024"],
  ["EVM engine", "revm 22 (always-on)"],
  ["WASM engine", "wasmtime 33 + pyrax-contract-sdk"],
  ["Cairo engine", "cairo-vm 2.5 (STARK-provable)"],
  ["Phase 10 tests", "65 suites · 351 tests · fmt + clippy clean"],
];

// Use cases (concrete "what you can do").
export const USE_CASES: { title: string; desc: string; audience: string; icon: string }[] = [
  { title: "Private payments", desc: "Send value with sender, receiver and amount hidden by default — transparent when you choose.", audience: "Everyone", icon: "lock" },
  { title: "Run decentralized AI locally", desc: "NEURAX on your own GPU (RTX 3060 baseline) — private, offline, reaching the network only when a job is too big.", audience: "AI users", icon: "chip" },
  { title: "Earn from idle hardware", desc: "Mine three streams, stake PYRX, or sell GPU compute to the NEURAX marketplace.", audience: "Miners & GPU owners", icon: "gpu" },
  { title: "Build dApps", desc: "Drop-in EVM plus WASM and Cairo — and contracts can call each other across VMs.", audience: "Developers", icon: "code" },
  { title: "Anonymous file & media", desc: "Share encrypted files and live media as uniform, padded onions over the mixnet.", audience: "Creators", icon: "globe" },
];
