// SPDX-License-Identifier: LicenseRef-Proprietary
// Token-bucket rate limiter: burst capacity, per-key isolation, refill over time, and bounded size.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createRateLimiter, announceLimiter, deregisterLimiter, notifySubscribeLimiter } from "../src/server/ratelimit";

describe("createRateLimiter", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(0); });
  afterEach(() => { vi.useRealTimers(); });

  it("allows up to `capacity` immediate requests, then rejects", () => {
    const rl = createRateLimiter({ capacity: 3, refillPerSec: 0 });
    expect(rl.take("ip")).toBe(true);
    expect(rl.take("ip")).toBe(true);
    expect(rl.take("ip")).toBe(true);
    expect(rl.take("ip")).toBe(false); // bucket empty
  });

  it("tracks each key independently", () => {
    const rl = createRateLimiter({ capacity: 1, refillPerSec: 0 });
    expect(rl.take("a")).toBe(true);
    expect(rl.take("a")).toBe(false);
    expect(rl.take("b")).toBe(true); // b has its own bucket
  });

  it("refills over time at refillPerSec", () => {
    const rl = createRateLimiter({ capacity: 1, refillPerSec: 1 }); // 1 token/sec
    expect(rl.take("ip")).toBe(true);
    expect(rl.take("ip")).toBe(false);
    vi.advanceTimersByTime(1000); // +1 token
    expect(rl.take("ip")).toBe(true);
    expect(rl.take("ip")).toBe(false);
  });

  it("does not refill beyond capacity", () => {
    const rl = createRateLimiter({ capacity: 2, refillPerSec: 10 });
    expect(rl.take("ip")).toBe(true);
    expect(rl.take("ip")).toBe(true);
    expect(rl.take("ip")).toBe(false);
    vi.advanceTimersByTime(10_000); // would be +100 tokens, but capped at 2
    expect(rl.take("ip")).toBe(true);
    expect(rl.take("ip")).toBe(true);
    expect(rl.take("ip")).toBe(false);
  });

  it("stays bounded under a flood of distinct keys", () => {
    const rl = createRateLimiter({ capacity: 1, refillPerSec: 0 });
    for (let i = 0; i < 60_000; i++) rl.take("ip-" + i);
    // MAX_KEYS is 50k; eviction keeps us at/under it.
    expect(rl.size()).toBeLessThanOrEqual(50_000);
  });

  it("reset() clears all state", () => {
    const rl = createRateLimiter({ capacity: 1, refillPerSec: 0 });
    rl.take("x"); rl.take("y");
    expect(rl.size()).toBe(2);
    rl.reset();
    expect(rl.size()).toBe(0);
  });
});

describe("shared endpoint limiters", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(0); announceLimiter.reset(); deregisterLimiter.reset(); notifySubscribeLimiter.reset(); });
  afterEach(() => { announceLimiter.reset(); deregisterLimiter.reset(); notifySubscribeLimiter.reset(); vi.useRealTimers(); });

  it("deregister has a bounded burst then throttles (directory-churn DoS defense)", () => {
    // A malicious holder of the shared secret loops deregister from one IP; after the small burst the
    // limiter must reject so it can't blank the directory faster than nodes re-announce (~10s).
    let allowed = 0;
    for (let i = 0; i < 50; i++) if (deregisterLimiter.take("198.51.100.9")) allowed++;
    expect(allowed).toBeGreaterThan(0);
    expect(allowed).toBeLessThan(50);      // it DID throttle
    expect(deregisterLimiter.take("198.51.100.9")).toBe(false); // exhausted
    expect(deregisterLimiter.take("203.0.113.7")).toBe(true);   // a different IP has its own bucket
  });

  it("deregister refills slowly (well under the ~10s re-announce cadence per token)", () => {
    for (let i = 0; i < 50; i++) deregisterLimiter.take("ip");
    expect(deregisterLimiter.take("ip")).toBe(false);
    vi.advanceTimersByTime(1000); // refillPerSec 0.2 → <1 token in 1s
    expect(deregisterLimiter.take("ip")).toBe(false);
    vi.advanceTimersByTime(5000); // now ≥1 token has accrued
    expect(deregisterLimiter.take("ip")).toBe(true);
  });
});
