// SPDX-License-Identifier: LicenseRef-Proprietary
// Shared in-memory rate limiter: window accounting, 429 response shape, per-key isolation, and the
// IP-key derivation used for public endpoints.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { rateLimit, rateLimited, ipKey, _resetRateLimits } from "../src/server/ratelimit";

beforeEach(() => { _resetRateLimits(); vi.useRealTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe("rateLimit()", () => {
  it("allows up to `max` hits in the window, then blocks", () => {
    for (let i = 0; i < 5; i++) expect(rateLimit("k", 5, 60_000)).toBe(true);
    expect(rateLimit("k", 5, 60_000)).toBe(false);
    expect(rateLimit("k", 5, 60_000)).toBe(false);
  });
  it("keeps separate budgets per key", () => {
    for (let i = 0; i < 5; i++) rateLimit("a", 5, 60_000);
    expect(rateLimit("a", 5, 60_000)).toBe(false);
    expect(rateLimit("b", 5, 60_000)).toBe(true); // independent key unaffected
  });
  it("frees the budget once old hits fall outside the window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    for (let i = 0; i < 3; i++) expect(rateLimit("w", 3, 1_000)).toBe(true);
    expect(rateLimit("w", 3, 1_000)).toBe(false);
    vi.setSystemTime(1_500); // window elapsed
    expect(rateLimit("w", 3, 1_000)).toBe(true);
  });
});

describe("rateLimited() — API guard", () => {
  it("returns null while under the limit", () => {
    expect(rateLimited("r", 2, 60_000)).toBeNull();
    expect(rateLimited("r", 2, 60_000)).toBeNull();
  });
  it("returns a 429 Response with Retry-After once over the limit", async () => {
    rateLimited("r2", 1, 60_000);
    const res = rateLimited("r2", 1, 60_000);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(429);
    expect(res!.headers.get("Retry-After")).toBe("60");
    const body = await res!.json();
    expect(body.ok).toBe(false);
    expect(typeof body.error).toBe("string");
  });
});

describe("ipKey()", () => {
  const req = (h: Record<string, string>) => new Request("http://x/", { headers: h });
  it("prefers the first X-Forwarded-For hop", () => {
    expect(ipKey(req({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("1.2.3.4");
  });
  it("falls back to x-real-ip, then the client address, then 'unknown'", () => {
    expect(ipKey(req({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9");
    expect(ipKey(req({}), "10.0.0.1")).toBe("10.0.0.1");
    expect(ipKey(req({}))).toBe("unknown");
  });
});
