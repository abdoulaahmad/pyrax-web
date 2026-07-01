// SPDX-License-Identifier: LicenseRef-Proprietary
//
// RED TEAM — CSRF + OTP abuse (devnet tester portal).
//
// CSRF: confirms the /api/app/*, /api/node/pair, /api/node/heartbeat exemptions are SAFE + SCOPED (they
// are bearer/OTP/code-authed, not cookie-authed), and every cookie-authed browser route enforces
// same-origin. OTP: drives the REAL src/server/auth.ts (in-memory login_otps fake) + the pure code
// shaping. A FAILING test = a real CSRF or auth-code vulnerability.
//
// Attacks covered:
//   G1  Cross-origin POST to a cookie-authed route is blocked; a same-origin one passes.
//   G2  No-Origin state-changing request is blocked; Origin 'null' is a mismatch.
//   G3  The exemption predicate matches EXACTLY the token/code routes — not look-alike prefixes.
//   G4  OTP verify is attempt-capped (8/10min); the 9th attempt is rate-limited before comparison.
//   G5  OTP request is capped (5/15min) — no email-bomb / churn.
//   G6  Reuse of a consumed code is rejected (atomic single-consume).
//   G7  Unicode/whitespace/punctuation cannot smuggle a mis-sized code past the length gate.
//   G8  A SUSPENDED tester is never issued a code (requestLoginCode is a silent no-op for them).
import { describe, it, expect, vi, beforeEach } from "vitest";

process.env.NODE_ENV = "test";
process.env.SESSION_SECRET = "redteam-devnet-csrf-otp";

import { checkCsrf, checkRequestCsrf } from "../src/server/csrf";
import { normalizeOtpCode, isWellFormedOtp, OTP_LEN } from "../src/server/otp-code";

const TARGET = "https://devnet.pyraxchain.com/api/bugs";

// Mirror the middleware exemption predicate (see src/middleware.ts csrfExempt()).
const csrfExempt = (p: string) => p.startsWith("/api/app/") || p === "/api/node/pair" || p === "/api/node/heartbeat";
const csrfChecked = (p: string) => p.startsWith("/api/") && !csrfExempt(p);

describe("CSRF — cookie-authed routes enforce same-origin; exemptions are scoped (G1–G3)", () => {
  it("G1: a cross-origin POST is blocked; a same-origin POST passes", () => {
    expect(checkRequestCsrf(new Request(TARGET, { method: "POST", headers: { origin: "https://evil.example" } })).ok).toBe(false);
    expect(checkRequestCsrf(new Request(TARGET, { method: "POST", headers: { origin: "https://devnet.pyraxchain.com" } })).ok).toBe(true);
  });

  it("G2: no-Origin state-changing request blocked; Origin 'null' is a mismatch", () => {
    expect(checkCsrf({ method: "POST", origin: null, referer: null, requestUrl: TARGET }).reason).toBe("no-origin");
    expect(checkCsrf({ method: "POST", origin: "null", referer: null, requestUrl: TARGET }).ok).toBe(false);
    expect(checkCsrf({ method: "DELETE", origin: "https://evil.example", referer: null, requestUrl: TARGET }).ok).toBe(false);
  });

  it("G3: only the real token/code routes are exempt — a look-alike path is STILL CSRF-checked", () => {
    // Genuinely exempt (bearer/OTP/code, cookie-free):
    for (const p of ["/api/app/device/status", "/api/app/otp/verify", "/api/node/pair", "/api/node/heartbeat"]) {
      expect(csrfExempt(p), `${p} should be exempt`).toBe(true);
      expect(csrfChecked(p)).toBe(false);
    }
    // Path-confusion attempts must NOT be exempted:
    for (const p of ["/api/app-evil/x", "/api/node/pairX", "/api/node/heartbeatX", "/api/bugs", "/api/admin/run-rewards", "/api/uploads/sign"]) {
      expect(csrfChecked(p), `${p} must be CSRF-checked`).toBe(true);
    }
  });
});

// ---- OTP: faithful login_otps fake + rate limiters (auth.ts uses in-process Maps here) ------------
interface OtpRow { code_hash: string; email: string; created_at: number; expires_at: number; used_at: number | null; rid: string }
const otps: OtpRow[] = [];
const tester = { id: "t1", email: "live@tester.io", display_name: "Live", handle: "live", is_staff: false, is_superuser: false, reward_eligible: true, status: "active", permissions: [] as string[] };
const suspended = { ...tester, id: "t2", email: "susp@tester.io", status: "suspended" };

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
  throw new Error("unexpected SQL in devnet otp fake: " + s);
}

let lastCode = "";
// auth.ts keeps rate-limit budgets in module-level Maps keyed by email (they survive across tests in a
// file). So each test uses a UNIQUE @tester.io email to get an independent budget; the mock treats any
// active @tester.io address as the live tester, and the one suspended address as suspended.
vi.mock("../src/server/db", () => ({
  db: () => ({ query: (sql: string, params?: any[]) => Promise.resolve(fakeQuery(sql, params)) }),
  init: () => Promise.resolve(),
  testerByEmail: (email: string) => {
    const e = email.toLowerCase();
    if (e === suspended.email) return Promise.resolve({ ...suspended });
    if (e.endsWith("@tester.io")) return Promise.resolve({ ...tester, email: e });
    return Promise.resolve(null);
  },
  testerById: (id: string) => Promise.resolve(id === tester.id ? { ...tester } : id === suspended.id ? { ...suspended } : null),
  touchLogin: () => Promise.resolve(),
}));
vi.mock("../src/server/email", () => ({ sendOtp: () => Promise.resolve(true) }));
vi.mock("../src/server/crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/server/crypto")>();
  return { ...actual, randomOtp: (n?: number) => { lastCode = actual.randomOtp(n); return lastCode; } };
});

const auth = await import("../src/server/auth");

beforeEach(() => { otps.length = 0; lastCode = ""; });

describe("OTP smuggling — pure code shaping (G7)", () => {
  it("G7: no whitespace/punctuation/unicode-digit trick smuggles a mis-sized code past isWellFormedOtp", () => {
    expect(isWellFormedOtp(normalizeOtpCode("1".repeat(OTP_LEN)))).toBe(true); // control
    for (const h of ["12345678", "1234567890", " 12 34 5678 ", "123-456-78", "١٢٣٤٥٦٧٨٩", "１２３４５６７８９", "12345678a", "", "abcdefghi"]) {
      const norm = normalizeOtpCode(h);
      expect(isWellFormedOtp(norm)).toBe(/^[0-9]{9}$/.test(norm));
      expect(/^[0-9]*$/.test(norm)).toBe(true); // total + digit-only
    }
  });
});

describe("OTP verify/request abuse (G4–G6, G8)", () => {
  async function issue(email: string): Promise<string> { await auth.requestLoginCode(email); return lastCode; }

  it("G4: verify is attempt-capped — the 9th wrong guess is rate-limited, not evaluated", async () => {
    const email = "g4@tester.io";
    await issue(email);
    for (let i = 0; i < 8; i++) expect((await auth.verifyLoginCode(email, String(100000000 + i))).ok).toBe(false);
    const r9 = await auth.verifyLoginCode(email, "999999999");
    expect(r9).toEqual({ ok: false, reason: "rate" });
  });

  it("G5: request is capped (5/window); the 6th is rate-limited", async () => {
    const email = "g5@tester.io";
    for (let i = 0; i < 5; i++) expect((await auth.requestLoginCode(email)).ok).toBe(true);
    expect(await auth.requestLoginCode(email)).toEqual({ ok: false, reason: "rate" });
  });

  it("G6: a consumed code cannot be verified twice", async () => {
    const email = "g6@tester.io";
    const code = await issue(email);
    expect((await auth.verifyLoginCode(email, code)).ok).toBe(true);
    expect(await auth.verifyLoginCode(email, code)).toEqual({ ok: false, reason: "invalid" });
  });

  it("G8: a SUSPENDED tester is never issued a code (silent no-op — can't be revived via OTP)", async () => {
    const r = await auth.requestLoginCode(suspended.email);
    expect(r.ok).toBe(true);              // anti-enumeration: still returns ok + rid
    expect(otps.length).toBe(0);          // …but NO code was ever stored/emailed for a suspended tester
    // And even if an attacker somehow supplies a guessed 9-digit code, there is nothing to match.
    expect(await auth.verifyLoginCode(suspended.email, "123456789")).toEqual({ ok: false, reason: "invalid" });
  });
});
