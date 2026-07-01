// SPDX-License-Identifier: LicenseRef-Proprietary
//
// OTP single-use + rate-limit semantics, driven through the REAL src/server/auth.ts logic with a
// faithful in-memory fake of the few DB calls it makes. The fake reproduces the production contract
// that matters for security: the consume is an atomic `UPDATE ... WHERE used_at IS NULL AND
// expires_at > now` — so a code verifies at most once, and never after expiry.
import { describe, it, expect, vi, beforeEach } from "vitest";

process.env.NODE_ENV = "test";
process.env.SESSION_SECRET = "otp-test-secret";

// ---- In-memory fake of the login_otps table + the db.ts surface auth.ts depends on ----
interface OtpRow { code_hash: string; email: string; created_at: number; expires_at: number; used_at: number | null; rid: string }
const otps: OtpRow[] = [];
const reqHits = new Map<string, number[]>();
const verHits = new Map<string, number[]>();

const user = { id: "u_ada", email: "ada@pyraxchain.com", display_name: "Ada", is_superuser: false, permissions: [] as string[] };

// A minimal SQL router that understands exactly the statements auth.ts issues against login_otps.
function fakeQuery(sql: string, params: any[] = []): { rows: any[]; rowCount: number } {
  const s = sql.replace(/\s+/g, " ").trim();

  // INSERT a freshly issued code.
  if (s.startsWith("INSERT INTO login_otps")) {
    const [code_hash, email, created_at, expires_at, rid] = params;
    if (!otps.find((o) => o.code_hash === code_hash)) {
      otps.push({ code_hash, email, created_at, expires_at, used_at: null, rid });
    }
    return { rows: [], rowCount: 1 };
  }

  // Atomic consume: UPDATE login_otps SET used_at = $1 WHERE code_hash=$2 AND email=$3 AND used_at IS NULL AND expires_at > $1
  if (s.startsWith("UPDATE login_otps SET used_at")) {
    const [now, code_hash, email] = params;
    const row = otps.find((o) => o.code_hash === code_hash && o.email === email && o.used_at === null && o.expires_at > now);
    if (!row) return { rows: [], rowCount: 0 };
    row.used_at = now; // single-consume: subsequent attempts no longer match
    return { rows: [{ email: row.email }], rowCount: 1 };
  }

  // otpStatus lookup by rid
  if (s.startsWith("SELECT used_at, expires_at FROM login_otps WHERE rid")) {
    const row = otps.find((o) => o.rid === params[0]);
    return { rows: row ? [{ used_at: row.used_at, expires_at: row.expires_at }] : [], rowCount: row ? 1 : 0 };
  }

  throw new Error("unexpected SQL in fake: " + s);
}

vi.mock("../src/server/db", () => {
  // A simple in-process rate limiter mirroring the DB-backed contract (sliding window).
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

// Don't actually send email.
vi.mock("../src/server/email", () => ({ sendOtp: () => Promise.resolve(true) }));

// Capture the issued code by spying on the OTP generator (auth.ts calls randomOtp()).
let lastCode = "";
vi.mock("../src/server/crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/server/crypto")>();
  return {
    ...actual,
    randomOtp: (n?: number) => {
      lastCode = actual.randomOtp(n);
      return lastCode;
    },
  };
});

const auth = await import("../src/server/auth");

beforeEach(() => {
  otps.length = 0;
  reqHits.clear();
  verHits.clear();
  lastCode = "";
});

describe("OTP single-use semantics", () => {
  it("issues a code, verifies it once, and refuses a second use", async () => {
    const req = await auth.requestLoginCode("ada@pyraxchain.com");
    expect(req.ok).toBe(true);
    expect(lastCode).toMatch(/^\d{9}$/);

    const ok = await auth.verifyLoginCode("ada@pyraxchain.com", lastCode);
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.user.id).toBe("u_ada");

    // Reuse must fail — the code was atomically consumed.
    const again = await auth.verifyLoginCode("ada@pyraxchain.com", lastCode);
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.reason).toBe("invalid");
  });

  it("rejects a wrong code without consuming the real one", async () => {
    await auth.requestLoginCode("ada@pyraxchain.com");
    const wrong = await auth.verifyLoginCode("ada@pyraxchain.com", "000000000");
    expect(wrong.ok).toBe(false);
    // The correct code still works afterward.
    const right = await auth.verifyLoginCode("ada@pyraxchain.com", lastCode);
    expect(right.ok).toBe(true);
  });

  it("rejects an expired code", async () => {
    await auth.requestLoginCode("ada@pyraxchain.com");
    // Force expiry by rewinding the stored row's expires_at into the past.
    for (const o of otps) o.expires_at = Date.now() - 1;
    const r = await auth.verifyLoginCode("ada@pyraxchain.com", lastCode);
    expect(r.ok).toBe(false);
  });

  it("rejects a code bound to a different email (no cross-account use)", async () => {
    await auth.requestLoginCode("ada@pyraxchain.com");
    const r = await auth.verifyLoginCode("someone.else@pyraxchain.com", lastCode);
    expect(r.ok).toBe(false);
  });
});

describe("OTP rate limiting", () => {
  it("blocks after 5 code requests in the window", async () => {
    for (let i = 0; i < 5; i++) expect((await auth.requestLoginCode("ada@pyraxchain.com")).ok).toBe(true);
    const sixth = await auth.requestLoginCode("ada@pyraxchain.com");
    expect(sixth.ok).toBe(false);
    if (!sixth.ok) expect(sixth.reason).toBe("rate");
  });

  it("blocks after 8 verify attempts in the window", async () => {
    await auth.requestLoginCode("ada@pyraxchain.com");
    for (let i = 0; i < 8; i++) await auth.verifyLoginCode("ada@pyraxchain.com", "111111111");
    const ninth = await auth.verifyLoginCode("ada@pyraxchain.com", lastCode);
    expect(ninth.ok).toBe(false);
    if (!ninth.ok) expect(ninth.reason).toBe("rate");
  });
});

describe("anti-enumeration", () => {
  it("returns ok + a watch-token even for a non-whitelisted email (no code stored)", async () => {
    const r = await auth.requestLoginCode("stranger@example.com");
    expect(r.ok).toBe(true);
    if (r.ok) expect(typeof r.rid).toBe("string");
    expect(otps.length).toBe(0); // nothing was stored for an unknown user
  });
});
