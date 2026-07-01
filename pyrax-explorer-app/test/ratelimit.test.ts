// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Token-bucket rate limiter unit behavior (the primitive behind the /api/rpc per-IP throttle).
import { describe, it, expect } from "vitest";
import { RateLimiter, clientIp } from "../src/server/ratelimit";

describe("RateLimiter token bucket", () => {
  it("allows up to the burst, then denies", () => {
    const rl = new RateLimiter({ ratePerSec: 0.0001, burst: 5 });
    for (let i = 0; i < 5; i++) expect(rl.take("a").ok).toBe(true);
    const denied = rl.take("a");
    expect(denied.ok).toBe(false);
    expect(denied.retryAfter).toBeGreaterThan(0);
  });

  it("keys are independent", () => {
    const rl = new RateLimiter({ ratePerSec: 0.0001, burst: 2 });
    expect(rl.take("x").ok).toBe(true);
    expect(rl.take("x").ok).toBe(true);
    expect(rl.take("x").ok).toBe(false);
    // y has its own fresh bucket.
    expect(rl.take("y").ok).toBe(true);
  });

  it("refills over time", async () => {
    const rl = new RateLimiter({ ratePerSec: 1000, burst: 1 });
    expect(rl.take("z").ok).toBe(true);
    expect(rl.take("z").ok).toBe(false);
    await new Promise((r) => setTimeout(r, 20)); // ~20 tokens refilled at 1000/s
    expect(rl.take("z").ok).toBe(true);
  });
});

describe("clientIp", () => {
  it("prefers the first x-forwarded-for hop", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("1.2.3.4");
  });
  it("falls back to x-real-ip then a constant", () => {
    expect(clientIp(new Headers({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9");
    expect(clientIp(new Headers({}))).toBe("unknown");
  });
});
