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

/** True when the request is behind a trusted reverse proxy (so XFF / body ip may be honored). */
export const trustProxy = () => process.env.TRUSTED_PROXY === "1" || process.env.TRUSTED_PROXY === "true";

/**
 * Resolve the client IP to use for an announce.
 *  - Default (no trusted proxy): ALWAYS the socket peer (clientAddress). Body `ip` and XFF are ignored,
 *    so a node can't spoof its location on the public map.
 *  - With TRUSTED_PROXY set: prefer body `ip`, then the first XFF hop, then clientAddress — because the
 *    real client address is the proxy and the upstream proxy is trusted to set those headers honestly.
 * Returns a normalized, shape-validated IP, or "" if nothing valid is available.
 */
export function resolveClientIp(opts: {
  clientAddress?: string | null;
  bodyIp?: unknown;
  xForwardedFor?: string | null;
}): string {
  const fromSocket = normalizeIp(String(opts.clientAddress || ""));
  if (!trustProxy()) return isValidIp(fromSocket) ? fromSocket : "";

  const bodyIp = typeof opts.bodyIp === "string" ? normalizeIp(opts.bodyIp) : "";
  if (isValidIp(bodyIp)) return bodyIp;

  const xff = normalizeIp(String(opts.xForwardedFor || "").split(",")[0]);
  if (isValidIp(xff)) return xff;

  return isValidIp(fromSocket) ? fromSocket : "";
}
