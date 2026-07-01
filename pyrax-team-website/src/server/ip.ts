// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Client-IP resolution for rate limiting. The team portal sits behind Caddy (and, in prod, behind
// Cloudflare), so the raw socket peer the Node adapter reports is the proxy — not the real caller.
// A proxy APPENDS to X-Forwarded-For, so the trustworthy hop is the RIGHTMOST one it added, never
// the client-controlled leftmost value (keying a limiter on the leftmost XFF is trivially spoofable
// by rotating the header). We therefore only consult XFF when TRUST_PROXY is explicitly enabled AND
// the topology's proxy-hop count is known, and we count hops from the right.
//
// TRUST_PROXY: number of trusted appending proxies in front of the app (e.g. 1 = Caddy only,
// 2 = Cloudflare -> Caddy). "1"/"true"/"yes"/"on" all mean a single trusted proxy. When unset/0 we
// ignore XFF entirely and use the socket peer, so a header can never move the bucket.

/** How many trusted appending proxies sit in front of this app (0 = don't trust XFF). */
export function trustedProxyHops(env: NodeJS.ProcessEnv = process.env): number {
  const raw = (env.TRUST_PROXY || "").trim().toLowerCase();
  if (!raw) return 0;
  if (raw === "true" || raw === "yes" || raw === "on") return 1;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Resolve the client IP from the socket peer + the X-Forwarded-For chain, honoring the trusted
 * proxy-hop count. Pure + fully testable.
 *
 * @param socketIp   the raw connection peer (Astro `ctx.clientAddress`), or "" if unavailable.
 * @param xff        the raw `X-Forwarded-For` header value (may be null/undefined).
 * @param hops       number of trusted appending proxies (from `trustedProxyHops()`).
 * @returns the best-known client IP, or "" if nothing usable is available.
 */
export function resolveClientIp(socketIp: string | null | undefined, xff: string | null | undefined, hops: number): string {
  const socket = (socketIp || "").trim();
  if (hops <= 0) return socket; // don't trust the header at all — use the connection peer
  const chain = String(xff || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (chain.length === 0) return socket;
  // Each trusted proxy appended one entry on the RIGHT (the address it received the request from),
  // so the trusted chain's `hops` rightmost entries are proxy-attested. The real client is the
  // LEFTMOST of those attested entries = chain[length - hops]. Anything further left is
  // client-supplied and MUST NOT be trusted. Clamp to 0 so a short/spoofed chain (fewer hops than
  // declared) can never index past the start to surface an attacker's own leftmost value.
  const idx = Math.max(0, chain.length - hops);
  return chain[idx] || socket;
}

/** Convenience: resolve the client IP straight from a Fetch `Request` + the socket peer. */
export function clientIpFrom(request: Request, socketIp: string | null | undefined, env: NodeJS.ProcessEnv = process.env): string {
  return resolveClientIp(socketIp, request.headers.get("x-forwarded-for"), trustedProxyHops(env));
}
