// SPDX-License-Identifier: LicenseRef-Proprietary
// Announce input validation (pure validateAnnounce) + the IP-source selection the route applies
// (resolveClientIp): clientAddress wins over a spoofable body ip, and private/loopback IPs never reach
// geo enrichment.
import { describe, it, expect, beforeEach } from "vitest";
import { validateAnnounce } from "../src/pages/api/announce";
import { resolveClientIp } from "../src/server/ip";
import { geoLookup } from "../src/server/geo";

describe("validateAnnounce", () => {
  const good = { network: "forge", port: 30303, peerId: "abc123XYZ", kind: "operator" };

  it("accepts a well-formed announce", () => {
    const r = validateAnnounce(good);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.network).toBe("forge");
      expect(r.value.port).toBe(30303);
      expect(r.value.peerId).toBe("abc123XYZ");
      expect(r.value.kind).toBe("operator");
    }
  });

  it("rejects an unknown / disabled network (403)", () => {
    const r = validateAnnounce({ ...good, network: "bogus" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(403);
  });

  it("rejects out-of-range or non-integer ports (400)", () => {
    for (const port of [0, -1, 70000, 1.5, NaN, "abc"]) {
      const r = validateAnnounce({ ...good, port });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.status).toBe(400);
    }
  });

  it("rejects malformed peerIds (400)", () => {
    for (const peerId of ["", "short", "has spaces", "bad!@#", "x".repeat(200)]) {
      const r = validateAnnounce({ ...good, peerId });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.status).toBe(400);
    }
  });

  it("defaults an unknown kind to 'operator'", () => {
    const r = validateAnnounce({ ...good, kind: "hacker" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.kind).toBe("operator");
  });

  it("filters the peers array to valid ids and caps it at 64", () => {
    const peers = [...Array(100)].map((_, i) => "peer" + i).concat(["bad id", ""]);
    const r = validateAnnounce({ ...good, peers });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.peers!.length).toBe(64);
      expect(r.value.peers!.every((p) => /^[0-9A-Za-z]{6,128}$/.test(p))).toBe(true);
    }
  });

  it("truncates an over-long relayPubkey to 128 chars", () => {
    const r = validateAnnounce({ ...good, relayPubkey: "k".repeat(500) });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.relayPubkey!.length).toBe(128);
  });
});

describe("route IP-source selection (anti-spoofing)", () => {
  beforeEach(() => { delete process.env.TRUSTED_PROXY; });

  it("prefers the socket clientAddress over an attacker's body ip", () => {
    // This mirrors what announce.POST passes to resolveClientIp.
    const ip = resolveClientIp({
      clientAddress: "203.0.113.50",
      bodyIp: "8.8.8.8",
      xForwardedFor: "1.1.1.1",
    });
    expect(ip).toBe("203.0.113.50");
  });
});

describe("geo SSRF / private-IP rejection", () => {
  it("returns null for private, loopback, and non-IP inputs (never calls the provider)", async () => {
    for (const ip of ["10.0.0.1", "192.168.1.1", "172.16.5.5", "127.0.0.1", "::1", "fe80::1", "evil.example.com", "", undefined as any]) {
      await expect(geoLookup(ip)).resolves.toBeNull();
    }
  });

  it("returns null when geo is disabled, even for a public IP", async () => {
    const prev = process.env.PYRAX_GEO_DISABLE;
    process.env.PYRAX_GEO_DISABLE = "1";
    try {
      await expect(geoLookup("8.8.8.8")).resolves.toBeNull();
    } finally {
      if (prev === undefined) delete process.env.PYRAX_GEO_DISABLE; else process.env.PYRAX_GEO_DISABLE = prev;
    }
  });
});
