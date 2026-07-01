// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Indexer request-hardening primitives: the per-IP token bucket + the spoof-resistant client-IP
// resolver behind Cloudflare/Caddy (H8/M9/H9). Plain Node test runner: `node --test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { RateLimiter, clientIp } from "../ratelimit.js";

test("RateLimiter allows up to the burst, then denies", () => {
  const rl = new RateLimiter({ ratePerSec: 0.0001, burst: 5 });
  for (let i = 0; i < 5; i++) assert.equal(rl.take("a").ok, true);
  const denied = rl.take("a");
  assert.equal(denied.ok, false);
  assert.ok(denied.retryAfter > 0);
});

test("RateLimiter keys are independent", () => {
  const rl = new RateLimiter({ ratePerSec: 0.0001, burst: 2 });
  assert.equal(rl.take("x").ok, true);
  assert.equal(rl.take("x").ok, true);
  assert.equal(rl.take("x").ok, false);
  assert.equal(rl.take("y").ok, true); // fresh bucket
});

test("RateLimiter refills over time", async () => {
  const rl = new RateLimiter({ ratePerSec: 1000, burst: 1 });
  assert.equal(rl.take("z").ok, true);
  assert.equal(rl.take("z").ok, false);
  await new Promise((r) => setTimeout(r, 20)); // ~20 tokens refilled at 1000/s
  assert.equal(rl.take("z").ok, true);
});

// --- clientIp: NEVER trust the client-controlled leftmost XFF hop -----------------------------
const reqWith = (headers, remoteAddress = "10.0.0.1") => ({ headers, socket: { remoteAddress } });

test("clientIp prefers CF-Connecting-IP (Cloudflare overwrites it; unforgeable)", () => {
  const ip = clientIp(reqWith({ "cf-connecting-ip": "3.3.3.3", "x-forwarded-for": "6.6.6.6, 7.7.7.7" }));
  assert.equal(ip, "3.3.3.3");
});

test("clientIp uses the RIGHTMOST XFF hop (proxy-attested), not the client-controlled leftmost", () => {
  assert.equal(clientIp(reqWith({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" })), "5.6.7.8");
});

test("a spoofed leftmost XFF cannot rotate the bucket key", () => {
  const a = clientIp(reqWith({ "x-forwarded-for": "1.1.1.1, 9.9.9.9" }));
  const b = clientIp(reqWith({ "x-forwarded-for": "2.2.2.2, 9.9.9.9" }));
  assert.equal(a, b);
  assert.equal(a, "9.9.9.9");
});

test("clientIp falls back to x-real-ip, then the socket peer, then a constant", () => {
  assert.equal(clientIp(reqWith({ "x-real-ip": "4.4.4.4" })), "4.4.4.4");
  assert.equal(clientIp(reqWith({})), "10.0.0.1");
  // No headers and no socket peer address ⇒ the constant shared bucket.
  assert.equal(clientIp({ headers: {}, socket: {} }), "unknown");
});
