// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// SINGLE SOURCE OF TRUTH for every PYRAX domain / service endpoint the website talks to.
//
// The service domains changed again during launch prep. When the final addresses land, update THIS
// FILE ONLY — content.ts (LINKS / SITE / NETWORKS) and the rest of the site read everything from here.
// Every value tagged (CONFIRM) is the best-known target today; verify it before a production deploy.

export const DOMAINS = {
  site: "https://pyraxnetwork.org", // (CONFIRM) main marketing site (this site)
  docs: "https://pyraxnetwork.org/docs.html", // in-site docs page (built into this site; no longer a separate subdomain)
  explorer: "https://explorer.pyraxnetwork.org", // (CONFIRM)
  nodes: "", // (CONFIRM) the NEW "Status + Run-a-node" site (pyrax-nodes-website)
  peers: "", // (CONFIRM) the peer-directory service
  tunnel: "nodes.pyraxchain.com", // (CONFIRM) per-node portal/RPC wildcard base — each node is <id>.<tunnel>
  updates: "https://updates.pyraxchain.com", // (CONFIRM)
  email: "info@pyraxchain.com", // (CONFIRM)
  teamPortal: "",
  devnet: "",
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
//   • All networks are publicly VIEWABLE here as they come online (the explorer + the
//     navbar live-status read these). Participation (running a node) is gated elsewhere:
//     the public Inferno app + CLI only offer Pyrax Forge onwards; only the dev-team Ember
//     app joins Pyrax Seed.
//   • Pyrax Seed (881109) is served at pyrax-seed.rpc.pyraxchain.com (standard 443, so it
//     is reachable on cellular/corporate Wi-Fi). It reads "offline" until that vhost is
//     live, then flips to green automatically.
//   • Pyrax Forge / Rise / One stay empty until each launches, then point at
//     pyrax-forge.rpc / pyrax-rise.rpc / pyrax-one.rpc.pyraxchain.com.
export const RPC_BY_CHAIN: Record<number, string> = {
  881109: "https://pyrax-seed.rpc.pyraxchain.com", // Pyrax Seed — public read RPC for the explorer/live-status
  710823: "", // Pyrax Forge — wire to pyrax-forge.rpc.pyraxchain.com at launch
  104928: "", // Pyrax Rise — wire to pyrax-rise.rpc.pyraxchain.com at launch
  563821: "", // Pyrax One — wire to pyrax-one.rpc.pyraxchain.com only after the audit gate
};

/** The RPC URL for a chainId, or "" if not wired (network-store treats "" as offline). */
export const rpcFor = (chainId: number): string => RPC_BY_CHAIN[chainId] ?? "";
