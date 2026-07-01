// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Tiny in-memory per-key token bucket for the indexer read/verify HTTP API. The indexer is publicly
// reachable at explorer.pyraxchain.com/api/* (web-edge/Caddyfile), co-hosts the ingest worker in the
// same process, and runs expensive DB reads + an untrusted-Solidity compile — so an unthrottled flood
// on any route can starve the pg pool and the event loop for ingest. This bounds per-IP request rate.
//
// Fail-safe: never throws. `take()` returns { ok, retryAfter } and self-prunes idle buckets so memory
// stays bounded regardless of how many distinct IPs are seen. Process-local (single container instance).

export class RateLimiter {
  /** @param {{ ratePerSec?: number, burst?: number, idleMs?: number }} opts */
  constructor(opts = {}) {
    this.rate = Math.max(0.01, opts.ratePerSec ?? 10);
    this.burst = Math.max(1, opts.burst ?? 20);
    this.idleMs = Math.max(1000, opts.idleMs ?? 60_000);
    this.buckets = new Map();
    this.lastSweep = Date.now();
  }

  /** Consume one token for `key`. Returns { ok:false, retryAfter } (seconds) when the bucket is dry. */
  take(key) {
    const now = Date.now();
    this.#maybeSweep(now);
    let b = this.buckets.get(key);
    if (!b) { b = { tokens: this.burst, last: now }; this.buckets.set(key, b); }
    const refill = ((now - b.last) / 1000) * this.rate;
    b.tokens = Math.min(this.burst, b.tokens + refill);
    b.last = now;
    if (b.tokens >= 1) { b.tokens -= 1; return { ok: true, retryAfter: 0 }; }
    const retryAfter = Math.ceil((1 - b.tokens) / this.rate);
    return { ok: false, retryAfter: Math.max(1, retryAfter) };
  }

  #maybeSweep(now) {
    if (now - this.lastSweep < this.idleMs) return;
    this.lastSweep = now;
    for (const [k, b] of this.buckets) if (now - b.last > this.idleMs) this.buckets.delete(k);
  }

  /** Test/diagnostic helper. */
  reset() { this.buckets.clear(); }
}

/**
 * Trusted client IP for rate-limit keying. NEVER key on the leftmost (client-controlled)
 * X-Forwarded-For hop — that lets a client rotate its bucket per request. Behind Cloudflare, the
 * authoritative source is `CF-Connecting-IP` (CF overwrites it; unforgeable through the proxy);
 * otherwise fall back to the RIGHTMOST XFF hop (attested by our own proxy), then X-Real-IP, then the
 * socket peer address, then a constant shared bucket.
 * @param {import("node:http").IncomingMessage} req
 */
export function clientIp(req) {
  const h = req.headers || {};
  const one = (v) => (Array.isArray(v) ? v[0] : v);
  const cf = one(h["cf-connecting-ip"]);
  if (cf) return String(cf).trim();
  const xff = one(h["x-forwarded-for"]);
  if (xff) {
    const hops = String(xff).split(",").map((s) => s.trim()).filter(Boolean);
    if (hops.length) return hops[hops.length - 1]; // rightmost = proxy-attested peer
  }
  const real = one(h["x-real-ip"]);
  if (real) return String(real).trim();
  return req.socket?.remoteAddress || "unknown";
}
