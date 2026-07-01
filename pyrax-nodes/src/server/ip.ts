// SPDX-License-Identifier: LicenseRef-Proprietary
//
// IP shape validation + client-IP resolution for the announce ingest. Two concerns:
//   1) Validate the IP *shape* (IPv4 / IPv6) before we ever embed it in a public multiaddr or hand it
//      to the geo provider — a malformed or attacker-chosen string must not flow into either.
//   2) Resolve the *trusted* client IP. The body `b.ip` and `X-Forwarded-For` are both spoofable, so we
//      only honor them behind an explicit TRUSTED_PROXY flag (set when a real reverse proxy like Caddy
//      is in front and we trust its XFF). Otherwise we use Astro's clientAddress (the real socket peer).

import net from "node:net";

/** Strip an IPv4-mapped IPv6 prefix (::ffff:1.2.3.4 -> 1.2.3.4) for consistent storage/geo. */
export const normalizeIp = (ip: string): string => (ip || "").trim().replace(/^::ffff:/i, "");

/** True for a syntactically valid IPv4 or IPv6 literal (no ports, no CIDR, no hostnames). */
export function isValidIp(ip: string | undefined | null): boolean {
  if (!ip) return false;
  return net.isIP(normalizeIp(ip)) !== 0;
}

/**
 * Build the node's public multiaddr, choosing the correct transport prefix for the IP family:
 *   IPv4 -> /ip4/<ip>/tcp/<port>/p2p/<peerId>
 *   IPv6 -> /ip6/<ip>/tcp/<port>/p2p/<peerId>   (a v6 literal under /ip4/ is a malformed multiaddr)
 * Falls back to a peer-only address (/p2p/<peerId>) when the IP is missing/invalid.
 */
export function multiaddrFor(ip: string, port: number, peerId: string): string {
  const norm = normalizeIp(ip);
  const fam = net.isIP(norm); // 4, 6, or 0
  if (fam === 0) return `/p2p/${peerId}`;
  return `/ip${fam}/${norm}/tcp/${port}/p2p/${peerId}`;
}

/** True when the request is behind a trusted reverse proxy (so XFF may be honored). */
export const trustProxy = () => process.env.TRUSTED_PROXY === "1" || process.env.TRUSTED_PROXY === "true";

/**
 * Number of proxy hops we trust to have APPENDED to X-Forwarded-For, counted from the right. Our known
 * topology is a single trusted reverse proxy (Caddy) directly in front, so the rightmost XFF entry is
 * the address Caddy attested for the hop it received; everything to its left is client-supplied and
 * therefore spoofable. Overridable via TRUSTED_PROXY_HOPS for a multi-proxy chain (e.g. Cloudflare +
 * Caddy = 2). Clamped to >=1.
 */
const trustedProxyHops = () => Math.max(1, Number(process.env.TRUSTED_PROXY_HOPS || 1) || 1);

/**
 * Resolve the client IP to use for an announce.
 *  - Default (no trusted proxy): ALWAYS the socket peer (clientAddress). Body `ip` and XFF are ignored,
 *    so a node can't spoof its location on the public map.
 *  - With TRUSTED_PROXY set: take the proxy-ATTESTED hop from X-Forwarded-For — the Nth entry counted
 *    from the RIGHT, where N = TRUSTED_PROXY_HOPS (default 1). An appending proxy puts the address it
 *    saw at the right end; the leftmost hop is whatever the original client sent (spoofable), so we
 *    never read from the left. The request-body `ip` is NOT trusted over the proxy attestation. Falls
 *    back to clientAddress (the proxy's own socket address) if XFF yields nothing valid.
 * Returns a normalized, shape-validated IP, or "" if nothing valid is available.
 */
export function resolveClientIp(opts: {
  clientAddress?: string | null;
  /** @deprecated Accepted for backward-compat but IGNORED — the client-supplied body ip is spoofable
   *  and must never determine a node's public multiaddr/geo. Kept so existing callers/tests compile. */
  bodyIp?: unknown;
  xForwardedFor?: string | null;
}): string {
  const fromSocket = normalizeIp(String(opts.clientAddress || ""));
  if (!trustProxy()) return isValidIp(fromSocket) ? fromSocket : "";

  // Parse XFF right-to-left: the trusted proxy appends the address it saw, so the attested client hop is
  // `hops` entries in from the right. Everything further left is attacker-controlled and must be ignored.
  const chain = String(opts.xForwardedFor || "").split(",").map((s) => normalizeIp(s)).filter(Boolean);
  if (chain.length) {
    const idx = chain.length - trustedProxyHops();
    const attested = idx >= 0 ? chain[idx] : chain[0];
    if (isValidIp(attested)) return attested;
  }

  return isValidIp(fromSocket) ? fromSocket : "";
}
