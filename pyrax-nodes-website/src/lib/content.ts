// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// Nodes-site facts + links. Domains, the 5 networks, the chrome/nav and the network store all come
// from @pyrax/shared (the single source of truth shared with every PYRAX property). Only the
// nodes-specific content lives here.

import { DOMAINS, SOCIAL, cmdkEntry, type CmdkEntry } from "@pyrax/shared";

export const SITE = {
  name: "PYRAX Nodes",
  tagline: "Run a node. Watch the network breathe.",
  blurb:
    "PYRAX is a 100% decentralized network — no central server. Every node discovers peers directly (mDNS + DHT + signed seed lists) and validates the chain itself. This is the live window into it.",
  email: DOMAINS.email,
} as const;

export const LINKS = {
  main: DOMAINS.site, // the marketing site (pyraxchain.com)
  docs: DOMAINS.docs,
  whitepaper: `${DOMAINS.site}/whitepaper.html`,
  explorer: DOMAINS.explorer,
  peers: DOMAINS.peers,
  github: SOCIAL.github,
  x: SOCIAL.x,
  discord: SOCIAL.discord,
  telegram: SOCIAL.telegram,
} as const;

/** The peer-directory REST endpoint the live map polls (geolocated live peers; CORS-enabled). */
export const PEERS_API = `${DOMAINS.peers}/api/peers`;

/** Nodes-site pages added to the shared ⌘K command palette. */
export const NODES_SEARCH: CmdkEntry[] = [
  cmdkEntry("Network status", "/", "Nodes", "pulse", "live peers blocks height status"),
  cmdkEntry("Run a node", "/run.html", "Nodes", "server", "operator miner rpc requirements hardware setup"),
];

/** Node hardware tiers shown on the Run-a-node page. */
export const NODE_REQS: { tier: string; cpu: string; ram: string; disk: string; note: string }[] = [
  { tier: "Operator (Inferno)", cpu: "4-core CPU", ram: "8 GB", disk: "100 GB SSD", note: "Validate + relay + earn. The standard node." },
  { tier: "Miner", cpu: "GPU (KAWPOW) or many-core CPU (RandomX)", ram: "16 GB", disk: "100 GB SSD", note: "Add TriStream mining on top of an operator node." },
  { tier: "RPC / public gateway", cpu: "2 vCPU", ram: "4 GB", disk: "80 GB SSD", note: "A cheap droplet exposing CORS RPC for apps + this status page." },
];
