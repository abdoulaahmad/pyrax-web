// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Pure OTP-code shaping — the security-relevant, dependency-free part of verifyLoginCode(). A sign-in
// code arrives as an arbitrary, attacker-controlled string in the request body; before any database
// lookup we normalize it (strip everything that isn't a digit) and gate strictly on the exact length.
// Extracted so this untrusted-input parsing can be unit-tested and fuzzed in isolation, guaranteeing:
//   • normalizeOtpCode() is total (never throws) and returns ONLY digits [0-9],
//   • isWellFormedOtp() accepts ONLY a normalized string of exactly OTP_LEN digits — so no amount of
//     punctuation, whitespace, unicode-digit look-alikes, or padding can smuggle a mis-sized code past
//     the length gate into the hashed lookup.

/** Number of digits in a login OTP. Mirrors auth.ts (single source of truth for the code shape). */
export const OTP_LEN = 9;

/** Strip every non-ASCII-digit character, leaving only [0-9]. Total: any string yields a digit string. */
export function normalizeOtpCode(code: string): string {
  return (code || "").replace(/\D/g, "");
}

/** True iff `normalized` is EXACTLY OTP_LEN ASCII digits (the shape verifyLoginCode requires). */
export function isWellFormedOtp(normalized: string): boolean {
  return normalized.length === OTP_LEN && /^[0-9]+$/.test(normalized);
}
