// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// team-pyrax — passwordless (magic-link) authentication, sessions, RBAC and CSRF.
//
// Flow: request a link (email, @<domain>, whitelisted) → a single-use, 15-min token
// is mailed → clicking it starts a DB-backed session in an HttpOnly cookie. Tokens
// and session ids are stored only as HMACs; the raw values live solely in the email
// link / the cookie. All comparisons are constant-time.

import crypto from "node:crypto";
import { Users, Tokens, Sessions } from "./db.js";
import {
  EMAIL_DOMAIN,
  MAGIC_TTL_MS,
  MAGIC_MAX_PER_WINDOW,
  SESSION_TTL_MS,
  COOKIE_NAME,
  SESSION_SECRET,
  PUBLIC_URL,
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
export function issueMagicToken(rawEmail) {
  const email = isValidEmail(rawEmail);
  if (!email) return null;
  if (!Users.byEmail(email)) return null; // not whitelisted
  if (Tokens.recentCountForEmail(email, MAGIC_TTL_MS) >= MAGIC_MAX_PER_WINDOW) return null;
  const raw = randToken();
  Tokens.create(hmac(raw), email, now() + MAGIC_TTL_MS);
  return { raw, email };
}

export const magicLinkUrl = (raw) => `${PUBLIC_URL}/auth/callback?token=${encodeURIComponent(raw)}`;

/** Consume a magic token and return the matching user, or null. Single-use + TTL
 *  are enforced atomically in the store. */
export function consumeMagicToken(raw) {
  if (typeof raw !== "string" || raw.length < 16 || raw.length > 256) return null;
  const row = Tokens.consume(hmac(raw));
  if (!row) return null;
  return Users.byEmail(row.email); // null if de-whitelisted between request and click
}

// --- sessions ---------------------------------------------------------------

export function startSession(userId) {
  const raw = randToken();
  Sessions.create(hmac(raw), userId, now() + SESSION_TTL_MS);
  Users.touchLogin(userId);
  return raw;
}

export function sessionUser(rawSid) {
  if (typeof rawSid !== "string" || !rawSid) return null;
  const row = Sessions.get(hmac(rawSid));
  if (!row) return null;
  return Users.byId(row.user_id);
}

export function endSession(rawSid) {
  if (typeof rawSid === "string" && rawSid) Sessions.destroy(hmac(rawSid));
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
