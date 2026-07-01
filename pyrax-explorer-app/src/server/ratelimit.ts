// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Tiny in-memory per-key token bucket. Used to throttle the public RPC proxy (src/pages/api/rpc.ts)
// so one client can't fan a flood of upstream node calls through the explorer. Process-local — for a
// single SSR instance behind Caddy this is sufficient; a multi-replica deploy would move this to Redis.
//
// Fail-safe: never throws. `take()` returns { ok, retryAfter } and self-prunes idle buckets so memory
// stays bounded regardless of how many distinct IPs are seen.

interface Bucket { tokens: number; last: number }

export interface RateLimitOptions {
  /** Sustained requests per second per key (bucket refill rate). */
  ratePerSec?: number;
  /** Maximum burst (bucket capacity). */
  burst?: number;
  /** Drop buckets untouched for this long (ms) on the periodic sweep. */
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

  /** Consume one token for `key`. Returns ok:false (with retryAfter seconds) when the bucket is dry. */
  take(key: string): { ok: boolean; retryAfter: number } {
    const now = Date.now();
    this.maybeSweep(now);
    let b = this.buckets.get(key);
    if (!b) { b = { tokens: this.burst, last: now }; this.buckets.set(key, b); }
    // Refill proportional to elapsed time, capped at burst.
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

  /** Test/diagnostic helper. */
  reset() { this.buckets.clear(); }
}

/**
 * Trusted client IP for rate-limit keying.
 *
 * SECURITY: never key on the LEFTMOST `X-Forwarded-For` hop — that value is fully client-controlled, so
 * rotating it per request mints a fresh bucket every time and defeats the limiter. This edge sits behind
 * Cloudflare (orange-proxied) fronting Caddy, and BOTH append to inbound XFF, so the leftmost hop is
 * whatever the attacker sent.
 *
 * Order of trust:
 *   1. `CF-Connecting-IP` — Cloudflare OVERWRITES (not appends) this with the real client IP on every
 *      request; a client cannot forge it through the CF proxy. This is the authoritative source in prod.
 *   2. The RIGHTMOST `X-Forwarded-For` hop — the address the nearest trusted proxy (Caddy) attested,
 *      i.e. the hop the client cannot control. (Direct, non-proxied requests carry a single value, which
 *      is simultaneously left- and right-most, so this stays correct off Cloudflare too.)
 *   3. `X-Real-IP` — a single proxy-set value.
 *   4. A constant fallback bucket so an IP-less request is still throttled (shared, but bounded).
 */
export function clientIp(headers: Headers): string {
  const cf = headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const hops = xff.split(",").map((h) => h.trim()).filter(Boolean);
    // Rightmost hop = the address our own proxy saw the connection come FROM (not client-forgeable).
    if (hops.length) return hops[hops.length - 1];
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}
