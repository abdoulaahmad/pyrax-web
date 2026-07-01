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

/** Best-effort client IP from common proxy headers, falling back to a constant bucket. */
export function clientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return headers.get("x-real-ip")?.trim() || headers.get("cf-connecting-ip")?.trim() || "unknown";
}
