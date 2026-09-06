// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Single source of truth for every PYRAX domain / social / service endpoint the marketing site links
// to. Mirrors @pyrax/shared endpoints.ts — update here (or upstream) when a service address lands.
export const DOMAINS = {
  site: "https://pyraxnetwork.org",
  explorer: "https://explorer.pyraxnetwork.org",
  nodes: "",
  devnet: "",
  peers: "",
  updates: "https://updates.pyraxnetwork.org",
  // Team portal — the source of truth for the cross-site default network (Network Management page).
  // Read server-side only; override with the TEAM_URL env for local dev against a local team portal.
  team: "https://team.pyraxnetwork.org",
  teamPortal: "",
  email: "info@pyraxnetwork.org",
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
