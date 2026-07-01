// SPDX-License-Identifier: LicenseRef-Proprietary
//
// RED TEAM — HMAC announce-ingest attacks (public nodes hub).
//
// The /api/announce + /api/deregister ingest is the ONLY unauthenticated-by-cookie write surface on the
// public site: a node proves itself with a PYRAX-HMAC signature over METHOD\nPATH\nts\nsha256(body).
// A forged/expired/replayed signature, or an oversized/over-count body, must be rejected — otherwise an
// attacker poisons the public peer map + the geo globe. This exercises the REAL verifyHmac (with a real
// configured secret) + the REAL validateAnnounce. A FAILING test = a real forgery/replay/DoS hole.
//
// Attacks covered:
//   I1  A forged signature (wrong secret) is rejected.
//   I2  A tampered body (signed for body A, sent with body B) is rejected — the sha256(body) won't match.
//   I3  An expired timestamp (outside the +/-90s window) is rejected (no old-capture replay).
//   I4  A future timestamp beyond the window is rejected.
//   I5  Signature REPLAY: a valid signature is one-time-use — the second identical request is rejected.
//   I6  A malformed / missing Authorization header is rejected.
//   I7  A path/method mismatch (sig computed for a different route) is rejected (no cross-route reuse).
//   I8  validateAnnounce rejects a disabled network, out-of-range port, and malformed peerId.
//   I9  validateAnnounce caps the peers[] array at 64 and drops malformed ids (over-count DoS blocked).
//   I10 The route rejects an oversized raw body (>4096 bytes) BEFORE it touches validation.
import { describe, it, expect, beforeEach, vi } from "vitest";
import crypto from "node:crypto";

// A real (non-dev) directory secret so verifyHmac operates in its production-equivalent mode.
const SECRET = "redteam-directory-secret-not-the-dev-default";
process.env.PYRAX_DIRECTORY_SECRET = SECRET;
process.env.NODE_ENV = "test";

const { verifyHmac } = await import("../src/server/hmac");
const { validateAnnounce } = await import("../src/server/announce-validate");

/** Produce a genuine PYRAX-HMAC header for a body, with a chosen secret + timestamp. */
function sign(method: string, path: string, body: string, opts: { secret?: string; ts?: number } = {}): string {
  const ts = opts.ts ?? Date.now();
  const secret = opts.secret ?? SECRET;
  const bodyHash = crypto.createHash("sha256").update(body).digest("hex");
  const canon = `${method}\n${path}\n${ts}\n${bodyHash}`;
  const sig = crypto.createHmac("sha256", secret).update(canon).digest("hex");
  return `PYRAX-HMAC ts=${ts},sig=${sig}`;
}

describe("HMAC forgery + tamper (I1/I2/I6/I7)", () => {
  const body = JSON.stringify({ network: "forge", port: 30303, peerId: "abc123XYZ" });

  it("I1: a signature forged with the WRONG secret is rejected", () => {
    const forged = sign("POST", "/api/announce", body, { secret: "attacker-guessed-secret" });
    expect(verifyHmac("POST", "/api/announce", body, forged)).toBe(false);
  });

  it("I1b: a genuine signature with the RIGHT secret verifies (proves the gate isn't reject-all)", () => {
    const good = sign("POST", "/api/announce", body);
    expect(verifyHmac("POST", "/api/announce", body, good)).toBe(true);
  });

  it("I2: a body swapped after signing is rejected (sha256(body) mismatch)", () => {
    const header = sign("POST", "/api/announce", body); // signed for the honest body
    const tampered = JSON.stringify({ network: "forge", port: 30303, peerId: "EVILpeerId", ip: "6.6.6.6" });
    expect(verifyHmac("POST", "/api/announce", tampered, header)).toBe(false);
  });

  it("I6: a missing / malformed Authorization header is rejected", () => {
    expect(verifyHmac("POST", "/api/announce", body, null)).toBe(false);
    expect(verifyHmac("POST", "/api/announce", body, "")).toBe(false);
    expect(verifyHmac("POST", "/api/announce", body, "Bearer something")).toBe(false);
    expect(verifyHmac("POST", "/api/announce", body, "PYRAX-HMAC ts=,sig=")).toBe(false);
    expect(verifyHmac("POST", "/api/announce", body, "PYRAX-HMAC nonsense")).toBe(false);
    expect(verifyHmac("POST", "/api/announce", body, "PYRAX-HMAC ts=abc,sig=xyz")).toBe(false);
  });

  it("I7: a signature computed for a DIFFERENT route/method can't be replayed cross-route", () => {
    const forDeregister = sign("POST", "/api/deregister", body);
    // Same body + ts + sig, but presented at /api/announce → canonical string differs → reject.
    expect(verifyHmac("POST", "/api/announce", body, forDeregister)).toBe(false);
    const forGet = sign("GET", "/api/announce", body);
    expect(verifyHmac("POST", "/api/announce", body, forGet)).toBe(false);
  });
});

describe("HMAC timestamp window + replay (I3/I4/I5)", () => {
  const body = JSON.stringify({ network: "forge", port: 30303, peerId: "abc123XYZ" });

  it("I3: an expired timestamp (> 90s in the past) is rejected", () => {
    const old = sign("POST", "/api/announce", body, { ts: Date.now() - 120_000 });
    expect(verifyHmac("POST", "/api/announce", body, old)).toBe(false);
  });

  it("I4: a future timestamp (> 90s ahead) is rejected", () => {
    const future = sign("POST", "/api/announce", body, { ts: Date.now() + 120_000 });
    expect(verifyHmac("POST", "/api/announce", body, future)).toBe(false);
  });

  it("I5: a valid signature is ONE-TIME-USE — an identical replay is rejected", () => {
    // Unique body so this test's signature can't collide with another test's replay cache entry.
    const uniqueBody = JSON.stringify({ network: "forge", port: 30303, peerId: "replayGuard1" });
    const header = sign("POST", "/api/announce", uniqueBody);
    expect(verifyHmac("POST", "/api/announce", uniqueBody, header)).toBe(true);  // first use accepted
    expect(verifyHmac("POST", "/api/announce", uniqueBody, header)).toBe(false); // replay rejected
    expect(verifyHmac("POST", "/api/announce", uniqueBody, header)).toBe(false); // still rejected
  });
});

describe("announce body validation — enum / range / over-count caps (I8/I9)", () => {
  const good = { network: "forge", port: 30303, peerId: "abc123XYZ", kind: "operator" };

  it("I8: a disabled network (403), bad port (400), and malformed peerId (400) are rejected", () => {
    expect(validateAnnounce({ ...good, network: "mainnet-lol" })).toMatchObject({ ok: false, status: 403 });
    // Genuinely-bad ports: out of range, non-integer, non-numeric. (A numeric STRING like "80" is
    // legitimately coerced by Number() to a valid port — that's accepted, not an attack.)
    for (const port of [0, -1, 70000, 1.5, NaN, "eighty", null, {}]) {
      expect(validateAnnounce({ ...good, port })).toMatchObject({ ok: false, status: 400 });
    }
    for (const peerId of ["", "shrt", "has space", "bad!@#", "x".repeat(200), 12345]) {
      expect(validateAnnounce({ ...good, peerId })).toMatchObject({ ok: false, status: 400 });
    }
  });

  it("I9: the peers[] array is capped at 64 and malformed ids are dropped (over-count DoS blocked)", () => {
    const peers = [...Array(500)].map((_, i) => "peer" + i).concat(["bad id", "", "x".repeat(300)]);
    const r = validateAnnounce({ ...good, peers });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.peers!.length).toBe(64);
      expect(r.value.peers!.every((p) => /^[0-9A-Za-z]{6,128}$/.test(p))).toBe(true);
    }
    // relayPubkey is clamped to 128 chars so a giant value can't bloat the stored record.
    const big = validateAnnounce({ ...good, relayPubkey: "K".repeat(10_000) });
    expect(big.ok).toBe(true);
    if (big.ok) expect(big.value.relayPubkey!.length).toBe(128);
  });

  it("I8b: validateAnnounce is total — hostile shapes never throw", () => {
    for (const b of [null, undefined, 42, "str", [], { network: {} }, { port: [] }, { peers: "not-array" }]) {
      expect(() => validateAnnounce(b as any)).not.toThrow();
    }
  });
});

describe("route-level oversized-body cap (I10)", () => {
  it("I10: the announce route rejects a >4096-byte body with 413 BEFORE HMAC/validation", async () => {
    // Exercise the REAL route with the DB/geo/ratelimit boundaries mocked. A 5000-byte body must be
    // refused for size, never parsed or validated — a cheap early bail that blunts amplification.
    vi.resetModules();
    process.env.PYRAX_DIRECTORY_SECRET = SECRET;
    vi.doMock("../src/server/directory", () => ({ upsertPeer: () => ({}), patchGeo: () => {}, TTL_MS: 30_000 }));
    vi.doMock("../src/server/geo", () => ({ geoLookup: () => Promise.resolve(null) }));
    vi.doMock("../src/server/ratelimit", () => ({ announceLimiter: { take: () => true } }));
    const mod = await import("../src/pages/api/announce");
    const bigBody = "x".repeat(5000);
    const res = await mod.POST({
      request: new Request("https://nodes.pyraxchain.com/api/announce", { method: "POST", body: bigBody }),
      clientAddress: "203.0.113.50",
    } as any);
    expect(res.status).toBe(413);
    vi.doUnmock("../src/server/directory");
    vi.doUnmock("../src/server/geo");
    vi.doUnmock("../src/server/ratelimit");
  });
});
