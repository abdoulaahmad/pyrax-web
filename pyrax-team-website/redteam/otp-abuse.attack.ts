// SPDX-License-Identifier: LicenseRef-Proprietary
//
// RED TEAM — OTP abuse attacks (team portal sign-in code).
//
// Drives the REAL src/server/auth.ts (requestLoginCode / verifyLoginCode / otpStatus) against a
// faithful in-memory fake of login_otps + the DB-backed rate limiter, plus the pure code-shaping in
// src/server/otp-code.ts. A FAILING test = a real auth-code vulnerability.
//
// Attacks covered:
//   D1  Brute-force: verify is attempt-capped per email (8 tries / 10 min) — the 9th is rate-limited.
//   D2  Request flooding: code issuance is capped (5 / 15 min) so an attacker can't email-bomb / churn.
//   D3  Enumeration: requesting a code for a non-whitelisted email is indistinguishable from a real one
//       (same ok + ttl + rid), and otpStatus never reveals whether an email exists.
//   D4  Unicode / whitespace smuggling: no punctuation, spacing, or unicode digit look-alike can slip a
//       mis-sized code past the strict length gate into the hashed lookup.
//   D5  Reuse: a consumed code cannot be verified a second time (atomic single-consume).
//   D6  A guessed code for a real email (that was never issued) does not verify.
import { describe, it, expect, vi, beforeEach } from "vitest";

process.env.NODE_ENV = "test";
process.env.SESSION_SECRET = "redteam-otp-secret";

import { normalizeOtpCode, isWellFormedOtp, OTP_LEN } from "../src/server/otp-code";

// ---- Faithful fake of login_otps + the rate limiters auth.ts uses --------------------------------
interface OtpRow { code_hash: string; email: string; created_at: number; expires_at: number; used_at: number | null; rid: string }
const otps: OtpRow[] = [];
const reqHits = new Map<string, number[]>();
const verHits = new Map<string, number[]>();
const WL = "insider@pyraxchain.com"; // the only whitelisted user
const user = { id: "u_ins", email: WL, display_name: "Insider", is_superuser: false, permissions: [] as string[] };

function fakeQuery(sql: string, params: any[] = []): { rows: any[]; rowCount: number } {
  const s = sql.replace(/\s+/g, " ").trim();
  if (s.startsWith("INSERT INTO login_otps")) {
    const [code_hash, email, created_at, expires_at, rid] = params;
    if (!otps.find((o) => o.code_hash === code_hash)) otps.push({ code_hash, email, created_at, expires_at, used_at: null, rid });
    return { rows: [], rowCount: 1 };
  }
  if (s.startsWith("UPDATE login_otps SET used_at")) {
    const [now, code_hash, email] = params;
    const row = otps.find((o) => o.code_hash === code_hash && o.email === email && o.used_at === null && o.expires_at > now);
    if (!row) return { rows: [], rowCount: 0 };
    row.used_at = now;
    return { rows: [{ email: row.email }], rowCount: 1 };
  }
  if (s.startsWith("SELECT used_at, expires_at FROM login_otps WHERE rid")) {
    const row = otps.find((o) => o.rid === params[0]);
    return { rows: row ? [{ used_at: row.used_at, expires_at: row.expires_at }] : [], rowCount: row ? 1 : 0 };
  }
  throw new Error("unexpected SQL in otp fake: " + s);
}

let lastCode = "";
vi.mock("../src/server/db", () => {
  const limiter = (map: Map<string, number[]>, key: string, max: number, windowMs: number) => {
    const now = Date.now();
    const arr = (map.get(key) || []).filter((t) => now - t < windowMs);
    if (arr.length >= max) { map.set(key, arr); return false; }
    arr.push(now); map.set(key, arr); return true;
  };
  return {
    db: () => ({ query: (sql: string, params?: any[]) => Promise.resolve(fakeQuery(sql, params)) }),
    init: () => Promise.resolve(),
    rateAllow: (bucket: string, key: string, max: number, windowMs: number) =>
      Promise.resolve(limiter(bucket === "otp_request" ? reqHits : verHits, key, max, windowMs)),
    userByEmail: (email: string) => Promise.resolve(email.toLowerCase() === user.email ? { ...user } : null),
    userById: (id: string) => Promise.resolve(id === user.id ? { ...user } : null),
    touchLogin: () => Promise.resolve(),
  };
});
vi.mock("../src/server/email", () => ({ sendOtp: () => Promise.resolve(true) }));
vi.mock("../src/server/crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/server/crypto")>();
  return { ...actual, randomOtp: (n?: number) => { lastCode = actual.randomOtp(n); return lastCode; } };
});

const auth = await import("../src/server/auth");

beforeEach(() => { otps.length = 0; reqHits.clear(); verHits.clear(); lastCode = ""; });

describe("OTP pure-shaping smuggling (D4)", () => {
  it("D4: no whitespace / punctuation / unicode-digit look-alike smuggles a mis-sized code past the gate", () => {
    const valid = "1".repeat(OTP_LEN);
    expect(isWellFormedOtp(normalizeOtpCode(valid))).toBe(true); // control

    const hostile = [
      " 1 2 3 4 5 6 7 8 ",            // 8 digits with spaces → 8 after strip → rejected
      "123-456-78",                    // 8 digits → rejected
      "​1​2​3456789",   // zero-width chars around a 9-digit body → still 9? verify below
      "١٢٣٤٥٦٧٨٩",                     // arabic-indic digits (\D under ASCII regex) → stripped → 0 → rejected
      "１２３４５６７８９",                // fullwidth digits → stripped by \D → rejected
      "12345678",                      // 8 ASCII digits → rejected
      "1234567890",                    // 10 ASCII digits → rejected
      "12345678a",                     // letter → stripped → 8 → rejected
      "",                              // empty
      "\n\t 123456789 \r",             // 9 digits wrapped in whitespace → normalizes to 9 → ACCEPTED (control)
    ];
    for (const h of hostile) {
      const norm = normalizeOtpCode(h);
      // The gate accepts ONLY exactly-9 ASCII digits after stripping non-digits.
      expect(isWellFormedOtp(norm)).toBe(norm.length === OTP_LEN && /^[0-9]{9}$/.test(norm));
      // And normalization is total + digit-only.
      expect(/^[0-9]*$/.test(norm)).toBe(true);
    }
    // Explicitly: the arabic-indic + fullwidth inputs collapse to a rejected (non-9) length.
    expect(isWellFormedOtp(normalizeOtpCode("١٢٣٤٥٦٧٨٩"))).toBe(false);
    expect(isWellFormedOtp(normalizeOtpCode("１２３４５６７８９"))).toBe(false);
  });
});

describe("OTP verify — brute-force + reuse (D1/D5/D6)", () => {
  async function issueCode(): Promise<string> {
    await auth.requestLoginCode(WL);
    return lastCode; // captured from the spied randomOtp
  }

  it("D1: verify is attempt-capped per email — the 9th wrong try is rate-limited, not evaluated", async () => {
    await issueCode();
    // 8 allowed wrong guesses (VER_MAX = 8), all "invalid".
    for (let i = 0; i < 8; i++) {
      const r = await auth.verifyLoginCode(WL, String(100000000 + i)); // 9-digit wrong codes
      expect(r).toEqual({ ok: false, reason: "invalid" });
    }
    // The 9th attempt is rejected by the limiter BEFORE any code comparison.
    const r9 = await auth.verifyLoginCode(WL, "999999999");
    expect(r9).toEqual({ ok: false, reason: "rate" });
    // Even the CORRECT code is now blocked until the window frees — brute force can't outrun the cap.
    const rCorrect = await auth.verifyLoginCode(WL, lastCode);
    expect(rCorrect.ok).toBe(false);
    if (!rCorrect.ok) expect(rCorrect.reason).toBe("rate");
  });

  it("D5: a consumed code cannot be verified twice (atomic single-consume)", async () => {
    const code = await issueCode();
    const first = await auth.verifyLoginCode(WL, code);
    expect(first.ok).toBe(true);
    const replay = await auth.verifyLoginCode(WL, code);
    expect(replay).toEqual({ ok: false, reason: "invalid" });
  });

  it("D6: a well-formed but never-issued code for a real email does not verify", async () => {
    await issueCode(); // a real code exists, but the attacker guesses a DIFFERENT 9-digit value
    const guess = lastCode === "000000000" ? "111111111" : "000000000";
    const r = await auth.verifyLoginCode(WL, guess);
    expect(r).toEqual({ ok: false, reason: "invalid" });
  });
});

describe("OTP request — flooding + enumeration (D2/D3)", () => {
  it("D2: code issuance is capped per email (5 / window); the 6th request is rate-limited", async () => {
    for (let i = 0; i < 5; i++) expect((await auth.requestLoginCode(WL)).ok).toBe(true);
    const sixth = await auth.requestLoginCode(WL);
    expect(sixth).toEqual({ ok: false, reason: "rate" });
  });

  it("D3: a non-whitelisted email is indistinguishable from a real one (no user enumeration)", async () => {
    const real = await auth.requestLoginCode(WL);
    const fake = await auth.requestLoginCode("stranger@nowhere.test");
    expect(real.ok).toBe(true);
    expect(fake.ok).toBe(true);
    if (real.ok && fake.ok) {
      // Same response SHAPE: both return ok + a ttl + a random rid. No code was actually stored for the
      // stranger, but the caller can't tell (the rid is a throwaway that reads as "pending").
      expect(fake.ttl).toBe(real.ttl);
      expect(typeof fake.rid).toBe("string");
      expect(fake.rid.length).toBeGreaterThan(20);
      // The stranger's rid resolves to "pending" (never "used"/"expired"), leaking nothing.
      expect(await auth.otpStatus(fake.rid)).toBe("pending");
    }
    // A totally unknown rid also reads as pending — a scanner can't probe validity.
    expect(await auth.otpStatus("some-random-unknown-rid")).toBe("pending");
  });
});
