// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Small, dependency-free in-memory sliding-window rate limiter for the authenticated write endpoints
// (bug create/comment/react, conversation create) and the public node pair/heartbeat paths. It mirrors
// the OTP limiter in src/server/auth.ts: a per-key array of recent hit timestamps, pruned to the
// window on each call. This is per-process (good enough for a single SSR node behind Caddy); it is a
// best-effort abuse brake, not a security boundary — the real authz is the session + permission check.
import { json } from "./http";

const buckets = new Map<string, number[]>();

// Periodically drop empty/stale buckets so the map can't grow unbounded from one-off keys (e.g. IPs).
// Unref'd so it never keeps the process alive on its own.
const SWEEP_MS = 10 * 60_000;
const sweep = setInterval(() => {
  const now = Date.now();
  for (const [k, arr] of buckets) {
    const live = arr.filter((t) => now - t < 60 * 60_000);
    if (live.length === 0) buckets.delete(k);
    else buckets.set(k, live);
  }
}, SWEEP_MS);
if (typeof (sweep as any).unref === "function") (sweep as any).unref();

/** Returns true if this hit is allowed (and records it); false if the key is over `max` in `windowMs`. */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) { buckets.set(key, arr); return false; }
  arr.push(now);
  buckets.set(key, arr);
  return true;
}

/**
 * Convenience guard for API routes. Returns a 429 `Response` when the caller is over the limit, or
 * `null` to proceed. `route` namespaces the bucket so each endpoint gets its own budget.
 *   const limited = rateLimited(`bug:create:${me.id}`, 20, 60_000);
 *   if (limited) return limited;
 */
export function rateLimited(key: string, max: number, windowMs: number): Response | null {
  if (rateLimit(key, max, windowMs)) return null;
  const retryAfter = Math.ceil(windowMs / 1000);
  const res = json({ ok: false, error: "Too many requests — please slow down and try again shortly." }, 429);
  res.headers.set("Retry-After", String(retryAfter));
  return res;
}

/** Best-effort client IP for keying public (unauthenticated) limits. Trusts the first XFF hop set by
 *  our Caddy proxy, then x-real-ip, then the resolved client address. Mirrors http.clientIp(). */
export function ipKey(request: Request, clientAddress?: string): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim().slice(0, 64);
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim().slice(0, 64);
  return (clientAddress || "unknown").slice(0, 64);
}

/** Test-only: clear all buckets (and the keyspace) between unit tests. */
export function _resetRateLimits(): void { buckets.clear(); }
