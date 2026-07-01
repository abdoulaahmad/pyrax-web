// SPDX-License-Identifier: LicenseRef-Proprietary
// IP shape validation + trusted client-IP resolution (announce anti-spoofing).
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isValidIp, normalizeIp, resolveClientIp, trustProxy, multiaddrFor } from "../src/server/ip";

beforeEach(() => { delete process.env.TRUSTED_PROXY; });

describe("isValidIp", () => {
  it("accepts valid IPv4", () => {
    expect(isValidIp("1.2.3.4")).toBe(true);
    expect(isValidIp("203.0.113.7")).toBe(true);
  });
  it("accepts valid IPv6 (incl. IPv4-mapped)", () => {
    expect(isValidIp("2001:db8::1")).toBe(true);
    expect(isValidIp("::1")).toBe(true);
    expect(isValidIp("::ffff:1.2.3.4")).toBe(true);
  });
  it("rejects hostnames, junk, ports, CIDR, and empties (SSRF surface)", () => {
    expect(isValidIp("evil.example.com")).toBe(false);
    expect(isValidIp("not-an-ip")).toBe(false);
    expect(isValidIp("1.2.3.4:8080")).toBe(false);
    expect(isValidIp("1.2.3.4/24")).toBe(false);
    expect(isValidIp("999.999.999.999")).toBe(false);
    expect(isValidIp("")).toBe(false);
    expect(isValidIp(undefined)).toBe(false);
    expect(isValidIp(null)).toBe(false);
  });
});

describe("normalizeIp", () => {
  it("strips the IPv4-mapped IPv6 prefix and trims", () => {
    expect(normalizeIp("::ffff:1.2.3.4")).toBe("1.2.3.4");
    expect(normalizeIp("  1.2.3.4 ")).toBe("1.2.3.4");
  });
});

describe("multiaddrFor (correct transport prefix per IP family)", () => {
  it("uses /ip4/ for IPv4", () => {
    expect(multiaddrFor("203.0.113.7", 30303, "peerABC")).toBe("/ip4/203.0.113.7/tcp/30303/p2p/peerABC");
  });
  it("uses /ip6/ for IPv6 (a v6 literal under /ip4/ would be a malformed multiaddr)", () => {
    expect(multiaddrFor("2001:db8::1", 443, "peerABC")).toBe("/ip6/2001:db8::1/tcp/443/p2p/peerABC");
    // IPv6 loopback resolved as the socket peer on a v6 stack must still produce a valid /ip6/ addr.
    expect(multiaddrFor("::1", 30303, "peerABC")).toBe("/ip6/::1/tcp/30303/p2p/peerABC");
  });
  it("strips the IPv4-mapped prefix and uses /ip4/", () => {
    expect(multiaddrFor("::ffff:198.51.100.5", 8080, "peerABC")).toBe("/ip4/198.51.100.5/tcp/8080/p2p/peerABC");
  });
  it("falls back to a peer-only address for a missing/invalid IP", () => {
    expect(multiaddrFor("", 30303, "peerABC")).toBe("/p2p/peerABC");
    expect(multiaddrFor("not-an-ip", 30303, "peerABC")).toBe("/p2p/peerABC");
  });
});

describe("resolveClientIp (default — no trusted proxy)", () => {
  it("uses the socket peer (clientAddress) and IGNORES a spoofed body ip / XFF", () => {
    const ip = resolveClientIp({
      clientAddress: "203.0.113.10",
      bodyIp: "8.8.8.8",                 // attacker-supplied: must be ignored
      xForwardedFor: "1.1.1.1, 9.9.9.9", // spoofable: must be ignored
    });
    expect(ip).toBe("203.0.113.10");
  });

  it("normalizes an IPv4-mapped socket address", () => {
    expect(resolveClientIp({ clientAddress: "::ffff:198.51.100.5" })).toBe("198.51.100.5");
  });

  it("returns '' when the socket address is missing/invalid (no fallback to spoofable sources)", () => {
    expect(resolveClientIp({ clientAddress: "", bodyIp: "8.8.8.8" })).toBe("");
    expect(resolveClientIp({ clientAddress: "garbage", bodyIp: "8.8.8.8" })).toBe("");
  });
});

describe("resolveClientIp (TRUSTED_PROXY=1)", () => {
  afterEach(() => { delete process.env.TRUSTED_PROXY_HOPS; });

  it("takes the proxy-ATTESTED (rightmost) XFF hop, NOT the spoofable leftmost, and IGNORES body ip", () => {
    process.env.TRUSTED_PROXY = "1";
    expect(trustProxy()).toBe(true);
    // Attacker sends `X-Forwarded-For: 8.8.8.8` + body ip; the single trusted proxy (Caddy) appends the
    // real hop it saw (203.0.113.20) at the RIGHT. We must return the appended value, never the client's.
    const ip = resolveClientIp({ clientAddress: "10.0.0.1", bodyIp: "1.2.3.4", xForwardedFor: "8.8.8.8, 203.0.113.20" });
    expect(ip).toBe("203.0.113.20");
  });

  it("ignores an attacker-forged leftmost XFF even when it is the only entry a naive parser would read", () => {
    process.env.TRUSTED_PROXY = "1";
    // Single-entry XFF from a direct client behind one proxy: that lone entry IS the proxy-attested hop.
    // A forged multi-entry list must resolve to the rightmost (proxy-appended) value.
    expect(resolveClientIp({ clientAddress: "10.0.0.1", xForwardedFor: "203.0.113.30" })).toBe("203.0.113.30");
    expect(resolveClientIp({ clientAddress: "10.0.0.1", xForwardedFor: "1.1.1.1, 2.2.2.2, 203.0.113.31" })).toBe("203.0.113.31");
  });

  it("honors TRUSTED_PROXY_HOPS for a multi-proxy chain (e.g. Cloudflare + Caddy = 2 appended hops)", () => {
    process.env.TRUSTED_PROXY = "1";
    process.env.TRUSTED_PROXY_HOPS = "2";
    // chain: <client-spoofed>, <real client attested by CF>, <CF attested by Caddy>. With 2 trusted
    // appended hops the attested client is the 2nd from the right.
    const ip = resolveClientIp({ clientAddress: "10.0.0.1", xForwardedFor: "8.8.8.8, 203.0.113.50, 172.16.0.9" });
    expect(ip).toBe("203.0.113.50");
  });

  it("never prefers the request-body ip over the proxy attestation", () => {
    process.env.TRUSTED_PROXY = "1";
    const ip = resolveClientIp({ clientAddress: "10.0.0.1", bodyIp: "203.0.113.20", xForwardedFor: "" });
    // No XFF → fall through to the socket address; the body ip is never trusted.
    expect(ip).toBe("10.0.0.1");
  });

  it("falls back to the socket address when XFF is absent/invalid", () => {
    process.env.TRUSTED_PROXY = "1";
    expect(resolveClientIp({ clientAddress: "203.0.113.40", bodyIp: undefined, xForwardedFor: "junk" })).toBe("203.0.113.40");
    expect(resolveClientIp({ clientAddress: "203.0.113.41", xForwardedFor: null })).toBe("203.0.113.41");
  });
});
