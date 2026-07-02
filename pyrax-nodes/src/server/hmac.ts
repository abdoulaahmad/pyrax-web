// SPDX-License-Identifier: LicenseRef-Proprietary
//
// HMAC gate shared with the nodes + apps (ported from pyrax-peer-directory). Authorization header:
//   PYRAX-HMAC ts=<ms>,sig=<hex>
// sig = HMAC-SHA256(PYRAX_DIRECTORY_SECRET) over `${METHOD}\n${PATH}\n${ts}\n${sha256hex(body)}`.
// Replay-protected: ±90s clock window + one-time-use signature cache.
import crypto from "node:crypto";

const DEV_SECRET = "pyrax-dev-directory-secret-change-me";
const SECRET = process.env.PYRAX_DIRECTORY_SECRET || DEV_SECRET;
const WINDOW_MS = 90_000;
const seen = new Map<string, number>(); // sig -> expiry
// Bound the replay cache so a flood of distinct forged signatures can't grow it without limit. Each
// live entry is only meaningful for WINDOW_MS*2 (sweep removes it after), so this cap is a hard safety
// ceiling far above the legitimate in-flight signature count.
const MAX_SEEN = 50_000;

/** True when no real PYRAX_DIRECTORY_SECRET is configured (the public placeholder is in effect). */
export const usingDevSecret = () => SECRET === DEV_SECRET;

/**
 * Fail-closed ingest guard. In production a missing/placeholder PYRAX_DIRECTORY_SECRET means the HMAC
 * gate is effectively public (anyone who knows the published dev secret could forge announces and
 * poison the peer map / geo). Ingest routes call this first and refuse (503) when the dev secret is in
 * use under NODE_ENV=production. Outside production we allow it so local dev still works.
 */
export const ingestSecretReady = () => !(process.env.NODE_ENV === "production" && usingDevSecret());

function sweep() {
  const now = Date.now();
  for (const [k, exp] of seen) if (exp < now) seen.delete(k);
  // Hard cap: if the map is still over the ceiling after expiry sweep, drop the soonest-to-expire
  // entries until back under the cap. (Bounded-memory invariant under a forged-signature flood.)
  if (seen.size > MAX_SEEN) {
    const entries = [...seen.entries()].sort((a, b) => a[1] - b[1]);
    for (let i = 0; i < entries.length && seen.size > MAX_SEEN; i++) seen.delete(entries[i][0]);
  }
}

export function verifyHmac(method: string, path: string, rawBody: string, authHeader: string | null): boolean {
  if (!authHeader || !authHeader.startsWith("PYRAX-HMAC ")) return false;
  const parts: Record<string, string> = {};
  for (const seg of authHeader.slice("PYRAX-HMAC ".length).split(",")) {
    const [k, v] = seg.trim().split("=");
    if (k && v) parts[k] = v;
  }
  const ts = Number(parts.ts);
  const sig = parts.sig;
  if (!Number.isFinite(ts) || !sig) return false;
  if (Math.abs(Date.now() - ts) > WINDOW_MS) return false;
  const bodyHash = crypto.createHash("sha256").update(rawBody || "").digest("hex");
  const canon = `${method}\n${path}\n${ts}\n${bodyHash}`;
  const expect = crypto.createHmac("sha256", SECRET).update(canon).digest("hex");
  if (sig.length !== expect.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return false;
  if (seen.has(sig)) return false; // replay
  seen.set(sig, Date.now() + WINDOW_MS * 2);
  sweep();
  return true;
}

/** Same-origin browser read gate: the request's Origin/Referer host must equal the host the browser
 *  addressed. Lets the site's own pages read /api/peers while deterring casual cross-origin scraping.
 *
 *  PROXY-ROBUST: behind Cloudflare -> Caddy -> Astro, `new URL(request.url).host` is NOT the public
 *  host (it reflects the internal bind), so comparing only against it makes EVERY same-origin browser
 *  poll 401 in production — which silently froze the live peer list + network map. We therefore accept
 *  a match against ANY host the request legitimately carries: the reconstructed URL host, the Host
 *  header, or the proxy-attested X-Forwarded-Host. For a genuine same-origin fetch the browser's Origin
 *  host always equals its Host header, so this stays a valid same-origin gate while working behind the
 *  edge. (The public read is already IP-redacted in publicPeerList, so this gate is low-stakes.) */
export function sameOrigin(request: Request): boolean {
  try {
    const allowed = new Set<string>();
    try { allowed.add(new URL(request.url).host); } catch { /* ignore */ }
    const host = request.headers.get("host");
    if (host) allowed.add(host.trim());
    const xfh = request.headers.get("x-forwarded-host");
    if (xfh) xfh.split(",").forEach((h) => allowed.add(h.trim()));
    const hostMatches = (u: string) => { try { return allowed.has(new URL(u).host); } catch { return false; } };
    const o = request.headers.get("origin");
    if (o) return hostMatches(o);
    const r = request.headers.get("referer");
    if (r) return hostMatches(r);
  } catch { /* fallthrough */ }
  return false;
}
