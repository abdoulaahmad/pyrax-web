// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Single source of truth for every PYRAX domain / social / service endpoint the marketing site links
// to. Mirrors @pyrax/shared endpoints.ts — update here (or upstream) when a service address lands.
export const DOMAINS = {
  site: "https://pyraxchain.com",
  explorer: "https://explorer.pyraxchain.com",
  nodes: "https://nodes.pyraxchain.com",
  devnet: "https://devnet.pyraxchain.com",
  peers: "https://peers.pyraxchain.com",
  updates: "https://updates.pyraxchain.com",
  email: "info@pyraxchain.com",
} as const;

export const SOCIAL = {
  github: "https://github.com/PYRAX-NETWORK",
  x: "https://x.com/PYRAX_Official",
  discord: "https://discord.gg/cEX6uQn24",
  telegram: "https://t.me/+3DreJAHGxqhjYWQx",
  youtube: "https://www.youtube.com/@PYRAXNETWORK",
  linkedin: "https://www.linkedin.com/company/pyrax-llc/",
  facebook: "https://www.facebook.com/groups/pyraxchain",
} as const;
