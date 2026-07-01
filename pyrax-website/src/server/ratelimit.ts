// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Tiny in-memory per-key token bucket for the marketing site's live-data endpoints. /api/net fans out
// ~8 upstream RPC calls per online network to the shared public seed node; without a throttle a client
// looping it amplifies each request into a burst against that single shared dependency. This bounds
// per-IP request rate. Paired with the short server-side stats cache (server/chain.ts) it keeps the
// upstream load flat under abuse. Process-local (single SSR instance behind Caddy).
//
// Fail-safe: never throws. `take()` returns { ok, retryAfter } and self-prunes idle buckets so memory
// stays bounded regardless of how many distinct IPs are seen.

interface Bucket { tokens: number; last: number }

export interface RateLimitOptions {
  ratePerSec?: number;
  burst?: number;
  idleMs?: number;
}

export class RateLimiter {
  private buckets = new Map<string, Bucket>();
  private readonly rate: number;
  private readonly burst: number;
  private readonly idleMs: number;
  private lastSweep = Date.now();

  constructor(opts: RateLimitOptions = {}) {
    this.rate = Math.max(0.01, opts.ratePerSec ?? 5);
    this.burst = Math.max(1, opts.burst ?? 10);
    this.idleMs = Math.max(1000, opts.idleMs ?? 60_000);
  }

  take(key: string): { ok: boolean; retryAfter: number } {
    const now = Date.now();
    this.maybeSweep(now);
    let b = this.buckets.get(key);
    if (!b) { b = { tokens: this.burst, last: now }; this.buckets.set(key, b); }
    const refill = ((now - b.last) / 1000) * this.rate;
    b.tokens = Math.min(this.burst, b.tokens + refill);
    b.last = now;
    if (b.tokens >= 1) { b.tokens -= 1; return { ok: true, retryAfter: 0 }; }
    const retryAfter = Math.ceil((1 - b.tokens) / this.rate);
    return { ok: false, retryAfter: Math.max(1, retryAfter) };
  }

  private maybeSweep(now: number) {
    if (now - this.lastSweep < this.idleMs) return;
    this.lastSweep = now;
    for (const [k, b] of this.buckets) if (now - b.last > this.idleMs) this.buckets.delete(k);
  }

  reset() { this.buckets.clear(); }
}

/**
 * Trusted client IP for rate-limit keying. NEVER key on the leftmost (client-controlled)
 * X-Forwarded-For hop. Behind Cloudflare the authoritative source is `CF-Connecting-IP` (CF overwrites
 * it; unforgeable through the proxy); otherwise fall back to the RIGHTMOST XFF hop (attested by our own
 * proxy), then X-Real-IP, then a constant shared bucket.
 */
export function clientIp(headers: Headers): string {
  const cf = headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const hops = xff.split(",").map((h) => h.trim()).filter(Boolean);
    if (hops.length) return hops[hops.length - 1];
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}
