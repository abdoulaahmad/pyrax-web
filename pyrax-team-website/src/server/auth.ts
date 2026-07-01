// SPDX-License-Identifier: LicenseRef-Proprietary
//
// OTP login + sessions. Codes + session ids are stored only as keyed HMACs (never plaintext),
// rate-limited and attempt-capped, compared in constant time. Sessions last 7 DAYS (sliding on
// activity) or until logout — after that, a fresh sign-in is required.
import { db, init, rateAllow, userByEmail, userById, touchLogin, type UserRow } from "./db";
import { hmac, randomOtp, randomSessionId, timingSafeEqual, newUserId } from "./crypto";
import { sendOtp } from "./email";

const OTP_LEN = 9;
const OTP_TTL_MS = 10 * 60_000;          // 10 minutes
export const OTP_TTL_S = OTP_TTL_MS / 1000;
const SESSION_TTL_MS = 7 * 24 * 60 * 60_000; // 7 days
export const SESSION_COOKIE = "tp_session";

/** Live state of a sign-in code, looked up by its opaque watch-token (rid). Lets the sign-in
 *  page tick down + auto-flip to "used"/"expired" without ever leaking which emails exist:
 *  the rid is 256-bit random, so an unknown rid is indistinguishable from a still-pending one. */
export type OtpState = "pending" | "used" | "expired";

// DB-backed limiters (survive redeploys + work across replicas, unlike per-process Maps).
// Request: 5 codes / 15 min / email. Verify: 8 tries / 10 min / email.
const REQ_MAX = 5, REQ_WINDOW_MS = 15 * 60_000;
const VER_MAX = 8, VER_WINDOW_MS = 10 * 60_000;

/** Issue a sign-in code to a whitelisted email. Anti-enumeration: always reports success — and
 *  always returns a watch-token (rid) + ttl — so a caller can't probe which addresses are on the
 *  team. Only actually stores a code + emails for whitelisted users; for everyone else the rid is
 *  a throwaway that the status endpoint treats as "pending" until the page's own timer expires. */
export async function requestLoginCode(email: string): Promise<{ ok: true; ttl: number; rid: string } | { ok: false; reason: "rate" }> {
  const e = email.trim().toLowerCase();
  await init();
  if (!(await rateAllow("otp_request", e, REQ_MAX, REQ_WINDOW_MS))) return { ok: false, reason: "rate" };
  const rid = randomSessionId();
  const user = await userByEmail(e);
  if (user) {
    const code = randomOtp(OTP_LEN);
    const now = Date.now();
    const expiresAt = now + OTP_TTL_MS;
    await db().query(
      `INSERT INTO login_otps (code_hash, email, created_at, expires_at, rid) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (code_hash) DO NOTHING`,
      [hmac(`${e}:${code}`), e, now, expiresAt, rid],
    );
    void sendOtp(e, code, expiresAt); // fire-and-forget; a slow mailer must not delay the response
  }
  return { ok: true, ttl: OTP_TTL_S, rid };
}

/** Resolve a watch-token to its code's live state. Unknown / throwaway rids read as "pending"
 *  (the page's local countdown still expires it), so this never reveals whether an email exists. */
export async function otpStatus(rid: string): Promise<OtpState> {
  const id = (rid || "").trim();
  if (!id) return "pending";
  await init();
  const r = await db().query("SELECT used_at, expires_at FROM login_otps WHERE rid = $1", [id]);
  const row = r.rows[0];
  if (!row) return "pending";
  if (row.used_at != null) return "used";
  if (Number(row.expires_at) <= Date.now()) return "expired";
  return "pending";
}

/** Verify a code. On success consumes it, marks the user active, and returns them. */
export async function verifyLoginCode(email: string, code: string): Promise<{ ok: true; user: UserRow } | { ok: false; reason: "rate" | "invalid" }> {
  const e = email.trim().toLowerCase();
  const c = (code || "").replace(/\D/g, "");
  await init();
  if (!(await rateAllow("otp_verify", e, VER_MAX, VER_WINDOW_MS))) return { ok: false, reason: "rate" };
  if (c.length !== OTP_LEN) return { ok: false, reason: "invalid" };
  const hash = hmac(`${e}:${c}`);
  const now = Date.now();
  // Atomically consume: only if it exists, matches the email, is unused and unexpired.
  const r = await db().query(
    `UPDATE login_otps SET used_at = $1
     WHERE code_hash = $2 AND email = $3 AND used_at IS NULL AND expires_at > $1
     RETURNING email`,
    [now, hash, e],
  );
  if (r.rowCount === 0) return { ok: false, reason: "invalid" };
  // constant-time re-affirm (defense-in-depth; the row match already proves equality)
  if (!timingSafeEqual(hash, r.rows[0] ? hash : "")) return { ok: false, reason: "invalid" };
  const user = await userByEmail(e);
  if (!user) return { ok: false, reason: "invalid" };
  await touchLogin(user.id);
  return { ok: true, user };
}

/** Create a 7-day session; returns the RAW session id to set in the cookie (only its HMAC is stored). */
export async function createSession(userId: string): Promise<string> {
  const sid = randomSessionId();
  const now = Date.now();
  await db().query(
    "INSERT INTO sessions (sid_hash, user_id, created_at, expires_at, last_seen) VALUES ($1,$2,$3,$4,$3)",
    [hmac(sid), userId, now, now + SESSION_TTL_MS],
  );
  return sid;
}

/** Resolve a session cookie to its user, sliding the 7-day window forward. Null if invalid/expired. */
export async function sessionUser(sid: string | undefined): Promise<UserRow | null> {
  if (!sid) return null;
  await init();
  const now = Date.now();
  const r = await db().query(
    `UPDATE sessions SET last_seen = $1, expires_at = $2 WHERE sid_hash = $3 AND expires_at > $1 RETURNING user_id`,
    [now, now + SESSION_TTL_MS, hmac(sid)],
  );
  if (r.rowCount === 0) return null;
  return userById(r.rows[0].user_id);
}

export async function destroySession(sid: string | undefined): Promise<void> {
  if (!sid) return;
  await db().query("DELETE FROM sessions WHERE sid_hash = $1", [hmac(sid)]);
}

/** Cookie options: httpOnly, SameSite=Lax, Secure in prod, 7-day max-age, path=/. */
export function cookieOptions(maxAgeMs = SESSION_TTL_MS) {
  return { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: Math.floor(maxAgeMs / 1000) };
}

export { newUserId };
