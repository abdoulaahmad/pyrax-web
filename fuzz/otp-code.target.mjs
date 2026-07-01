// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Fuzz target: OTP sign-in code parsing (the untrusted `code` field of the device-token/OTP endpoints).
//
// Real functions under test (imported from production, never reimplemented):
//   • pyrax-devnet-portal/src/server/otp-code.ts → normalizeOtpCode(code), isWellFormedOtp(s), OTP_LEN
//   • pyrax-team-website/src/server/otp-code.ts    → normalizeOtpCode(code), isWellFormedOtp(s), OTP_LEN
//
// verifyLoginCode() normalizes the attacker-supplied `code` (strip non-digits) and gates strictly on
// exactly OTP_LEN digits before the hashed DB lookup. If a malformed code could pass this gate, garbage
// input would reach the credential comparison. This target fuzzes that trust-boundary parsing directly
// (the DB-backed part of verifyLoginCode isn't fuzzable in-process, but the shaping is the security bit).
//
// Security properties asserted (must-not-accept-malformed-input):
//   1. TOTAL: normalizeOtpCode never throws and returns ONLY ASCII digits, for ANY input string —
//      including unicode digit look-alikes (٤ ৪ 𝟜), full-width digits, whitespace, control chars,
//      emoji, and huge strings. A non-digit leaking into the output is a REAL finding.
//   2. GATE SOUNDNESS: isWellFormedOtp(normalizeOtpCode(x)) === true  ⇒  the normalized value is
//      EXACTLY OTP_LEN ASCII digits. No punctuation/whitespace/look-alike padding can smuggle a
//      mis-sized code past the length gate.
//   3. IDEMPOTENCE: normalizing an already-normalized code is a no-op (defends the invariant that the
//      DB lookup key is stable).
//   4. PARITY: the devnet and team parsers agree on every input (they must stay in lock-step).

import { FuzzedDataProvider } from "@jazzer.js/core";
import {
  normalizeOtpCode as devNorm,
  isWellFormedOtp as devOk,
  OTP_LEN as DEV_LEN,
} from "../pyrax-devnet-portal/src/server/otp-code.ts";
import {
  normalizeOtpCode as teamNorm,
  isWellFormedOtp as teamOk,
  OTP_LEN as TEAM_LEN,
} from "../pyrax-team-website/src/server/otp-code.ts";

const ASCII_DIGITS = /^[0-9]*$/;

if (DEV_LEN !== TEAM_LEN) throw new Error("PARITY BUG: OTP_LEN differs between portals");
const OTP_LEN = DEV_LEN;

function checkOne(norm, isOk, input, tag) {
  const n = norm(input);
  if (typeof n !== "string") throw new Error(`${tag}: normalize returned non-string`);
  if (!ASCII_DIGITS.test(n)) throw new Error(`${tag}: normalize leaked a non-digit character`);

  const ok = isOk(n);
  if (typeof ok !== "boolean") throw new Error(`${tag}: isWellFormedOtp returned non-boolean`);
  if (ok) {
    // GATE SOUNDNESS: acceptance must mean exactly OTP_LEN ASCII digits.
    if (n.length !== OTP_LEN) throw new Error(`${tag}: GATE BUG: accepted a ${n.length}-digit code`);
    if (!/^[0-9]+$/.test(n)) throw new Error(`${tag}: GATE BUG: accepted a non-digit code`);
  }

  // IDEMPOTENCE: normalize(normalize(x)) === normalize(x).
  if (norm(n) !== n) throw new Error(`${tag}: normalize is not idempotent`);
  return n;
}

export function fuzz(data) {
  const fdp = new FuzzedDataProvider(data);
  const input = fdp.consumeRemainingAsString();

  const nDev = checkOne(devNorm, devOk, input, "devnet");
  const nTeam = checkOne(teamNorm, teamOk, input, "team");

  // PARITY: both portals' parsers must produce identical results on every input.
  if (nDev !== nTeam) throw new Error("PARITY BUG: normalizeOtpCode differs between portals");
  if (devOk(nDev) !== teamOk(nTeam)) throw new Error("PARITY BUG: isWellFormedOtp differs between portals");
}
