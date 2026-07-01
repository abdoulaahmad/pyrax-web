// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Auth for the internal / observer API (Sentinel → devnet-portal, server-to-server). These endpoints
// are NOT tester/session gated and are NEVER exposed to the browser. They authenticate with a bearer
// token equal to NOVA_AGENT_SECRET — the same server-operated secret the outbound sentinel.ts uses,
// but INBOUND here.
//
// Rules (docs §7):
//   • Constant-time compare (crypto.timingSafeEqual) — no early-exit char-by-char leak.
//   • FAIL-CLOSED: if the secret is unset OR the presented token doesn't match, return 401. An unset
//     secret means the observer surface is simply OFF (never "open").
//   • The value is read straight from process.env each call (not frozen at import) so it can't be
//     shadowed by a stale module-load snapshot, and is length-guarded before the timing-safe compare.
import crypto from "node:crypto";
import { json } from "./http";

/** Extract the bearer token from an Authorization header (case-insensitive scheme). "" if absent. */
export function bearerToken(request: Request): string {
  const auth = request.headers.get("authorization") || "";
  return /^bearer /i.test(auth) ? auth.slice(7).trim() : "";
}

/** Constant-time equality that also fails closed when either side is empty. Compares SHA-256 digests so
 *  the timing-safe compare always sees equal-length buffers (prevents a length-based side channel and
 *  works even if the two strings differ in length). */
export function secretsMatch(presented: string, expected: string): boolean {
  if (!presented || !expected) return false;
  const a = crypto.createHash("sha256").update(presented).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

/** True when the request carries the correct NOVA_AGENT_SECRET bearer. Fail-closed when the secret is
 *  unset (the observer surface is off) or the token is wrong. */
export function isInternalAuthorized(request: Request, env: NodeJS.ProcessEnv = process.env): boolean {
  const expected = env.NOVA_AGENT_SECRET || "";
  if (!expected) return false; // fail-closed: no secret configured ⇒ surface is off, never open
  return secretsMatch(bearerToken(request), expected);
}

/** Guard for internal routes: returns a 401 `Response` to return immediately when unauthorized, or null
 *  to proceed. The 401 body is deliberately generic (no hint whether the secret is unset vs. mismatched).
 *    const unauth = requireInternal(request); if (unauth) return unauth;  */
export function requireInternal(request: Request, env: NodeJS.ProcessEnv = process.env): Response | null {
  return isInternalAuthorized(request, env) ? null : json({ ok: false, error: "Unauthorized." }, 401);
}
