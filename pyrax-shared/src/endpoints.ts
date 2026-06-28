// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// SINGLE SOURCE OF TRUTH for every PYRAX domain / service endpoint the website talks to.
//
// The service domains changed again during launch prep. When the final addresses land, update THIS
// FILE ONLY — content.ts (LINKS / SITE / NETWORKS) and the rest of the site read everything from here.
// Every value tagged (CONFIRM) is the best-known target today; verify it before a production deploy.

export const DOMAINS = {
  site: "https://pyraxchain.com", // (CONFIRM) main marketing site (this site)
  docs: "https://pyraxchain.com/docs.html", // in-site docs page (built into this site; no longer a separate subdomain)
  explorer: "https://explorer.pyraxchain.com", // (CONFIRM)
  nodes: "https://nodes.pyraxchain.com", // (CONFIRM) the NEW "Status + Run-a-node" site (pyrax-nodes-website)
  peers: "https://peers.pyraxchain.com", // (CONFIRM) the peer-directory service
  tunnel: "nodes.pyraxchain.com", // (CONFIRM) per-node portal/RPC wildcard base — each node is <id>.<tunnel>
  updates: "https://updates.pyraxchain.com", // (CONFIRM)
  email: "info@pyraxchain.com", // (CONFIRM)
} as const;

export const SOCIAL = {
  github: "https://github.com/PYRAX-NETWORK", // (CONFIRM)
  x: "https://x.com/PYRAX_Official", // (CONFIRM)
  facebook: "https://www.facebook.com/groups/pyraxchain", // (CONFIRM)
  linkedin: "https://www.linkedin.com/company/pyrax-llc/", // (CONFIRM)
  youtube: "https://www.youtube.com/@PYRAXNETWORK", // (CONFIRM)
  discord: "https://discord.gg/cEX6uQn24", // (CONFIRM)
  telegram: "https://t.me/+3DreJAHGxqhjYWQx", // (CONFIRM)
} as const;

// Per-network PUBLIC, CORS-enabled HTTPS JSON-RPC endpoints, keyed by chainId. These drive the live
// data (block height / connected peers / live TPS) in the navbar selector + the homepage live-stats card.
//
//   • An EMPTY string ("") = that network shows a red "offline" dot — nothing is polled.
//   • Pyrax Seed (881109) + Pyrax Forge (710823) are PRIVATE: their RPC is intentionally
//     NOT published here, so this public build never carries or queries it. Authorized
//     tools get the endpoint out-of-band (the core team grants access in writing). They
//     render name-only/offline on the public site by design.
//   • Pyrax Rise / Pyrax One stay empty until each public network launches with a public
//     node, then point at pyrax-rise.rpc / pyrax-one.rpc.pyraxchain.com.
export const RPC_BY_CHAIN: Record<number, string> = {
  881109: "", // Pyrax Seed — PRIVATE, RPC never published in a public build
  429294: "", // (retired)
  710823: "", // Pyrax Forge — PRIVATE, RPC never published in a public build
  104928: "", // Pyrax Rise — wire to pyrax-rise.rpc.pyraxchain.com at launch
  563821: "", // Pyrax One — wire to pyrax-one.rpc.pyraxchain.com only after the audit gate
};

/** The RPC URL for a chainId, or "" if not wired (network-store treats "" as offline). */
export const rpcFor = (chainId: number): string => RPC_BY_CHAIN[chainId] ?? "";
