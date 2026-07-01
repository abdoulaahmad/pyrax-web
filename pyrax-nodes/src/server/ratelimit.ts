// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Tiny in-memory per-key token bucket. Single SSR process (the @astrojs/node standalone server), so a
// plain Map is enough — no Redis. Each key (typically a client IP) gets `capacity` tokens that refill
// at `refillPerSec`; a request that finds an empty bucket is rejected. The bucket map is bounded (LRU
// eviction by a hard cap) + periodically swept so a flood of distinct forged keys can't grow it without
// limit. Buckets are intentionally coarse: this is amplification/abuse mitigation, not fair-queueing.

interface Bucket { tokens: number; last: number; touched: number }

export interface RateLimitOptions {
  /** Max burst — tokens available when full. */
  capacity: number;
  /** Steady-state refill rate (tokens per second). */
  refillPerSec: number;
}

export interface RateLimiter {
  /** Take one token for `key`. Returns true if allowed, false if the bucket is empty (rate-limited). */
  take(key: string): boolean;
  /** Test/introspection: current bucket count. */
  size(): number;
  /** Test helper: drop all state. */
  reset(): void;
}

// Hard cap on distinct tracked keys. Beyond this we evict the least-recently-touched buckets so a
// flood of unique (possibly spoofed) keys can't grow memory unbounded. 50k IPs ≈ a few MB.
const MAX_KEYS = 50_000;
const SWEEP_MS = 60_000;

export function createRateLimiter(opts: RateLimitOptions): RateLimiter {
  const capacity = Math.max(1, opts.capacity);
  const refillPerSec = Math.max(0, opts.refillPerSec);
  const buckets = new Map<string, Bucket>();

  function evictIfNeeded() {
    if (buckets.size <= MAX_KEYS) return;
    // Evict the oldest-touched buckets down to ~90% of the cap in one pass.
    const target = Math.floor(MAX_KEYS * 0.9);
    const entries = [...buckets.entries()].sort((a, b) => a[1].touched - b[1].touched);
    for (let i = 0; i < entries.length && buckets.size > target; i++) buckets.delete(entries[i][0]);
  }

  let lastSweep = Date.now();
  function sweep(now: number) {
    if (now - lastSweep < SWEEP_MS) return;
    lastSweep = now;
    // A full (capacity) bucket idle for >2 sweeps carries no state worth keeping — drop it.
    const idleCutoff = now - SWEEP_MS * 2;
    for (const [k, b] of buckets) if (b.tokens >= capacity && b.touched < idleCutoff) buckets.delete(k);
  }

  return {
    take(key: string): boolean {
      const now = Date.now();
      sweep(now);
      let b = buckets.get(key);
      if (!b) {
        b = { tokens: capacity, last: now, touched: now };
        buckets.set(key, b);
        evictIfNeeded();
      } else {
        const elapsed = (now - b.last) / 1000;
        if (elapsed > 0) {
          b.tokens = Math.min(capacity, b.tokens + elapsed * refillPerSec);
          b.last = now;
        }
        b.touched = now;
      }
      if (b.tokens >= 1) { b.tokens -= 1; return true; }
      return false;
    },
    size: () => buckets.size,
    reset: () => buckets.clear(),
  };
}

// Shared limiters for the abuse-amplification endpoints.
//   announce: a node legitimately posts every ~10s; allow a small burst, refill ~1/3s.
//   deregister: a node legitimately calls this only when it is destroyed (rare, once per node). We
//     still allow a small burst (a fleet operator may tear several nodes down at once) but throttle it
//     so one holder of the shared HMAC secret can't loop deregister over every live peerId faster than
//     the ~10s re-announce cycle and keep the public directory perpetually blanked (directory churn DoS).
//   notifySubscribe: each call may hit Brevo (email) — keep this tight to deny email-bomb amplification.
export const announceLimiter = createRateLimiter({ capacity: 20, refillPerSec: 0.5 });
export const deregisterLimiter = createRateLimiter({ capacity: 10, refillPerSec: 0.2 });
export const notifySubscribeLimiter = createRateLimiter({ capacity: 5, refillPerSec: 0.05 });
