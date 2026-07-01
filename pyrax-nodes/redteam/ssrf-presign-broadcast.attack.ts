// SPDX-License-Identifier: LicenseRef-Proprietary
//
// RED TEAM — SSRF + IP-spoof + presign + broadcast-auth attacks (public nodes hub).
//
// The nodes site geo-locates announce IPs (globe) and presigns downloads. An attacker must not be able
// to (a) steer the geo lookup at an internal metadata endpoint, (b) spoof a node's location on the
// public map, (c) redirect a presigned download off-bucket, or (d) reach the admin broadcast without
// the shared secret. A FAILING test = a real SSRF / map-poisoning / off-bucket / broadcast-auth hole.
//
// Attacks covered:
//   J1  SSRF: geoLookup refuses cloud-metadata + private + loopback + link-local + CGNAT targets.
//   J2  SSRF: isPublicIp blocks IPv4-mapped IPv6 smuggling (::ffff:127.0.0.1, ::ffff:169.254.169.254).
//   J3  IP-spoof: without a trusted proxy, resolveClientIp IGNORES body.ip + X-Forwarded-For (socket wins).
//   J4  Presign host pinning: a hostile object key can't redirect a download off the configured bucket.
//   J5  Broadcast auth: /api/admin/broadcast is 401 without the exact NODES_ADMIN_SECRET bearer; a
//       length-mismatched or wrong token fails the constant-time check.
//   J6  Same-origin read gate: /api/peers-style reads reject a cross-origin Origin/Referer.
import { describe, it, expect, vi } from "vitest";

process.env.NODE_ENV = "test";

const geoMod = await import("../src/server/geo");
const ipMod = await import("../src/server/ip");
const hmacMod = await import("../src/server/hmac");

describe("SSRF — geo lookup target allow-listing (J1/J2)", () => {
  it("J1: the cloud metadata endpoint + private/loopback/link-local/CGNAT targets are NOT public", () => {
    const blocked = [
      "169.254.169.254", // AWS/GCP/DO metadata — the classic SSRF pivot
      "127.0.0.1", "0.0.0.0", "10.0.0.5", "192.168.1.1", "172.16.5.5", "172.31.255.255",
      "169.254.10.10",   // link-local
      "100.64.0.1",      // CGNAT (RFC6598)
      "::1", "::",       // IPv6 loopback / unspecified
      "fe80::1",         // IPv6 link-local
      "fc00::1", "fd00::1", // IPv6 ULA
      "192.0.0.1", "198.18.0.1", "203.0.113.9", // special-purpose / TEST-NET / benchmarking
    ];
    for (const ip of blocked) expect(geoMod.isPublicIp(ip), `${ip} must be blocked`).toBe(false);
    // A genuinely public unicast address IS allowed (proves it isn't block-all).
    expect(geoMod.isPublicIp("8.8.8.8")).toBe(true);
    expect(geoMod.isPublicIp("1.1.1.1")).toBe(true);
  });

  it("J2: IPv4-mapped IPv6 smuggling of an internal target is normalized + blocked", () => {
    for (const ip of ["::ffff:127.0.0.1", "::ffff:169.254.169.254", "::ffff:10.0.0.1", "::FFFF:192.168.0.1"]) {
      expect(geoMod.isPublicIp(ip), `${ip} must be blocked after normalization`).toBe(false);
    }
    // A mapped PUBLIC address still resolves as public (normalization is correct, not over-broad).
    expect(geoMod.isPublicIp("::ffff:8.8.8.8")).toBe(true);
  });

  it("J1b: geoLookup returns null (no outbound fetch) for a blocked target even if geo is enabled", async () => {
    // With PYRAX_GEO_DISABLE unset, geoLookup still must short-circuit a non-public IP to null and never
    // fetch. We assert the return contract for the metadata endpoint (the SSRF payload).
    delete process.env.PYRAX_GEO_DISABLE;
    expect(await geoMod.geoLookup("169.254.169.254")).toBeNull();
    expect(await geoMod.geoLookup("127.0.0.1")).toBeNull();
    expect(await geoMod.geoLookup("not-an-ip")).toBeNull();
    expect(await geoMod.geoLookup(undefined)).toBeNull();
  });
});

describe("IP-spoof — location poisoning on the public map (J3)", () => {
  it("J3: without a trusted proxy, the socket peer wins; body.ip + XFF are ignored", () => {
    delete process.env.TRUSTED_PROXY;
    const resolved = ipMod.resolveClientIp({
      clientAddress: "8.8.8.8",            // the real socket peer
      bodyIp: "1.2.3.4",                   // attacker-claimed IP in the body
      xForwardedFor: "5.6.7.8, 9.10.11.12", // attacker-supplied XFF
    });
    expect(resolved).toBe("8.8.8.8"); // never the spoofed values
    // An attacker can't force a private/loopback location either — an invalid socket yields "".
    expect(ipMod.resolveClientIp({ clientAddress: "garbage", bodyIp: "8.8.8.8", xForwardedFor: "8.8.8.8" })).toBe("");
  });

  it("J3b: WITH a trusted proxy, the proxy-supplied values ARE honored (documents the opt-in)", () => {
    process.env.TRUSTED_PROXY = "1";
    const resolved = ipMod.resolveClientIp({ clientAddress: "10.0.0.1", bodyIp: "8.8.8.8", xForwardedFor: "" });
    expect(resolved).toBe("8.8.8.8"); // trusted proxy => body ip honored
    delete process.env.TRUSTED_PROXY; // restore default-deny for any later test
  });
});

describe("presign host pinning (J4)", () => {
  it("J4: a hostile object key can't redirect a presigned download off the configured bucket", async () => {
    process.env.SPACES_KEY = "AKIAREDTEAM";
    process.env.SPACES_SECRET = "redteam-spaces-secret";
    process.env.SPACES_REGION = "tor1";
    process.env.SPACES_BUCKET = "pyrax";
    vi.resetModules();
    const spaces = await import("../src/server/spaces");
    const expectedHost = "pyrax.tor1.digitaloceanspaces.com";
    for (const k of ["node/Inferno-1.0.0.exe", "https://evil.example/x", "//evil.example/y", "../../../creds", "@evil/z"]) {
      const url = spaces.presignGet(k);
      expect(url).not.toBe("");
      expect(new URL(url).host).toBe(expectedHost);
      expect(new URL(url).protocol).toBe("https:");
    }
  });
});

describe("admin broadcast auth (J5)", () => {
  async function callBroadcast(auth: string | null, secret: string) {
    process.env.NODES_ADMIN_SECRET = secret;
    vi.resetModules();
    // Mock the send boundaries so a (hypothetical) authorized call wouldn't actually email/push.
    vi.doMock("../src/server/brevo", () => ({ listNotifyContacts: () => Promise.resolve([]), sendNotifyEmail: () => Promise.resolve(true) }));
    vi.doMock("../src/server/push", () => ({ sendPushToAll: () => Promise.resolve(0) }));
    const mod = await import("../src/pages/api/admin/broadcast");
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (auth !== null) headers.authorization = auth;
    const res = await mod.POST({
      request: new Request("https://nodes.pyraxchain.com/api/admin/broadcast", { method: "POST", headers, body: JSON.stringify({ title: "t", body: "b" }) }),
    } as any);
    vi.doUnmock("../src/server/brevo");
    vi.doUnmock("../src/server/push");
    return res;
  }

  it("J5: broadcast without / with a wrong bearer is 401; the exact secret is 200", async () => {
    const SECRET = "the-real-nodes-admin-secret-value";
    expect((await callBroadcast(null, SECRET)).status).toBe(401);                       // no header
    expect((await callBroadcast("Bearer wrong", SECRET)).status).toBe(401);             // wrong value
    expect((await callBroadcast("Bearer " + SECRET + "x", SECRET)).status).toBe(401);   // length mismatch
    expect((await callBroadcast("Basic " + SECRET, SECRET)).status).toBe(401);          // wrong scheme
    // The exact secret authorizes (proves the gate isn't reject-all). Body {title,body} is present.
    expect((await callBroadcast("Bearer " + SECRET, SECRET)).status).toBe(200);
  });

  it("J5b: when NODES_ADMIN_SECRET is empty, ALL requests are rejected (fail-closed)", async () => {
    expect((await callBroadcast("Bearer anything", "")).status).toBe(401);
  });
});

describe("same-origin read gate (J6)", () => {
  it("J6: a cross-origin Origin/Referer is rejected; same-origin passes", () => {
    const url = "https://nodes.pyraxchain.com/api/peers";
    const cross = new Request(url, { headers: { origin: "https://evil.example" } });
    const same = new Request(url, { headers: { origin: "https://nodes.pyraxchain.com" } });
    const referSame = new Request(url, { headers: { referer: "https://nodes.pyraxchain.com/peers" } });
    const none = new Request(url, {});
    expect(hmacMod.sameOrigin(cross)).toBe(false);
    expect(hmacMod.sameOrigin(same)).toBe(true);
    expect(hmacMod.sameOrigin(referSame)).toBe(true);
    expect(hmacMod.sameOrigin(none)).toBe(false); // no Origin + no Referer => not same-origin (deny)
  });
});
