// SPDX-License-Identifier: LicenseRef-Proprietary
//
// OTP login + sessions for testers. Codes + session ids are stored only as keyed HMACs. ANY email
// domain may sign in (a tester must already exist — they're created via invite). Session length is
// the tester's own choice, capped at 7 days; the session is ABSOLUTE (no sliding) so "stay logged
// in for N days" means exactly that, then a fresh OTP is required.
import { db, init, testerByEmail, testerById, touchLogin, type TesterRow } from "./db";
import { hmac, randomOtp, randomSessionId, timingSafeEqual } from "./crypto";
import { sendOtp } from "./email";
import { clampSessionDays, MAX_SESSION_DAYS } from "../lib/tester";

const OTP_LEN = 9;
const OTP_TTL_MS = 10 * 60_000;
export const OTP_TTL_S = OTP_TTL_MS / 1000;
export const SESSION_COOKIE = "dv_session";
const DAY = 86_400_000;

const reqBucket = new Map<string, number[]>();
const verBucket = new Map<string, number[]>();
function allow(map: Map<string, number[]>, key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (map.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) { map.set(key, arr); return false; }
  arr.push(now); map.set(key, arr); return true;
}

export type OtpState = "pending" | "used" | "expired";

/** Issue a sign-in code to an existing tester. Anti-enumeration: always returns ok + ttl + rid. */
export async function requestLoginCode(email: string): Promise<{ ok: true; ttl: number; rid: string } | { ok: false; reason: "rate" }> {
  const e = email.trim().toLowerCase();
  if (!allow(reqBucket, e, 5, 15 * 60_000)) return { ok: false, reason: "rate" };
  await init();
  const rid = randomSessionId();
  const tester = await testerByEmail(e);
  if (tester && tester.status !== "suspended") {
    const code = randomOtp(OTP_LEN);
    const now = Date.now();
    await db().query(
      `INSERT INTO login_otps (code_hash,email,created_at,expires_at,rid) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (code_hash) DO NOTHING`,
      [hmac(`${e}:${code}`), e, now, now + OTP_TTL_MS, rid],
    );
    void sendOtp(e, code, now + OTP_TTL_MS);
  }
  return { ok: true, ttl: OTP_TTL_S, rid };
}

export async function otpStatus(rid: string): Promise<OtpState> {
  const idv = (rid || "").trim();
  if (!idv) return "pending";
  await init();
  const r = await db().query("SELECT used_at, expires_at FROM login_otps WHERE rid=$1", [idv]);
  const row = r.rows[0];
  if (!row) return "pending";
  if (row.used_at != null) return "used";
  if (Number(row.expires_at) <= Date.now()) return "expired";
  return "pending";
}

export async function verifyLoginCode(email: string, code: string): Promise<{ ok: true; tester: TesterRow } | { ok: false; reason: "rate" | "invalid" }> {
  const e = email.trim().toLowerCase();
  const c = (code || "").replace(/\D/g, "");
  if (!allow(verBucket, e, 8, 10 * 60_000)) return { ok: false, reason: "rate" };
  if (c.length !== OTP_LEN) return { ok: false, reason: "invalid" };
  await init();
  const hash = hmac(`${e}:${c}`);
  const now = Date.now();
  const r = await db().query(
    `UPDATE login_otps SET used_at=$1 WHERE code_hash=$2 AND email=$3 AND used_at IS NULL AND expires_at > $1 RETURNING email`,
    [now, hash, e],
  );
  if (r.rowCount === 0) return { ok: false, reason: "invalid" };
  if (!timingSafeEqual(hash, r.rows[0] ? hash : "")) return { ok: false, reason: "invalid" };
  const tester = await testerByEmail(e);
  if (!tester) return { ok: false, reason: "invalid" };
  await touchLogin(tester.id);
  return { ok: true, tester };
}

/** Create a session of `days` (≤7). Absolute expiry — no sliding. Returns the raw sid for the cookie. */
export async function createSession(testerId: string, days: number): Promise<{ sid: string; maxAgeMs: number }> {
  const d = clampSessionDays(days);
  const sid = randomSessionId();
  const now = Date.now();
  const maxAgeMs = d * DAY;
  await db().query("INSERT INTO sessions (sid_hash,tester_id,created_at,expires_at,last_seen) VALUES ($1,$2,$3,$4,$3)", [hmac(sid), testerId, now, now + maxAgeMs]);
  return { sid, maxAgeMs };
}
export async function sessionTester(sid: string | undefined): Promise<TesterRow | null> {
  if (!sid) return null;
  await init();
  const now = Date.now();
  const r = await db().query("UPDATE sessions SET last_seen=$1 WHERE sid_hash=$2 AND expires_at > $1 RETURNING tester_id", [now, hmac(sid)]);
  if (r.rowCount === 0) return null;
  return testerById(r.rows[0].tester_id);
}
export async function destroySession(sid: string | undefined): Promise<void> {
  if (!sid) return; await db().query("DELETE FROM sessions WHERE sid_hash=$1", [hmac(sid)]);
}
export function cookieOptions(maxAgeMs = MAX_SESSION_DAYS * DAY) {
  return { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: Math.floor(maxAgeMs / 1000) };
}
