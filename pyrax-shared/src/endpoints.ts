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
//   • Internal Devnet 1.0 (881109) points at the always-on DigitalOcean droplet that runs the simulated
//     devnet 24/7 (so the network stays reachable when the founder's PC is off). It will show "offline"
//     until that droplet + DNS are live, then flip to green automatically — no code change needed.
//   • Devnet2 / Testnet / Mainnet stay empty until each network actually launches and has a public node.
//
//   ⮕ TO LIGHT UP THE DEVNET: set RPC_BY_CHAIN[881109] to your droplet's real RPC URL (see the
//      "deploy the RPC droplet" guide). It MUST be HTTPS and send CORS headers (the droplet node is
//      started with --rpc-cors, or fronted by Caddy that adds them).
export const RPC_BY_CHAIN: Record<number, string> = {
  881109: "https://sidn-rpc.pyraxchain.com:8811", // Internal Devnet (simulated) — DEV-TEAM RPC on the droplet (159.223.193.210:8811). Status is shown publicly; the connection endpoint is NOT advertised to users. See NETWORK-REGISTRY.md.
  429294: "", // Internal Live — wire when a public node is exposed
  710823: "", // Devnet2 — wire at launch (target Jul 2026)
  104928: "", // Testnet — wire at launch
  563821: "", // Mainnet — wire only after the external audit gate
};

/** The RPC URL for a chainId, or "" if not wired (network-store treats "" as offline). */
export const rpcFor = (chainId: number): string => RPC_BY_CHAIN[chainId] ?? "";
