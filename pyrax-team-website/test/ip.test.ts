// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Client-IP resolution invariants for the rate-limiter dimension. The security property that
// matters: XFF is only ever consulted when TRUST_PROXY declares a known proxy-hop count, and the
// client IP is taken from the RIGHT (the proxy-attested hop) — NEVER the spoofable leftmost value.
import { describe, it, expect } from "vitest";
import { trustedProxyHops, resolveClientIp, clientIpFrom } from "../src/server/ip";

describe("trustedProxyHops()", () => {
  it("returns 0 when unset/blank/zero (don't trust XFF)", () => {
    expect(trustedProxyHops({} as NodeJS.ProcessEnv)).toBe(0);
    expect(trustedProxyHops({ TRUST_PROXY: "" } as NodeJS.ProcessEnv)).toBe(0);
    expect(trustedProxyHops({ TRUST_PROXY: "0" } as NodeJS.ProcessEnv)).toBe(0);
    expect(trustedProxyHops({ TRUST_PROXY: "false" } as NodeJS.ProcessEnv)).toBe(0);
  });
  it("treats true/yes/on as a single trusted proxy", () => {
    for (const v of ["true", "yes", "on", "TRUE", "On"]) {
      expect(trustedProxyHops({ TRUST_PROXY: v } as NodeJS.ProcessEnv)).toBe(1);
    }
  });
  it("parses an explicit positive hop count", () => {
    expect(trustedProxyHops({ TRUST_PROXY: "1" } as NodeJS.ProcessEnv)).toBe(1);
    expect(trustedProxyHops({ TRUST_PROXY: "2" } as NodeJS.ProcessEnv)).toBe(2);
    expect(trustedProxyHops({ TRUST_PROXY: "-3" } as NodeJS.ProcessEnv)).toBe(0);
    expect(trustedProxyHops({ TRUST_PROXY: "nope" } as NodeJS.ProcessEnv)).toBe(0);
  });
});

describe("resolveClientIp()", () => {
  it("ignores XFF entirely and uses the socket peer when no proxy is trusted", () => {
    // Attacker sends a forged leftmost XFF — it MUST be ignored.
    expect(resolveClientIp("10.0.0.5", "8.8.8.8, 1.1.1.1", 0)).toBe("10.0.0.5");
    expect(resolveClientIp("10.0.0.5", "evil", 0)).toBe("10.0.0.5");
  });

  it("with one trusted proxy, takes the hop just before the proxy-appended entry (the real client)", () => {
    // Caddy appended the rightmost hop (its view of the connection = the real client 203.0.113.9).
    expect(resolveClientIp("172.18.0.2", "203.0.113.9", 1)).toBe("203.0.113.9");
    // Attacker prepends a spoofed hop: chain = [spoof, realClient]; we still pick realClient.
    expect(resolveClientIp("172.18.0.2", "9.9.9.9, 203.0.113.9", 1)).toBe("203.0.113.9");
  });

  it("with two trusted proxies (Cloudflare -> Caddy) picks the leftmost proxy-attested hop", () => {
    // Each proxy appends who it received from: CF appends realClient, Caddy appends CF's edge IP.
    // The app therefore sees exactly `[realClient, cfEdge]`; the real client is chain[len-hops].
    expect(resolveClientIp("172.18.0.2", "203.0.113.9, 198.51.100.7", 2)).toBe("203.0.113.9");
    // An attacker prepends a spoofed hop -> [spoof, realClient, cfEdge]; hops=2 still yields realClient.
    expect(resolveClientIp("172.18.0.2", "9.9.9.9, 203.0.113.9, 198.51.100.7", 2)).toBe("203.0.113.9");
  });

  it("never indexes past the start when the chain is shorter than the declared hops (anti-spoof clamp)", () => {
    // Attacker sends fewer hops than expected to try to surface their own value; we clamp, not crash.
    const out = resolveClientIp("172.18.0.2", "7.7.7.7", 2);
    expect(out).toBe("7.7.7.7"); // clamped to the (only) proxy-side entry, never past the start
  });

  it("falls back to the socket peer when XFF is empty even with a trusted proxy", () => {
    expect(resolveClientIp("10.0.0.5", "", 1)).toBe("10.0.0.5");
    expect(resolveClientIp("10.0.0.5", null, 1)).toBe("10.0.0.5");
  });

  it("returns '' when nothing usable is available", () => {
    expect(resolveClientIp("", null, 0)).toBe("");
    expect(resolveClientIp(undefined, undefined, 1)).toBe("");
  });
});

describe("clientIpFrom()", () => {
  const reqWith = (xff?: string) =>
    new Request("https://team.pyraxchain.com/api/auth/request", xff ? { headers: { "x-forwarded-for": xff } } : undefined);

  it("uses the socket peer by default (TRUST_PROXY unset)", () => {
    expect(clientIpFrom(reqWith("1.2.3.4"), "10.0.0.9", {} as NodeJS.ProcessEnv)).toBe("10.0.0.9");
  });

  it("resolves the real client from XFF when TRUST_PROXY=1", () => {
    expect(clientIpFrom(reqWith("203.0.113.9"), "172.18.0.2", { TRUST_PROXY: "1" } as NodeJS.ProcessEnv)).toBe("203.0.113.9");
  });
});
