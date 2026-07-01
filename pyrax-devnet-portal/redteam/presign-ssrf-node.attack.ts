// SPDX-License-Identifier: LicenseRef-Proprietary
//
// RED TEAM — presign/upload abuse + SSRF + node-pairing token attacks (devnet tester portal).
//
// Exercises the REAL SigV4 presigner (src/server/s3presign.ts), the REAL upload-sign RBAC + key
// sanitization (pages/api/uploads/sign.ts), and the REAL node heartbeat token gate. A FAILING test = a
// real SSRF / path-traversal / key-injection / auth-bypass vulnerability.
//
// Attacks covered:
//   H1  Presign host pinning: presignPut/presignGet always target the configured bucket host — a hostile
//       key can't steer the upload/download to an attacker origin.
//   H2  Upload-key injection / traversal: a filename with "../", NUL, or path separators is sanitized so
//       NO separator survives AND the key is namespaced under the tester's own id — it can't write
//       outside its prefix.
//   H3  RBAC: a tester WITHOUT issues.submit cannot obtain an upload presign (403); a not-signed-in
//       caller is 401.
//   H4  A too-large or unsupported-type upload is refused (no presign minted).
//   H5  List-XML from a hostile bucket response never throws; keys are inert DATA (render-time escaping,
//       not parse-time truncation, is the XSS defense — this test documents + locks that contract).
//   H6  Node heartbeat requires a valid Bearer token — a missing/garbage token is 401.
import { describe, it, expect, vi } from "vitest";

process.env.NODE_ENV = "test";
process.env.SESSION_SECRET = "redteam-devnet-presign";
process.env.SPACES_KEY = "AKIAREDTEAM";
process.env.SPACES_SECRET = "redteam-spaces-secret";
process.env.SPACES_REGION = "tor1";
process.env.SPACES_BUCKET = "pyrax";

const EXPECTED_HOST = "pyrax.tor1.digitaloceanspaces.com";

const s3 = await import("../src/server/s3presign");

describe("presign host pinning + scope (H1)", () => {
  it("H1: presignPut/presignGet are pinned to the configured bucket host regardless of the key", () => {
    const hostile = ["devnet/issues/t1/x.png", "https://evil.example/steal", "//evil.example/x", "../../../creds", "@evil/x"];
    for (const k of hostile) {
      const put = s3.presignPut(k);
      const get = s3.presignGet(k);
      expect(new URL(put.url).host).toBe(EXPECTED_HOST);
      expect(new URL(get).host).toBe(EXPECTED_HOST);
      expect(new URL(put.url).protocol).toBe("https:");
      // publicUrl is the CDN mirror of the SAME bucket — never an attacker host.
      expect(put.publicUrl.startsWith(`https://pyrax.tor1.cdn.digitaloceanspaces.com/`)).toBe(true);
    }
  });
});

describe("upload-key injection + RBAC + limits (H2/H3/H4)", () => {
  // Mock only the boundaries: the session→tester resolver + spaces presign. The RBAC gate + the key
  // sanitization in the handler are the real code under test.
  async function callSign(tester: any, body: any) {
    vi.resetModules();
    vi.doMock("../src/server/guard", () => ({
      requireTester: () => Promise.resolve(tester),
      subjectOf: (t: any) => ({ isSuperuser: t.is_superuser, permissions: t.permissions }),
    }));
    let signedKey = "";
    vi.doMock("../src/server/s3presign", () => ({
      spacesConfigured: () => true,
      presignPut: (key: string) => { signedKey = key; return { url: `https://pyrax.tor1.digitaloceanspaces.com/${key}`, publicUrl: `https://cdn/${key}`, headers: {} }; },
    }));
    const mod = await import("../src/pages/api/uploads/sign");
    const res = await mod.POST({
      cookies: { get: () => undefined },
      request: new Request("https://devnet.pyraxchain.com/api/uploads/sign", {
        method: "POST", headers: { origin: "https://devnet.pyraxchain.com", "content-type": "application/json" }, body: JSON.stringify(body),
      }),
    } as any);
    vi.doUnmock("../src/server/guard");
    vi.doUnmock("../src/server/s3presign");
    return { res, body: await res.json(), signedKey };
  }

  const submitter = { id: "t_sub", is_superuser: false, permissions: ["dashboard.view", "issues.view", "issues.submit"] };
  const viewer = { id: "t_view", is_superuser: false, permissions: ["dashboard.view", "issues.view"] };

  it("H3: not signed in => 401; a tester without issues.submit => 403 (no presign)", async () => {
    const anon = await callSign(null, { filename: "x.png", contentType: "image/png", size: 10 });
    expect(anon.res.status).toBe(401);
    const denied = await callSign(viewer, { filename: "x.png", contentType: "image/png", size: 10 });
    expect(denied.res.status).toBe(403);
    expect(denied.signedKey).toBe(""); // presign was never called for an unentitled tester
  });

  it("H2: a traversal / injection filename cannot escape the tester's OWN prefix (no separator survives)", async () => {
    // Payload packs traversal, path separators, whitespace, a NUL, and a newline into the filename.
    const evil = await callSign(submitter, { filename: "../../../../etc/passwd .png\x00\n/t_view/pwn", contentType: "image/png", size: 10 });
    expect(evil.res.status).toBe(200);
    // The key is ALWAYS devnet/issues/<tester.id>/<hex>-<sanitized-basename>. The security property is
    // that NO path separator / control char from the filename survives, so the object can't be written
    // outside the tester's own prefix. (Literal "." chars may remain — cosmetic in a FLAT S3 key
    // namespace with no filesystem to traverse; what matters is "/" is gone and the prefix is fixed.)
    expect(evil.signedKey.startsWith(`devnet/issues/${submitter.id}/`)).toBe(true);
    const basename = evil.signedKey.slice(`devnet/issues/${submitter.id}/`.length);
    expect(basename).not.toContain("/");                 // no separator => cannot climb into another prefix
    expect(basename).not.toContain(" ");                 // whitespace sanitized
    expect(/[\x00-\x1f]/.test(basename)).toBe(false);    // NUL / control chars sanitized (no key-poisoning)
    expect(evil.signedKey).not.toContain("/t_view/");    // cannot land in ANOTHER tester's prefix
    // Sanitized basename is only the safe charset [a-zA-Z0-9._-] after the random hex prefix.
    expect(/^[0-9a-f]+-[a-zA-Z0-9._-]+$/.test(basename)).toBe(true);
  });

  it("H4: an oversized file (image > 10MB) is refused; an unsupported type is refused", async () => {
    const tooBig = await callSign(submitter, { filename: "big.png", contentType: "image/png", size: 11 * 1024 * 1024 });
    expect(tooBig.res.status).toBe(422);
    expect(tooBig.signedKey).toBe("");
    const badType = await callSign(submitter, { filename: "run.exe", contentType: "application/x-msdownload", size: 10 });
    expect(badType.res.status).toBe(422);
    expect(badType.signedKey).toBe("");
  });

  it("H3b: a valid image request from an entitled tester DOES presign (proves the gate isn't deny-all)", async () => {
    const ok = await callSign(submitter, { filename: "shot.png", contentType: "image/png", size: 1234 });
    expect(ok.res.status).toBe(200);
    expect(ok.body.ok).toBe(true);
    expect(ok.signedKey.startsWith(`devnet/issues/${submitter.id}/`)).toBe(true);
  });
});

describe("hostile bucket-listing XML (H5)", () => {
  it("H5: parseListObjectsV2 is total (never throws) and returns keys as inert string DATA", () => {
    for (const xml of ["", "<garbage", "<Contents><Key></Key></Contents>", "<Contents><Key>node/x.exe</Key><Size>1</Size></Contents>", "<Contents><Key>" + "A".repeat(50000) + "</Key></Contents>"]) {
      const page = s3.parseListObjectsV2(xml);
      expect(Array.isArray(page.objects)).toBe(true);
      for (const o of page.objects) { expect(typeof o.key).toBe("string"); expect(typeof o.size).toBe("number"); }
    }
    // A hostile bucket key that embeds markup is returned VERBATIM as data — the parser does not (and
    // must not) execute or strip it; XSS is prevented at RENDER time (React/Astro text-escaping + CSP),
    // never by trusting the bucket. This test locks that the parser stays inert + total: it returns the
    // markup as an ordinary string and does not throw, so downstream escaping is the single defense.
    const s = s3.parseListObjectsV2("<Contents><Key>node/<script>alert(1)</script>.exe</Key><Size>1</Size></Contents>");
    expect(s.objects.length).toBe(1);
    expect(typeof s.objects[0].key).toBe("string"); // inert data; render layer must escape it
  });
});

describe("node heartbeat token gate (H6)", () => {
  it("H6: heartbeat with a missing/garbage Bearer token is 401 (no telemetry accepted)", async () => {
    vi.resetModules();
    // Mock the DB boundary: nodeByToken returns null for anything unknown; the rate limiter is real.
    vi.doMock("../src/server/db", () => ({
      nodeByToken: (_t: string) => Promise.resolve(null),
      recordHeartbeat: () => Promise.resolve(),
      init: () => Promise.resolve(),
    }));
    const mod = await import("../src/pages/api/node/heartbeat");
    const noAuth = await mod.POST({ request: new Request("https://x/api/node/heartbeat", { method: "POST", body: "{}" }), clientAddress: "203.0.113.9" } as any);
    expect(noAuth.status).toBe(401);
    const garbage = await mod.POST({ request: new Request("https://x/api/node/heartbeat", { method: "POST", headers: { authorization: "Bearer nope" }, body: "{}" }), clientAddress: "203.0.113.10" } as any);
    expect(garbage.status).toBe(401);
    vi.doUnmock("../src/server/db");
  });
});
