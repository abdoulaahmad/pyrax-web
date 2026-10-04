// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Single source of truth for every PYRAX domain / social / service endpoint the marketing site links
// to. Dynamically extracts the active host to support multi-domain deployments (e.g. pyraxnetwork.org,
// pyraxchain.com, pyrax.org, pyrax.network).

const DEFAULT_BASE_DOMAIN = "pyraxnetwork.org";

/**
 * Extracts the base domain from a hostname or URL.
 * Examples:
 *   "pyraxnetwork.org"       -> "pyraxnetwork.org"
 *   "www.pyraxnetwork.org"   -> "pyraxnetwork.org"
 *   "pyraxchain.com"         -> "pyraxchain.com"
 *   "pyrax.org"              -> "pyrax.org"
 *   "pyrax.network"          -> "pyrax.network"
 *   "localhost:4325"         -> null (falls back to default)
 */
export function extractBaseDomain(hostOrUrl?: string | null): string | null {
  if (!hostOrUrl) return null;
  let host = hostOrUrl.trim();
  if (host.includes("://")) {
    try {
      host = new URL(host).host;
    } catch {
      host = host.split("://")[1];
    }
  }
  // Strip port
  host = host.split("/")[0].split(":")[0];

  // Exclude local dev / IP addresses
  if (!host || host === "localhost" || host === "127.0.0.1" || /^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
    return null;
  }

  // Strip leading 'www.'
  if (host.startsWith("www.")) {
    host = host.slice(4);
  }

  return host;
}

/**
 * Gets the current host if executing in the browser.
 */
export function getCurrentClientHost(): string | null {
  if (typeof window !== "undefined" && window.location) {
    return window.location.host;
  }
  return null;
}

/**
 * Resolves the dynamic explorer URL based on the current domain.
 * Supports environment variable override (PUBLIC_EXPLORER_URL / EXPLORER_URL),
 * explicit host parameter, or automatic host detection from window.location in the client.
 */
export function getExplorerUrl(hostOverride?: string | null): string {
  if (typeof process !== "undefined" && (process.env?.PUBLIC_EXPLORER_URL || process.env?.EXPLORER_URL)) {
    return process.env.PUBLIC_EXPLORER_URL || process.env.EXPLORER_URL!;
  }
  const host = hostOverride ?? getCurrentClientHost();
  const baseDomain = extractBaseDomain(host) || DEFAULT_BASE_DOMAIN;
  return `https://explorer.${baseDomain}`;
}

export function getSiteUrl(hostOverride?: string | null): string {
  const host = hostOverride ?? getCurrentClientHost();
  const baseDomain = extractBaseDomain(host);
  if (baseDomain) {
    return `https://${baseDomain}`;
  }
  return `https://${DEFAULT_BASE_DOMAIN}`;
}

export const DOMAINS = {
  get site(): string {
    return getSiteUrl();
  },
  get explorer(): string {
    return getExplorerUrl();
  },
  docs: "",
  nodes: "",
  devnet: "",
  peers: "",
  get updates(): string {
    const base = extractBaseDomain(getCurrentClientHost()) || DEFAULT_BASE_DOMAIN;
    return `https://updates.${base}`;
  },
  // Team portal — read server-side only; override with TEAM_URL env for local dev.
  get team(): string {
    const base = extractBaseDomain(getCurrentClientHost()) || DEFAULT_BASE_DOMAIN;
    return `https://team.${base}`;
  },
  teamPortal: "",
  get email(): string {
    const base = extractBaseDomain(getCurrentClientHost()) || DEFAULT_BASE_DOMAIN;
    return `info@${base}`;
  },
};

export const SOCIAL = {
  github: "https://github.com/PYRAX-NETWORK",
  x: "https://x.com/PYRAX_Official",
  discord: "https://discord.gg/cEX6uQn24",
  telegram: "https://t.me/+3DreJAHGxqhjYWQx",
  youtube: "https://www.youtube.com/@PYRAXNETWORK",
  linkedin: "https://www.linkedin.com/company/pyrax-llc/",
  facebook: "https://www.facebook.com/groups/pyraxchain",
} as const;
