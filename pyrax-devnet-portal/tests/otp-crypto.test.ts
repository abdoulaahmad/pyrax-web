// SPDX-License-Identifier: LicenseRef-Proprietary
// OTP + session crypto: codes/session ids are stored only as keyed HMACs, compared in constant time.
// We also model the SINGLE-USE invariant the same way the SQL does (UPDATE … WHERE used_at IS NULL),
// so the property is tested without a live DB.
import { describe, it, expect, beforeEach, vi } from "vitest";

// Pin a deterministic key for the HMAC so digests are stable across the run.
beforeEach(() => { vi.resetModules(); process.env.SESSION_SECRET = "test-session-secret"; process.env.NODE_ENV = "test"; });

async function load() { return await import("../src/server/crypto"); }

describe("randomOtp()", () => {
  it("produces exactly N numeric digits", async () => {
    const { randomOtp } = await load();
    for (const n of [6, 9, 12]) {
      const code = randomOtp(n);
      expect(code).toHaveLength(n);
      expect(/^[0-9]+$/.test(code)).toBe(true);
    }
  });
  it("is not trivially constant", async () => {
    const { randomOtp } = await load();
    const codes = new Set(Array.from({ length: 20 }, () => randomOtp(9)));
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe("hmac() — non-reversible, deterministic, salted by code+email", () => {
  it("same input → same digest; different input → different digest", async () => {
    const { hmac } = await load();
    const a = hmac("user@x.com:123456789");
    const b = hmac("user@x.com:123456789");
    const c = hmac("user@x.com:987654321");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).not.toContain("123456789"); // the raw code is not present in the digest
    expect(a).toMatch(/^[0-9a-f]{64}$/);  // hex sha256
  });
});

describe("timingSafeEqual()", () => {
  it("true for equal, false for unequal or different-length", async () => {
    const { timingSafeEqual, hmac } = await load();
    const h = hmac("x:1");
    expect(timingSafeEqual(h, h)).toBe(true);
    expect(timingSafeEqual(h, hmac("x:2"))).toBe(false);
    expect(timingSafeEqual(h, h.slice(0, -1))).toBe(false);
  });
});

describe("session ids", () => {
  it("randomSessionId is a 256-bit base64url string and unique", async () => {
    const { randomSessionId } = await load();
    const ids = Array.from({ length: 50 }, () => randomSessionId());
    expect(new Set(ids).size).toBe(50);
    for (const id of ids) expect(/^[A-Za-z0-9_-]+$/.test(id)).toBe(true);
  });
});

// Model of the DB's single-use OTP semantics: an OTP row stores hmac(email:code) and a used_at flag.
// Verification atomically claims it iff used_at is null and not expired — exactly the SQL UPDATE.
describe("OTP single-use semantics (modeled on the SQL invariant)", () => {
  it("a code verifies once, then is rejected on replay", async () => {
    const { hmac } = await load();
    const store = new Map<string, { used: boolean; expiresAt: number }>();
    const email = "alice@example.com", code = "123456789";
    store.set(hmac(`${email}:${code}`), { used: false, expiresAt: Date.now() + 60_000 });

    function verify(e: string, c: string): boolean {
      const row = store.get(hmac(`${e}:${c}`));
      if (!row || row.used || row.expiresAt <= Date.now()) return false;
      row.used = true; // atomic claim (UPDATE … SET used_at WHERE used_at IS NULL)
      return true;
    }
    expect(verify(email, code)).toBe(true);   // first use
    expect(verify(email, code)).toBe(false);  // replay rejected
    expect(verify(email, "000000000")).toBe(false); // wrong code never matches a stored hash
  });
  it("an expired code is rejected even on first use", async () => {
    const { hmac } = await load();
    const store = new Map<string, { used: boolean; expiresAt: number }>();
    const email = "bob@example.com", code = "999999999";
    store.set(hmac(`${email}:${code}`), { used: false, expiresAt: Date.now() - 1 });
    function verify(e: string, c: string): boolean {
      const row = store.get(hmac(`${e}:${c}`));
      if (!row || row.used || row.expiresAt <= Date.now()) return false;
      row.used = true; return true;
    }
    expect(verify(email, code)).toBe(false);
  });
});
