// SPDX-License-Identifier: LicenseRef-Proprietary
// Issue Council attachment validation (stored link-injection defense). An attachment url is later
// rendered to every viewer as <a href>/<img src>/<video src>, so a tester must not be able to store an
// arbitrary off-CDN link or a bogus type. Only a url under THIS tester's own presigned CDN prefix, with
// a known kind, is accepted.
import { describe, it, expect } from "vitest";
import { cdnBase, testerUploadPrefix, sanitizeAttachment, sanitizeAttachments, normalizeContentHash } from "../src/server/attachments";

const ENV = { SPACES_REGION: "tor1", SPACES_BUCKET: "pyrax" } as NodeJS.ProcessEnv;
const CDN = "https://pyrax.tor1.cdn.digitaloceanspaces.com";
const ME = "tester_abc";
const good = (name = "shot.png", type = "image") => ({ url: `${CDN}/devnet/issues/${ME}/deadbeef-${name}`, type, name, size: 1234 });

describe("cdnBase / testerUploadPrefix", () => {
  it("derives the CDN base + per-tester prefix from bucket/region (matching s3presign.ts)", () => {
    expect(cdnBase(ENV)).toBe(CDN);
    expect(testerUploadPrefix(ME, ENV)).toBe(`${CDN}/devnet/issues/${ME}/`);
  });
});

describe("sanitizeAttachment", () => {
  it("accepts a well-formed attachment under the tester's own prefix", () => {
    const a = sanitizeAttachment(good(), ME, ENV);
    expect(a).toEqual({ url: `${CDN}/devnet/issues/${ME}/deadbeef-shot.png`, type: "image", name: "shot.png", size: 1234 });
  });

  it("accepts the video + log kinds too", () => {
    expect(sanitizeAttachment(good("clip.mp4", "video"), ME, ENV)?.type).toBe("video");
    expect(sanitizeAttachment(good("out.log", "log"), ME, ENV)?.type).toBe("log");
  });

  it("REJECTS an off-CDN phishing/tracking url (stored link injection)", () => {
    expect(sanitizeAttachment({ url: "https://evil.example.com/steal.png", type: "image", name: "x" }, ME, ENV)).toBeNull();
    expect(sanitizeAttachment({ url: "http://pyrax.tor1.cdn.digitaloceanspaces.com/devnet/issues/" + ME + "/x", type: "image", name: "x" }, ME, ENV)).toBeNull(); // http, not https
  });

  it("REJECTS another tester's prefix (can't attribute someone else's upload / cross-tenant url)", () => {
    expect(sanitizeAttachment({ url: `${CDN}/devnet/issues/tester_victim/x.png`, type: "image", name: "x" }, ME, ENV)).toBeNull();
  });

  it("REJECTS a url outside the issues namespace even on the right CDN", () => {
    expect(sanitizeAttachment({ url: `${CDN}/email/pyrax-logo.png`, type: "image", name: "x" }, ME, ENV)).toBeNull();
    // Prefix-confusion: a sibling tester id that merely starts with ours must not pass.
    expect(sanitizeAttachment({ url: `${CDN}/devnet/issues/${ME}_evil/x.png`, type: "image", name: "x" }, ME, ENV)).toBeNull();
  });

  it("REJECTS an unknown / bogus type", () => {
    expect(sanitizeAttachment({ ...good(), type: "html" }, ME, ENV)).toBeNull();
    expect(sanitizeAttachment({ ...good(), type: "" }, ME, ENV)).toBeNull();
    expect(sanitizeAttachment({ ...good(), type: undefined }, ME, ENV)).toBeNull();
  });

  it("REJECTS traversal / control chars / empty tail past the prefix", () => {
    expect(sanitizeAttachment({ url: `${CDN}/devnet/issues/${ME}/../other/x.png`, type: "image", name: "x" }, ME, ENV)).toBeNull();
    expect(sanitizeAttachment({ url: `${CDN}/devnet/issues/${ME}/`, type: "image", name: "x" }, ME, ENV)).toBeNull();
    expect(sanitizeAttachment({ url: `${CDN}/devnet/issues/${ME}/a b.png`, type: "image", name: "x" }, ME, ENV)).toBeNull();
  });

  it("is total for junk inputs (never throws)", () => {
    for (const junk of [null, undefined, 42, "str", {}, { url: 123 }, { type: "image" }]) {
      expect(sanitizeAttachment(junk as any, ME, ENV)).toBeNull();
    }
  });

  it("bounds name to 120 chars and coerces size", () => {
    const a = sanitizeAttachment({ ...good(), name: "x".repeat(500), size: -5 }, ME, ENV);
    expect(a?.name.length).toBe(120);
    expect(a?.size).toBe(0);
  });
});

describe("Product Test proof fields: stepIndex + contentHash (anti-fraud)", () => {
  const H = "a".repeat(64);
  it("keeps a well-formed stepIndex + SHA-256 contentHash", () => {
    const a = sanitizeAttachment({ ...good("clip.mp4", "video"), stepIndex: 3, contentHash: H }, ME, ENV);
    expect(a?.stepIndex).toBe(3);
    expect(a?.contentHash).toBe(H);
  });
  it("drops a non-64-hex or non-string contentHash (advisory only, never trusted)", () => {
    expect(sanitizeAttachment({ ...good(), contentHash: "xyz" }, ME, ENV)?.contentHash).toBeUndefined();
    expect(sanitizeAttachment({ ...good(), contentHash: "A".repeat(64) }, ME, ENV)?.contentHash).toBe("a".repeat(64)); // lower-cased
    expect(sanitizeAttachment({ ...good(), contentHash: 123 }, ME, ENV)?.contentHash).toBeUndefined();
    expect(sanitizeAttachment({ ...good(), contentHash: "g".repeat(64) }, ME, ENV)?.contentHash).toBeUndefined();
  });
  it("drops a negative / non-numeric stepIndex", () => {
    expect(sanitizeAttachment({ ...good(), stepIndex: -1 }, ME, ENV)?.stepIndex).toBeUndefined();
    expect(sanitizeAttachment({ ...good(), stepIndex: "2" }, ME, ENV)?.stepIndex).toBeUndefined();
  });
  it("normalizeContentHash validates 64-hex + lower-cases", () => {
    expect(normalizeContentHash(H)).toBe(H);
    expect(normalizeContentHash("F".repeat(64))).toBe("f".repeat(64));
    expect(normalizeContentHash("short")).toBeUndefined();
    expect(normalizeContentHash(null)).toBeUndefined();
  });
});

describe("sanitizeAttachments", () => {
  it("drops invalid entries, keeps valid ones, and caps at 8", () => {
    const list = [
      good("a.png"),
      { url: "https://evil.com/x", type: "image", name: "bad" },
      good("b.mp4", "video"),
      ...Array.from({ length: 10 }, (_, i) => good(`f${i}.png`)),
    ];
    const out = sanitizeAttachments(list, ME, ENV);
    expect(out.length).toBe(8);
    expect(out.every((a) => a.url.startsWith(testerUploadPrefix(ME, ENV)))).toBe(true);
    expect(out.some((a) => a.name === "bad")).toBe(false);
  });

  it("honors a higher cap (Product Test submissions allow a proof per step)", () => {
    const list = Array.from({ length: 20 }, (_, i) => good(`f${i}.png`));
    expect(sanitizeAttachments(list, ME, ENV, 24).length).toBe(20);
    expect(sanitizeAttachments(list, ME, ENV).length).toBe(8); // default cap unchanged
  });

  it("returns [] for non-arrays", () => {
    expect(sanitizeAttachments(undefined, ME, ENV)).toEqual([]);
    expect(sanitizeAttachments("nope" as any, ME, ENV)).toEqual([]);
  });
});
