// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// team-pyrax — passwordless (magic-link) authentication, sessions, RBAC and CSRF.
//
// Flow: request a link (email, @<domain>, whitelisted) → a single-use, 15-min token
// is mailed → clicking it starts a DB-backed session in an HttpOnly cookie. Tokens
// and session ids are stored only as HMACs; the raw values live solely in the email
// link / the cookie. All comparisons are constant-time.

import crypto from "node:crypto";
import { Users, Tokens, Sessions, EmberOtps } from "./db.js";
import {
  EMAIL_DOMAIN,
  MAGIC_TTL_MS,
  MAGIC_MAX_PER_WINDOW,
  SESSION_TTL_MS,
  COOKIE_NAME,
  SESSION_SECRET,
  PUBLIC_URL,
  EMBER_OTP_TTL_MS,
  EMBER_OTP_MAX_PER_WINDOW,
  EMBER_OTP_LENGTH,
  EMBER_OTP_ALPHABET,
  ALL_APP_ROLES,
} from "./config.js";

const now = () => Date.now();
const hmac = (s) => crypto.createHmac("sha256", SESSION_SECRET).update(s).digest("hex");
const randToken = () => crypto.randomBytes(32).toString("base64url");

function constEq(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

// --- email validation -------------------------------------------------------

/** Normalise + validate an address: must be well-formed AND on the single allowed
 *  domain. Returns the lowercased email, or null. */
export function isValidEmail(rawEmail) {
  const e = String(rawEmail ?? "").trim().toLowerCase();
  if (e.length < 3 || e.length > 254) return null;
  if (!e.endsWith("@" + EMAIL_DOMAIN)) return null;
  if (!/^[a-z0-9](?:[a-z0-9._%+-]{0,62}[a-z0-9])?@[a-z0-9.-]+\.[a-z]{2,}$/.test(e)) return null;
  return e;
}

// --- magic link -------------------------------------------------------------

/** Mint a sign-in token for a whitelisted address. Returns { raw, email } to mail,
 *  or null if the address is invalid, not whitelisted, or over the rate cap. The
 *  HTTP layer MUST respond identically whether this returns null or a token, so an
 *  attacker can't probe which addresses are whitelisted. */
export async function issueMagicToken(rawEmail) {
  const email = isValidEmail(rawEmail);
  if (!email) return null;
  if (!(await Users.byEmail(email))) return null; // not whitelisted
  if ((await Tokens.recentCountForEmail(email, MAGIC_TTL_MS)) >= MAGIC_MAX_PER_WINDOW) return null;
  const raw = randToken();
  await Tokens.create(hmac(raw), email, now() + MAGIC_TTL_MS);
  return { raw, email };
}

export const magicLinkUrl = (raw) => `${PUBLIC_URL}/auth/callback?token=${encodeURIComponent(raw)}`;

/** Consume a magic token and return the matching user, or null. Single-use + TTL
 *  are enforced atomically in the store. */
export async function consumeMagicToken(raw) {
  if (typeof raw !== "string" || raw.length < 16 || raw.length > 256) return null;
  const row = await Tokens.consume(hmac(raw));
  if (!row) return null;
  return Users.byEmail(row.email); // null if de-whitelisted between request and click
}

// --- Ember admin OTP --------------------------------------------------------
// A teammate unlocks the Ember desktop app's admin area with a single-use code we
// mail. The code is stored only as an HMAC bound to the email; only App-Role
// holders (or the superuser) can get one. Verification returns the granted App
// Roles, so Ember loads ONLY the admin tabs the teammate is allowed.

/** A cryptographically-random OTP. The 32-char alphabet divides 256 evenly, so a
 *  single random byte per char maps with NO modulo bias. */
function randOtp() {
  const bytes = crypto.randomBytes(EMBER_OTP_LENGTH);
  let out = "";
  for (let i = 0; i < EMBER_OTP_LENGTH; i++) out += EMBER_OTP_ALPHABET[bytes[i] % EMBER_OTP_ALPHABET.length];
  return out;
}

const otpHash = (code, email) => hmac("ember-otp:" + code + ":" + email);

/** Issue an Ember admin OTP for a whitelisted user who holds at least one App Role
 *  (superuser implicitly qualifies). Returns { code, email } to mail, or null. The
 *  HTTP layer MUST respond identically whether or not this returns a code. */
export async function issueEmberOtp(rawEmail) {
  const email = isValidEmail(rawEmail);
  if (!email) return null;
  const user = await Users.byEmail(email);
  if (!user) return null; // not whitelisted
  if (!user.isSuperuser && !user.roles.some((r) => ALL_APP_ROLES.includes(r))) return null; // no Ember admin access
  if ((await EmberOtps.recentCountForEmail(email, EMBER_OTP_TTL_MS)) >= EMBER_OTP_MAX_PER_WINDOW) return null;
  const code = randOtp();
  await EmberOtps.create(otpHash(code, email), email, now() + EMBER_OTP_TTL_MS);
  return { code, email };
}

/** Verify an Ember admin OTP. Returns { email, appRoles } on success (superuser ⇒
 *  every App Role), else null. Single-use + TTL enforced atomically in the store. */
export async function verifyEmberOtp(rawEmail, rawCode) {
  const email = isValidEmail(rawEmail);
  if (!email) return null;
  const code = String(rawCode ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{4,12}$/.test(code)) return null;
  const row = await EmberOtps.consume(otpHash(code, email), email);
  if (!row) return null;
  const user = await Users.byEmail(email); // null if de-whitelisted between request + verify
  if (!user) return null;
  const appRoles = user.isSuperuser ? [...ALL_APP_ROLES] : user.roles.filter((r) => ALL_APP_ROLES.includes(r));
  return { email, appRoles };
}

// --- sessions ---------------------------------------------------------------

export async function startSession(userId) {
  const raw = randToken();
  await Sessions.create(hmac(raw), userId, now() + SESSION_TTL_MS);
  await Users.touchLogin(userId);
  return raw;
}

export async function sessionUser(rawSid) {
  if (typeof rawSid !== "string" || !rawSid) return null;
  const row = await Sessions.get(hmac(rawSid));
  if (!row) return null;
  return Users.byId(row.user_id);
}

export async function endSession(rawSid) {
  if (typeof rawSid === "string" && rawSid) await Sessions.destroy(hmac(rawSid));
}

// --- RBAC -------------------------------------------------------------------

/** A superuser implicitly holds every role. */
export function hasRole(user, role) {
  return !!user && (user.isSuperuser || user.roles.includes(role));
}

// --- CSRF (double-submit; token = HMAC(secret, "csrf:" + raw session id)) ----
// Bound to the session, so it's stable for the SPA to read from /api/me and echo
// in X-CSRF-Token on every mutation. Combined with SameSite=Lax + an Origin check,
// this blocks cross-site state change.

export const csrfToken = (rawSid) => hmac("csrf:" + rawSid);
export const csrfOk = (rawSid, presented) =>
  typeof presented === "string" && !!rawSid && constEq(csrfToken(rawSid), presented);

// --- cookies ----------------------------------------------------------------

export function parseCookies(req) {
  const out = {};
  const h = req.headers.cookie;
  if (typeof h === "string") {
    for (const part of h.split(";")) {
      const i = part.indexOf("=");
      if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
    }
  }
  return out;
}

export const rawSidFromReq = (req) => parseCookies(req)[COOKIE_NAME] ?? "";

const SECURE = PUBLIC_URL.startsWith("https://");

export function sessionCookie(raw, maxAgeMs = SESSION_TTL_MS) {
  const a = [`${COOKIE_NAME}=${raw}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${Math.floor(maxAgeMs / 1000)}`];
  if (SECURE) a.push("Secure");
  return a.join("; ");
}

export function clearCookie() {
  const a = [`${COOKIE_NAME}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (SECURE) a.push("Secure");
  return a.join("; ");
}
