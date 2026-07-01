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
    description: "PYRAX is a from-scratch Layer-1: a GhostDAG blockDAG, private by default, fully decentralized, ISP-resistant — with a verifiable AI compute marketplace. 500,000+ TPS target.",
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
    eyebrow: "The private, parallel Layer-1",
    title: "The blockchain built like the future demands.",
    subtitle: "PYRAX replaces the single chain with a GhostDAG web of blocks — private by default, fully decentralized, ISP-resistant, and engineered for 500,000+ transactions per second. Idle mining hardware becomes a verifiable AI compute marketplace.",
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
    throughputD: "A GhostDAG blockDAG accepts many blocks at once — honest parallel work is included, not orphaned. Target: 500,000+ TPS as a measured, benchmarked aggregate.",
    privacyT: "Private by default",
    privacyD: "Every transfer is shielded by default with no-trusted-setup zero-knowledge proofs. Sender, receiver, and amount are hidden. Transparent is the explicit exception.",
    decentralT: "Fully decentralized",
    decentralD: "Bootstrapless peer discovery — no company-run starter server on the critical path to joining. Three uncorrelated mining streams plus BLS proof-of-stake finality.",
    ispT: "ISP-resistant",
    ispD: "Traffic rides an onion Sphinx mixnet with fixed-size packets and cover traffic, so an on-path observer — including your ISP — sees only uniform encrypted flows.",
  },
  cta: {
    buildTitle: "Build on PYRAX",
    buildBody: "EVM, WASM, and Cairo — three virtual machines, one chain. Bring your Ethereum tooling or write provable contracts.",
    build: "Start building",
    industriesTitle: "PYRAX for your industry",
    industriesBody: "100 industries mapped to concrete PYRAX integrations, current market projections, and buildathon-ready dApp ideas.",
  },
  footer: {
    tagline: "High-throughput · private-by-default · fully decentralized · ISP-resistant · open-core.",
    product: "Product",
    developers: "Developers",
    network: "Network",
    community: "Community",
    resources: "Resources",
    rights: "All rights reserved.",
    openCore: "Open protocol under Apache-2.0. Apps, wallet, NEURAX & services proprietary. PYRAX™ is a trademark.",
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
