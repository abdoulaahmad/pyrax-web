// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// SHARED NAV DATA — the single source of truth for the PYRAX site chrome across every property
// (marketing site, explorer, nodes, peers). Marketing page COPY lives in each site; this file holds
// ONLY what the shared header / footer / network-selector / command-palette need:
//   SITE · LINKS · NAV · MEGA · NETWORKS.
// Subdomains render these same links absolute (see config.ts → resolveHref). Update the nav here ONCE
// and every property inherits it.

import { DOMAINS, SOCIAL, rpcFor } from "./endpoints.js";

export const SITE = {
  name: "PYRAX",
  ticker: "PYRX",
  tagline: "A private Layer-1 that doubles as a decentralized AI supercomputer.",
  blurb:
    "PYRAX is a shielded-by-default GhostDAG blockchain with three ways to mine, full Ethereum compatibility, and a built-in marketplace — NEURAX — where idle GPUs around the world run AI work and earn PYRX.",
  email: DOMAINS.email,
} as const;

// All outbound URLs in ONE place — every value is sourced from the domains SSOT (endpoints.ts).
// Marketing-site paths are root-relative (resolved to absolute on subdomains via resolveHref).
export const LINKS = {
  docs: DOMAINS.docs,
  explorer: DOMAINS.explorer,
  peers: DOMAINS.peers,
  status: DOMAINS.peers,
  nodes: DOMAINS.nodes,
  whitepaper: "/whitepaper.html",
  genesisSponsorship: `${DOMAINS.site}/genesis-sponsorship`,
  downloads: "/node",
  github: SOCIAL.github,
  x: SOCIAL.x,
  discord: SOCIAL.discord,
  telegram: SOCIAL.telegram,
} as const;

// Devnet 2.0 launch target (viewer-local time) — reused by any site that runs the countdown.
export const DEVNET2_LAUNCH_ISO = "2026-07-01T05:00:00";

export type NavLink = { label: string; href: string };

// Top-level nav (each that has a mega-panel is keyed in MEGA below).
export const NAV: NavLink[] = [
  { label: "Network", href: "/network.html" },
  { label: "Develop", href: "/docs.html" },
  { label: "NEURAX AI", href: "/neurax.html" },
  { label: "Token", href: "/token.html" },
  { label: "Whitepaper", href: "/whitepaper.html" },
  { label: "Resources", href: "/ecosystem.html" },
];

export type MegaItem = { title: string; desc: string; href: string; icon: string };
export type MegaAction = { name: string; href: string; icon: string };
export type MegaSpotlight = {
  eyebrow: string;
  title: string;
  desc: string;
  href: string;
  cta: string;
  icon: string;
  tone: "brand" | "bolt" | "violet";
};
export type Mega = { items: MegaItem[]; actions: MegaAction[]; spotlight?: MegaSpotlight };

export const MEGA: Record<string, Mega> = {
  Network: {
    items: [
      { title: "GhostDAG consensus", desc: "A blockDAG ordered by k-cluster blue-set selection — parallel work is included, not orphaned.", href: "/network.html#ghostdag", icon: "lanes" },
      { title: "TriStream mining", desc: "ASIC + GPU/CPU PoW + PoS — capture the chain only by dominating all three.", href: "/network.html#tristream", icon: "streams" },
      { title: "PoS finality", desc: "Stream-C BLS-aggregated >2/3 finality with slashing.", href: "/network.html#tristream", icon: "stake" },
      { title: "Shielded by default", desc: "Sender, receiver and amount hidden — ZK proofs, no trusted setup.", href: "/network.html#privacy", icon: "lock" },
      { title: "ISP-resistant mixnet", desc: "Onion-routed Sphinx with cover traffic — your ISP sees only uniform onions.", href: "/network.html#mesh", icon: "globe" },
      { title: "Bootstrapless mesh", desc: "Join with no project-operated boot node — mDNS, DHT, PEX, signed seed list.", href: "/network.html#mesh", icon: "pulse" },
      { title: "Run a node", desc: "Mine, stake, relay or verify — earn from idle hardware with Inferno Node or the CLI.", href: "/node.html", icon: "server" },
    ],
    actions: [
      { name: "Architecture deep-dive", href: "/architecture.html", icon: "cube" },
      { name: "Security & audits", href: "/security.html", icon: "shield" },
      { name: "Roadmap & status", href: "/roadmap.html", icon: "map" },
    ],
    spotlight: {
      eyebrow: "Throughput",
      title: "500k+ TPS, bench-gated",
      desc: "An aggregate of GhostDAG parallel blocks, parallel execution and L2/L3 rollups — and every number we publish is reproducible on pyrax-bench first.",
      href: "/architecture.html",
      cta: "See how it scales",
      icon: "pulse",
      tone: "brand",
    },
  },
  Develop: {
    items: [
      { title: "Get started", desc: "Clone, build the node, run a dev node, verify over JSON-RPC.", href: "/docs.html#/getting-started", icon: "rocket" },
      { title: "Smart contracts (EVM)", desc: "Drop-in EVM — MetaMask, Hardhat, Foundry, viem/ethers unchanged.", href: "/docs.html#/evm", icon: "code" },
      { title: "WASM contracts", desc: "Rust, AssemblyScript & TinyGo via the pyrax-contract-sdk.", href: "/docs.html#/wasm-overview", icon: "chip" },
      { title: "Cairo contracts", desc: "STARK-provable execution feeding the L3 rollup.", href: "/docs.html#/cairo", icon: "cube" },
      { title: "JSON-RPC reference", desc: "The full eth_* surface + filters + WS subscriptions + pyrax_* native.", href: "/docs.html#/json-rpc", icon: "terminal" },
      { title: "Build with NEURAX", desc: "OpenAI-compatible gateway + the route CLI + the SDKs.", href: "/docs.html#/neurax-overview", icon: "spark" },
    ],
    actions: [
      { name: "Quickstart & examples", href: "/build.html", icon: "code" },
      { name: "Full documentation", href: "/docs.html", icon: "book" },
    ],
    spotlight: {
      eyebrow: "Ship today",
      title: "EVM, WASM & Cairo — one chain",
      desc: "Deploy with the Ethereum tools you already use, or go beyond Solidity. Copy-paste examples in Solidity, Rust, AssemblyScript, TinyGo & Cairo.",
      href: "/build.html",
      cta: "Start building",
      icon: "code",
      tone: "bolt",
    },
  },
  "NEURAX AI": {
    items: [
      { title: "Local-first AI", desc: "Runs on a consumer GPU — RTX 3060 baseline, private and offline.", href: "/neurax.html#local", icon: "chip" },
      { title: "The six pillars", desc: "Text, image, video, audio, an ML platform, and the PYRAX Copilot.", href: "/neurax.html#modalities", icon: "stack" },
      { title: "Model catalog", desc: "neurax-coder, -image, -scribe, -speech, -music, -video, -spatial, -embed.", href: "/neurax.html#modalities", icon: "cube" },
      { title: "Compute marketplace", desc: "Pay PYRX for inference; earn PYRX for idle GPU/CPU; settled on-chain.", href: "/neurax.html#marketplace", icon: "market" },
      { title: "Trust tiers & verification", desc: "Open / Secure / Trusted; redundant quorum + fraud-proofs + TEE.", href: "/neurax.html#trust", icon: "check" },
      { title: "NEURAX Spatial", desc: "Open, royalty-free immersive audio — binaural, 5.1/7.1, ambisonics.", href: "/neurax.html#spatial", icon: "wave" },
    ],
    actions: [
      { name: "NEURAX SDKs & gateway", href: "/build.html#neurax", icon: "bolt" },
      { name: "Earn from your GPU", href: "/node.html", icon: "gpu" },
      { name: "NEURAX build status", href: "/roadmap.html#neurax", icon: "pulse" },
    ],
    spotlight: {
      eyebrow: "Local-first",
      title: "Run NEURAX on your GPU",
      desc: "A real multimodal AI on a consumer RTX 3060 — private and offline — that reaches the network only when a job is too big for your card.",
      href: "/neurax.html",
      cta: "Meet NEURAX",
      icon: "chip",
      tone: "violet",
    },
  },
  Token: {
    items: [
      { title: "PYRX utility", desc: "Gas, AI compute, staking and earned for compute — a utility token.", href: "/token.html#utility", icon: "coin" },
      { title: "Supply & allocation", desc: "50B hard cap, genesis $0.0025, FDV ≈ $125M across six pools.", href: "/token.html#distribution", icon: "pie" },
      { title: "Vesting schedule", desc: "Team 12-mo cliff + 36-mo linear; ~27.1B circulating at launch.", href: "/token.html#distribution", icon: "blocks" },
      { title: "Mining emissions", desc: "300/block, halving every 21M blocks, capped at 12.5B.", href: "/token.html#emissions", icon: "streams" },
      { title: "Fee market & burn", desc: "EIP-1559 producer-forward; 25% of the base fee is burned.", href: "/token.html#emissions", icon: "flame" },
      { title: "Staking economics", desc: "100k min stake, 7-day unbonding, slashing for faults.", href: "/token.html#emissions", icon: "shield" },
    ],
    actions: [
      { name: "The 100B → 50B cut", href: "/token.html#supply", icon: "scale" },
      { name: "Utility / CFTC posture", href: "/token.html#classification", icon: "scale" },
      { name: "AMA & FAQ", href: "/company.html#ama", icon: "check" },
    ],
    spotlight: {
      eyebrow: "Fair launch",
      title: "$0.0025 genesis · 50B hard cap",
      desc: "A utility token you use — gas, AI compute and staking — with capped mining and a 25% base-fee burn that tightens supply as the network grows.",
      href: "/token.html",
      cta: "Read the tokenomics",
      icon: "coin",
      tone: "brand",
    },
  },
  Resources: {
    items: [
      { title: "Roadmap & status", desc: "What's live, what we're building, and what's next — honest, no dates.", href: "/roadmap.html", icon: "map" },
      { title: "Use cases", desc: "Private payments, local AI, earning from idle hardware, dApps & more.", href: "/use-cases.html", icon: "stack" },
      { title: "Security & audits", desc: "The privacy gate, the adversarial-review record, and the path to genesis.", href: "/security.html", icon: "shield" },
      { title: "Ecosystem", desc: "Apps, the wallet, the CLI, services and the brand kit.", href: "/ecosystem.html", icon: "server" },
      { title: "Block explorer", desc: "Browse blocks, transactions and contracts across every PYRAX network.", href: DOMAINS.explorer, icon: "globe" },
      { title: "About PYRAX", desc: "The team, the mission, and how to reach us.", href: "/company.html", icon: "flame" },
      { title: "AMA & FAQ", desc: "The vetted community Q&A — supply, the AI play, the utility posture.", href: "/company.html#ama", icon: "check" },
    ],
    actions: [
      { name: "Block explorer", href: DOMAINS.explorer, icon: "globe" },
      { name: "Live peers", href: LINKS.peers, icon: "pulse" },
      { name: "Contact us", href: `mailto:${SITE.email}`, icon: "arrow" },
    ],
    spotlight: {
      eyebrow: "In the open",
      title: "Roadmap & status — no dates",
      desc: "What's live, what we're building and what's next — honestly tracked, with an external ZK audit gating mainnet. No dated promises.",
      href: "/roadmap.html",
      cta: "See where it stands",
      icon: "map",
      tone: "bolt",
    },
  },
};

// The 5 networks — chain IDs published in DECIMAL. Each network's `rpc` comes from the domains SSOT
// (endpoints.ts → RPC_BY_CHAIN); an empty rpc = that network shows a red "offline" dot until wired.
// `status` drives chain-ID visibility in the navbar selector: "internal" networks NEVER show their
// chainId publicly; "public"/"built"/"pre-launch" show it only once LIVE and producing blocks.
// All four networks are listed and publicly VIEWABLE as they come online. `status:
// "internal"` (Seed/Forge) keeps the navbar from rendering their chain ID, matching the
// prior behaviour — they still show name + live status. Participation is gated in the
// apps/CLI, not here: only the dev-team Ember app joins Pyrax Seed; the public Inferno app
// + CLI join Pyrax Forge onwards. Pyrax Rise + One show their chain ID once live + producing.
export const NETWORKS: { name: string; chainId: number; rpc: string; blockTime: string; faucet: boolean; status: string; note: string }[] = [
  { name: "Pyrax Seed Network", chainId: 881109, rpc: rpcFor(881109), blockTime: "5s", faucet: false, status: "internal", note: "The dev team's simulated network — the current default" },
  { name: "Pyrax Forge Network", chainId: 710823, rpc: rpcFor(710823), blockTime: "5s", faucet: true, status: "internal", note: "The public-facing development network" },
  { name: "Pyrax Rise Network", chainId: 104928, rpc: rpcFor(104928), blockTime: "6s", faucet: true, status: "pre-launch", note: "Public test network — faucet + miner-reward ramp; launching soon" },
  { name: "Pyrax One Network", chainId: 563821, rpc: rpcFor(563821), blockTime: "6s", faucet: false, status: "pre-launch", note: "The production network — activated only after the external audit gate" },
];
