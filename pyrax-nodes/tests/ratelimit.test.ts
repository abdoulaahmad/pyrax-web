// SPDX-License-Identifier: LicenseRef-Proprietary
// Token-bucket rate limiter: burst capacity, per-key isolation, refill over time, and bounded size.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createRateLimiter } from "../src/server/ratelimit";

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
