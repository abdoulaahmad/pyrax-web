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

describe("clientIp (spoof-resistant behind Cloudflare + Caddy)", () => {
  it("prefers CF-Connecting-IP (Cloudflare overwrites it; client cannot forge it)", () => {
    // Even with a spoofed leftmost XFF, the CF-set header wins.
    const ip = clientIp(new Headers({ "cf-connecting-ip": "3.3.3.3", "x-forwarded-for": "6.6.6.6, 7.7.7.7" }));
    expect(ip).toBe("3.3.3.3");
  });

  it("uses the RIGHTMOST X-Forwarded-For hop (proxy-attested), never the client-controlled leftmost", () => {
    // The attacker sets 1.2.3.4 as the leftmost hop; the trusted proxy appends the real peer 5.6.7.8.
    // Keying on the rightmost hop means rotating the leftmost value can't mint fresh buckets.
    expect(clientIp(new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("5.6.7.8");
  });

  it("a spoofed leftmost XFF cannot rotate the bucket key", () => {
    const a = clientIp(new Headers({ "x-forwarded-for": "1.1.1.1, 9.9.9.9" }));
    const b = clientIp(new Headers({ "x-forwarded-for": "2.2.2.2, 9.9.9.9" }));
    expect(a).toBe(b); // same real (rightmost) peer ⇒ same bucket regardless of the forged leftmost
    expect(a).toBe("9.9.9.9");
  });

  it("a single-hop XFF (direct/off-Cloudflare) is used verbatim", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "8.8.8.8" }))).toBe("8.8.8.8");
  });

  it("falls back to x-real-ip then a constant", () => {
    expect(clientIp(new Headers({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9");
    expect(clientIp(new Headers({}))).toBe("unknown");
  });
});
