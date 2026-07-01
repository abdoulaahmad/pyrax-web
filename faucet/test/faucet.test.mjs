// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// Tests for the faucet's anti-automation gates:
//   • M16 — clientIp() must read the trusted RIGHTMOST proxy-appended X-Forwarded-For (only
//     when TRUST_PROXY is on), so a client-spoofed LEFTMOST hop can't mint a fresh bucket.
//   • M17 — the /drip per-IP cap + hashcash proof-of-work gate.
//
// The config consts are read at module load, so we set the env BEFORE the dynamic import.
// Importing the module does NOT start the server (guarded by import.meta.main).

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

// Turn proxy trust ON and pick a small drip-IP cap + a low PoW difficulty for fast tests.
process.env.TRUST_PROXY = "1";
process.env.FAUCET_DRIP_IP_PER_H = "3";
process.env.FAUCET_DRIP_POW_BITS = "8";

const {
  clientIp,
  verifyPow,
  issuePowChallenge,
  leadingZeroBits,
  dripIpUnder,
  dripIpConsume,
  addrKind,
} = await import("../faucet.mjs");

/** Minimal req shape clientIp() reads. */
function req(xff, remote = "10.0.0.9") {
  return { headers: xff === undefined ? {} : { "x-forwarded-for": xff }, socket: { remoteAddress: remote } };
}

// ── M16: X-Forwarded-For handling ─────────────────────────────────────────────
test("M16: clientIp reads the RIGHTMOST (proxy-appended) hop, not the client-controlled left", () => {
  // Caddy appends the real client as the rightmost hop; the leftmost is attacker-supplied.
  assert.equal(clientIp(req("1.2.3.4, 203.0.113.7")), "203.0.113.7");
  // A single-hop header (Caddy overwrite topology) — the only value IS the trusted one.
  assert.equal(clientIp(req("203.0.113.7")), "203.0.113.7");
});

test("M16: rotating the spoofed leftmost hop can't change the trusted identity", () => {
  const a = clientIp(req("9.9.9.1, 203.0.113.7"));
  const b = clientIp(req("8.8.8.2, 203.0.113.7"));
  const c = clientIp(req("7.7.7.3, 203.0.113.7"));
  assert.equal(a, "203.0.113.7");
  assert.equal(b, "203.0.113.7");
  assert.equal(c, "203.0.113.7"); // identity is stable ⇒ one bucket, no bypass
});

test("M16: the per-IP drip cap can't be bypassed by rotating the leftmost XFF", () => {
  const rightmost = "198.51.100.5";
  const ip = clientIp(req(`rot-a, ${rightmost}`));
  // Consume the cap (3) against the trusted identity.
  for (let i = 0; i < 3; i++) {
    assert.equal(dripIpUnder(ip), true, `under cap on grant ${i + 1}`);
    dripIpConsume(ip);
  }
  // A 4th request from the SAME trusted IP — even with a fresh spoofed leftmost — is capped.
  const ipAgain = clientIp(req(`rot-DIFFERENT, ${rightmost}`));
  assert.equal(ipAgain, ip, "rotating the left hop must not change the keyed IP");
  assert.equal(dripIpUnder(ipAgain), false, "the cap must still apply to the rotated request");
});

// ── M17: proof-of-work gate ───────────────────────────────────────────────────
test("leadingZeroBits counts correctly", () => {
  assert.equal(leadingZeroBits(Buffer.from([0x00, 0xff])), 8);
  assert.equal(leadingZeroBits(Buffer.from([0x0f, 0xff])), 4);
  assert.equal(leadingZeroBits(Buffer.from([0x80])), 0);
  assert.equal(leadingZeroBits(Buffer.from([0x01])), 7);
});

/** Solve a challenge to the given difficulty (small in tests). */
function solve(challenge, bits) {
  for (let n = 0; ; n++) {
    const d = createHash("sha256").update(`${challenge}:${n}`).digest();
    if (leadingZeroBits(d) >= bits) return String(n);
  }
}

test("M17: a valid, single-use PoW solution verifies once and cannot be replayed", () => {
  const { challenge, bits } = issuePowChallenge();
  assert.equal(bits, 8);
  const nonce = solve(challenge, bits);
  assert.equal(verifyPow({ challenge, nonce }), true, "a fresh valid solution must verify");
  // Single-use: the same challenge is now consumed and must not verify again.
  assert.equal(verifyPow({ challenge, nonce }), false, "a consumed challenge must not replay");
});

test("M17: a wrong nonce, unknown challenge, or malformed input is rejected", () => {
  const { challenge } = issuePowChallenge();
  assert.equal(verifyPow({ challenge, nonce: "definitely-not-a-solution" }), false);
  assert.equal(verifyPow({ challenge: "f".repeat(32), nonce: "0" }), false); // never issued
  assert.equal(verifyPow(null), false);
  assert.equal(verifyPow({ challenge: "not-hex", nonce: "0" }), false);
  assert.equal(verifyPow({ challenge: "a".repeat(31), nonce: "0" }), false); // wrong length
});

test("addrKind classifies transparent/shielded and rejects junk (unchanged behavior)", () => {
  assert.equal(addrKind("0x" + "a".repeat(40)), "transparent");
  assert.equal(addrKind("0x" + "b".repeat(128)), "shielded");
  assert.equal(addrKind("0xnope"), null);
  assert.equal(addrKind(undefined), null);
});
