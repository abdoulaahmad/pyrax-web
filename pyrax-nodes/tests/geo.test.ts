// SPDX-License-Identifier: LicenseRef-Proprietary
// Geo SSRF guard: isPublicIp must reject every private / loopback / link-local / CGNAT / special-use /
// unspecified range (including IPv4-mapped IPv6 forms that try to smuggle a private address past the
// check), and only accept genuinely globally-routable unicast addresses. geoLookup must never call the
// provider for a rejected or disabled input.
import { describe, it, expect } from "vitest";
import { isPublicIp, geoLookup } from "../src/server/geo";

describe("isPublicIp (SSRF guard)", () => {
  it("rejects IPv4 private / loopback / link-local / CGNAT / special / unspecified", () => {
    for (const ip of [
      "0.0.0.0",          // unspecified
      "10.0.0.1",         // RFC1918
      "10.255.255.255",
      "127.0.0.1",        // loopback
      "169.254.169.254",  // link-local incl. cloud metadata
      "172.16.0.1", "172.31.255.255", // RFC1918 172.16/12
      "192.168.1.1",      // RFC1918
      "100.64.0.1", "100.127.255.255", // CGNAT 100.64/10
      "198.18.0.1",       // benchmarking 198.18/15
      "192.0.2.5",        // TEST-NET-1
      "198.51.100.5",     // TEST-NET-2
      "203.0.113.5",      // TEST-NET-3
    ]) {
      expect(isPublicIp(ip), ip).toBe(false);
    }
  });

  it("does NOT mis-reject public addresses that merely start with a private prefix's digits", () => {
    // 172.15.x and 172.32.x are public (the private block is only 172.16–172.31).
    expect(isPublicIp("172.15.0.1")).toBe(true);
    expect(isPublicIp("172.32.0.1")).toBe(true);
    // 100.63.x and 100.128.x are public (CGNAT is only 100.64–100.127).
    expect(isPublicIp("100.63.0.1")).toBe(true);
    expect(isPublicIp("100.128.0.1")).toBe(true);
  });

  it("rejects IPv6 loopback / unspecified / link-local / ULA", () => {
    for (const ip of ["::1", "::", "fe80::1", "fc00::1", "fd00::1"]) {
      expect(isPublicIp(ip), ip).toBe(false);
    }
  });

  it("rejects IPv4-mapped IPv6 forms of private/loopback (no smuggling past the guard)", () => {
    for (const ip of ["::ffff:127.0.0.1", "::ffff:10.0.0.1", "::ffff:192.168.0.1", "::ffff:169.254.169.254"]) {
      expect(isPublicIp(ip), ip).toBe(false);
    }
  });

  it("accepts genuinely public unicast addresses (incl. IPv4-mapped public)", () => {
    expect(isPublicIp("8.8.8.8")).toBe(true);
    expect(isPublicIp("1.1.1.1")).toBe(true);
    expect(isPublicIp("2606:4700:4700::1111")).toBe(true); // Cloudflare v6
    expect(isPublicIp("::ffff:8.8.8.8")).toBe(true);
  });
});

describe("geoLookup gate", () => {
  it("returns null (never calls the provider) for private/loopback/mapped/non-IP inputs", async () => {
    for (const ip of [
      "10.0.0.1", "127.0.0.1", "::1", "::", "0.0.0.0",
      "::ffff:10.0.0.1", "169.254.169.254", "evil.example.com", "", undefined as any,
    ]) {
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
