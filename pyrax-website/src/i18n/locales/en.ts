// SPDX-License-Identifier: LicenseRef-Proprietary
//
// English — the source-of-truth dictionary. Every other locale is a Partial<Dict> that falls back to
// these strings key-by-key. Keep keys stable; translate values in the sibling locale files.
import { tokenPage } from "../en-parts/tokenPage";
import { networkPage } from "../en-parts/networkPage";
import { pitch } from "../en-parts/pitch";
import { homeExtra } from "../en-parts/homeExtra";
import { navPanels } from "../en-parts/navPanels";
import { industriesUi } from "../en-parts/industriesUi";
import { companyPage } from "../en-parts/companyPage";
import { wpPage } from "../en-parts/wpPage";
import { notFound } from "../en-parts/notFound";
import { techPage } from "../en-parts/techPage";
import { devPage } from "../en-parts/devPage";
import { tokData } from "../en-parts/tokData";

export const en = {
  tokenPage,
  networkPage,
  pitch,
  homeExtra,
  navPanels,
  industriesUi,
  companyPage,
  wpPage,
  notFound,
  techPage,
  devPage,
  tokData,
  meta: {
    titleSuffix: "PYRAX™ Network",
    description: "PYRAX is a from-scratch Layer-1: GhostDAG consensus, opt-in privacy, fully decentralized — with a verifiable GPU compute marketplace. 500,000+ TPS target.",
  },
  nav: {
    products: "Products",
    industries: "Industries",
    technology: "Technology",
    developers: "Developers",
    network: "Network",
    token: "Token",
    company: "Company",
    launchApp: "Launch App",
    explorer: "Explorer",
    nodes: "Run a Node",
    devnet: "Devnet Portal",
    wallet: "Wallet",
    docs: "Docs",
    whitepaper: "Whitepaper",
    pitch: "Investors",
    viewAll: "View all",
    exploreIndustries: "Explore all 100 industries",
  },
  hero: {
    eyebrow: "The private, high-throughput Layer-1",
    title: "The blockchain built like the future demands.",
    subtitle: "PYRAX replaces the single chain with a GhostDAG web of blocks — private by default, fully decentralized, ISP-resistant, and engineered for 500,000+ transactions per second. Idle hardware becomes a verifiable GPU compute marketplace.",
    ctaPrimary: "Explore the network",
    ctaSecondary: "Read the whitepaper",
    liveOn: "Live on",
  },
  stats: {
    blockHeight: "Block height",
    peers: "Connected peers",
    tps: "Live TPS",
    finality: "Finality",
    offline: "offline",
    target: "target",
    supplyCap: "Max supply",
    streams: "Mining streams",
  },
  pillars: {
    title: "Four invariants, not features",
    subtitle: "Most networks bolt these on. PYRAX enforces them in its lowest-level types.",
    throughputT: "High throughput",
    throughputD: "A GhostDAG accepts many blocks at once — honest parallel work is included, not orphaned. Target: 500,000+ TPS as a measured, benchmarked aggregate.",
    multiVmT: "Multi-VM execution",
    multiVmD: "Universal smart contracts across EVM (revm), WASM (wasmtime), and Cairo on a unified ledger with synchronous cross-VM calls.",
    decentralT: "Hybrid consensus",
    decentralD: "Three uncorrelated mining streams (ASIC, GPU, CPU) coupled with a BLS proof-of-stake finality gadget to guarantee decentralization and deterministic settlement.",
    aiComputeT: "Verifiable AI & GPU compute",
    aiComputeD: "A native on-chain marketplace coordinating decentralized GPU clusters for model training, distributed compute, and verifiable AI inference.",
    privacyT: "Multi-VM execution",
    privacyD: "Universal smart contracts across EVM (revm), WASM (wasmtime), and Cairo on a unified ledger with synchronous cross-VM calls.",
    ispT: "Verifiable AI & GPU compute",
    ispD: "A native on-chain marketplace coordinating decentralized GPU clusters for model training, distributed compute, and verifiable AI inference.",
  },
  cta: {
    buildTitle: "Build on PYRAX",
    buildBody: "EVM, WASM, and Cairo — three virtual machines, one chain. Bring your Ethereum tooling or write provable contracts.",
    build: "Start building",
    industriesTitle: "PYRAX for your industry",
    industriesBody: "100 industries mapped to concrete PYRAX integrations, current market projections, and buildathon-ready dApp ideas.",
  },
  footer: {
    tagline: "High-throughput · Multi-VM execution · Hybrid consensus · Verifiable AI compute · Open-core.",
    product: "Product",
    developers: "Developers",
    network: "Network",
    community: "Community",
    resources: "Resources",
    rights: "All rights reserved.",
    openCore: "Open protocol under Apache-2.0. Apps, wallet, PYRAX Compute & services proprietary. PYRAX™ is a trademark.",
    selectLanguage: "Language",
    selectNetwork: "Network",
  },
  common: {
    learnMore: "Learn more",
    getStarted: "Get started",
    comingSoon: "Coming soon",
    live: "Live",
    audited: "Audit-gated",
  },
};

export type Dict = typeof en;


