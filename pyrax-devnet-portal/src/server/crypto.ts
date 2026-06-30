// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Crypto helpers for the OTP + session layer. OTP codes and session IDs are NEVER stored in the
// clear — only their keyed HMAC-SHA256 is persisted, so a database read can't reveal a live code
// or hijack a session. Comparisons are constant-time.
import crypto from "node:crypto";

const SECRET = process.env.SESSION_SECRET || "";
if (!SECRET && process.env.NODE_ENV === "production") {
  throw new Error("SESSION_SECRET is required in production.");
}
const KEY = SECRET || "dev-only-insecure-secret";

/** Keyed HMAC-SHA256, hex. Used to store OTP codes + session ids as non-reversible digests. */
export function hmac(value: string): string {
  return crypto.createHmac("sha256", KEY).update(value).digest("hex");
}

/** A cryptographically-random session id (256-bit, base64url). */
export function randomSessionId(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/** A cryptographically-random numeric OTP of `n` digits (default 9), uniformly distributed. */
export function randomOtp(n = 9): string {
  let out = "";
  while (out.length < n) {
    // rejection-sample bytes to avoid modulo bias
    for (const b of crypto.randomBytes(n)) {
      if (b < 250) { out += (b % 10).toString(); if (out.length === n) break; }
    }
  }
  return out;
}

/** Constant-time string equality (hex digests of equal length). */
export function timingSafeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export function newUserId(): string {
  return "u_" + crypto.randomBytes(9).toString("base64url");
}
