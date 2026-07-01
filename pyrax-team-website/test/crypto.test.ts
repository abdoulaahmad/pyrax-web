// SPDX-License-Identifier: LicenseRef-Proprietary
//
// OTP/session crypto primitives + the SESSION_SECRET fail-closed guard. The HMAC is what makes a
// stored OTP non-reversible and a stored session id un-hijackable from a DB read; these lock its
// keying + constant-time comparison, and that a missing secret refuses to boot in production.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const ORIG = { ...process.env };
beforeEach(() => vi.resetModules());
afterEach(() => {
  process.env = { ...ORIG };
});

describe("SESSION_SECRET fail-closed guard", () => {
  it("throws on import in production when SESSION_SECRET is unset", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.SESSION_SECRET;
    await expect(import("../src/server/crypto")).rejects.toThrow(/SESSION_SECRET/);
  });
  it("imports in production with a real SESSION_SECRET", async () => {
    process.env.NODE_ENV = "production";
    process.env.SESSION_SECRET = "a-strong-session-secret";
    const mod = await import("../src/server/crypto");
    expect(typeof mod.hmac).toBe("function");
  });
  it("imports outside production without a secret (dev key)", async () => {
    process.env.NODE_ENV = "test";
    delete process.env.SESSION_SECRET;
    const mod = await import("../src/server/crypto");
    expect(typeof mod.hmac).toBe("function");
  });
});

describe("hmac() + timingSafeEqual()", () => {
  it("is deterministic for the same input + key", async () => {
    process.env.NODE_ENV = "test";
    process.env.SESSION_SECRET = "k1";
    const { hmac } = await import("../src/server/crypto");
    expect(hmac("ada@pyraxchain.com:123456789")).toBe(hmac("ada@pyraxchain.com:123456789"));
  });
  it("changes with the key (so a DB read can't reproduce a code without the secret)", async () => {
    process.env.NODE_ENV = "test";
    process.env.SESSION_SECRET = "k1";
    const a = (await import("../src/server/crypto")).hmac("same-input");
    vi.resetModules();
    process.env.SESSION_SECRET = "k2";
    const b = (await import("../src/server/crypto")).hmac("same-input");
    expect(a).not.toBe(b);
  });
  it("hex digest is 64 chars (sha256) and not the plaintext", async () => {
    process.env.NODE_ENV = "test";
    process.env.SESSION_SECRET = "k1";
    const { hmac } = await import("../src/server/crypto");
    const h = hmac("ada@pyraxchain.com:000000000");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toContain("ada@pyraxchain.com");
  });
  it("timingSafeEqual is true for equal, false for unequal / different length", async () => {
    process.env.NODE_ENV = "test";
    const { timingSafeEqual } = await import("../src/server/crypto");
    expect(timingSafeEqual("abc", "abc")).toBe(true);
    expect(timingSafeEqual("abc", "abd")).toBe(false);
    expect(timingSafeEqual("abc", "abcd")).toBe(false);
  });
});

describe("randomOtp()", () => {
  it("produces digits-only of the requested length, with variety across draws", async () => {
    process.env.NODE_ENV = "test";
    const { randomOtp } = await import("../src/server/crypto");
    const codes = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const c = randomOtp(9);
      expect(c).toMatch(/^\d{9}$/);
      codes.add(c);
    }
    // 50 nine-digit draws should never all collide — proves it's not a constant.
    expect(codes.size).toBeGreaterThan(40);
  });
});

describe("randomSessionId()", () => {
  it("is high-entropy + unique across draws", async () => {
    process.env.NODE_ENV = "test";
    const { randomSessionId } = await import("../src/server/crypto");
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) ids.add(randomSessionId());
    expect(ids.size).toBe(100);
    for (const id of ids) expect(id.length).toBeGreaterThanOrEqual(40);
  });
});
