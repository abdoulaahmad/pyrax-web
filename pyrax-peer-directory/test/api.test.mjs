// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import {
  hmacOk,
  live,
  announce,
  sweep,
  isPrivateIp,
  resolveAnnounceIp,
  NETWORKS,
  ENABLED,
  SECRET,
  peers,
} from "../server/index.js";

function sign(method, path, body, ts = Date.now(), secret = SECRET) {
  const bodyHash = createHash("sha256").update(body).digest("hex");
  const mac = createHmac("sha256", secret)
    .update(`${method}\n${path}\n${ts}\n${bodyHash}`)
    .digest("hex");
  return `PYRAX-HMAC ts=${ts},sig=${mac}`;
}
const reqWith = (authorization, method = "POST") => ({ method, headers: { authorization } });

test("networks: internal devnet is split simulated/live; devnet2 is the only public devnet; plain devnet removed", () => {
  assert.ok(NETWORKS.has("internal-devnet-simulated"));
  assert.ok(NETWORKS.has("internal-devnet-live"));
  assert.ok(NETWORKS.has("devnet2"));
  assert.ok(NETWORKS.has("testnet"));
  assert.ok(NETWORKS.has("mainnet"));
  assert.ok(!NETWORKS.has("devnet"));
  assert.ok(!NETWORKS.has("internal-devnet"));
});

test("geo: private/loopback IPs are skipped; public IPs are geolocated", () => {
  for (const ip of ["127.0.0.1", "::1", "10.0.0.5", "192.168.1.20", "172.16.0.1", "169.254.1.1"]) {
    assert.ok(isPrivateIp(ip), `${ip} should be private`);
  }
  for (const ip of ["8.8.8.8", "203.0.113.10", "1.1.1.1"]) {
    assert.ok(!isPrivateIp(ip), `${ip} should be public`);
  }
});

test("announce IP override: a valid PUBLIC claimed IP wins; non-public/garbage falls back to source", () => {
  // A co-located RPC node (source IP = localhost) publishes its real public IP.
  assert.equal(resolveAnnounceIp("159.223.193.210", "127.0.0.1"), "159.223.193.210");
  // IPv4-mapped IPv6 form is normalized before validation.
  assert.equal(resolveAnnounceIp("::ffff:203.0.113.7", "127.0.0.1"), "203.0.113.7");
  // Private/loopback/garbage claims are rejected — the source IP stands.
  for (const bad of ["10.0.0.9", "192.168.1.5", "127.0.0.1", "::1", "not-an-ip", "", null, undefined]) {
    assert.equal(resolveAnnounceIp(bad, "203.0.113.50"), "203.0.113.50", `claim ${bad} must fall back`);
  }
  // No claim at all ⇒ source IP (the default path for app announces).
  assert.equal(resolveAnnounceIp(undefined, "8.8.8.8"), "8.8.8.8");
});

test("enablement: only internal-devnet-simulated is live by default; others are gated off", () => {
  assert.ok(ENABLED.has("internal-devnet-simulated"));
  assert.ok(!ENABLED.has("internal-devnet-live"));
  assert.ok(!ENABLED.has("devnet2"));
  assert.ok(!ENABLED.has("testnet"));
  assert.ok(!ENABLED.has("mainnet"));
});

test("hmac: a valid signature is accepted exactly once (replay-protected)", () => {
  const body = JSON.stringify({ network: "devnet2", port: 30303, peerId: "x".repeat(46) });
  const auth = sign("POST", "/api/announce", body);
  const req = reqWith(auth);
  assert.equal(hmacOk(req, "/api/announce", body), true);
  // same signature replayed → rejected
  assert.equal(hmacOk(reqWith(auth), "/api/announce", body), false);
});

test("hmac: tampered body / wrong secret / expired ts / no header are rejected", () => {
  const body = JSON.stringify({ network: "devnet2", port: 1 });
  // tampered body (sig was over a different body)
  assert.equal(hmacOk(reqWith(sign("POST", "/api/announce", body)), "/api/announce", body + "!"), false);
  // wrong secret
  assert.equal(
    hmacOk(reqWith(sign("POST", "/api/announce", body, Date.now(), "attacker")), "/api/announce", body),
    false,
  );
  // expired timestamp (10 minutes old)
  assert.equal(
    hmacOk(reqWith(sign("POST", "/api/announce", body, Date.now() - 600_000)), "/api/announce", body),
    false,
  );
  // missing / malformed header
  assert.equal(hmacOk(reqWith(undefined), "/api/announce", body), false);
  assert.equal(hmacOk(reqWith("Bearer abc"), "/api/announce", body), false);
});

test("presence: announce lists a peer; foreign networks are isolated; TTL drops it", () => {
  peers.clear();
  const id = "12D3KooW" + "a".repeat(38);
  announce({ network: "devnet2", port: 30303, peerId: id, ip: "203.0.113.5", relayPubkey: "ab".repeat(32) });
  const got = live("devnet2");
  assert.equal(got.length, 1);
  assert.match(got[0].address, /\/ip4\/203\.0\.113\.5\/tcp\/30303\/p2p\//);
  assert.equal(got[0].relayPubkey, "ab".repeat(32));
  // isolated per network
  assert.equal(live("testnet").length, 0);
});

test("presence: node kind is stored + returned; lat/lon/kind keys present", () => {
  peers.clear();
  const id = "12D3KooW" + "b".repeat(38);
  announce({ network: "devnet2", port: 30303, peerId: id, ip: "203.0.113.9", relayPubkey: undefined, kind: "seed" });
  const got = live("devnet2");
  assert.equal(got.length, 1);
  assert.equal(got[0].kind, "seed");
  assert.ok("lat" in got[0] && "lon" in got[0], "live() exposes lat/lon for the globe");
  // age the entry past TTL, then sweep → dropped
  for (const e of peers.values()) e.lastSeen = Date.now() - 10 * 60_000;
  sweep();
  assert.equal(live("devnet2").length, 0);
});

test("presence: 'rpc' node kind round-trips (violet RPC node)", () => {
  peers.clear();
  const id = "12D3KooW" + "c".repeat(38);
  announce({ network: "devnet2", port: 30303, peerId: id, ip: "203.0.113.11", relayPubkey: undefined, kind: "rpc" });
  const got = live("devnet2");
  assert.equal(got.length, 1);
  assert.equal(got[0].kind, "rpc");
});
