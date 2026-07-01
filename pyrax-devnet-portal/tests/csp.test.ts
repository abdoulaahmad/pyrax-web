// SPDX-License-Identifier: LicenseRef-Proprietary
// CSP builder: derives the chat-WS + Spaces + Giphy allowances from env, degrades safely when those
// aren't configured, and never emits an empty/dangling directive. Regression cover for the hardening
// CSP that would otherwise block chat GIFs and Issue Council attachment upload/display in production.
import { describe, it, expect } from "vitest";
import { buildCsp, chatWsOrigin, spacesOrigins } from "../src/lib/csp";

const base = (over: Record<string, string | undefined> = {}) => ({ ...over }) as NodeJS.ProcessEnv;

describe("chatWsOrigin()", () => {
  it("derives a ws/wss origin (stripping path/query)", () => {
    expect(chatWsOrigin(base({ CHAT_WS_URL: "wss://chat.pyraxchain.com/socket?x=1" }))).toBe("wss://chat.pyraxchain.com");
    expect(chatWsOrigin(base({ CHAT_WS_URL: "ws://localhost:8788" }))).toBe("ws://localhost:8788");
  });
  it("rejects non-ws schemes and junk (no extra origin)", () => {
    expect(chatWsOrigin(base({ CHAT_WS_URL: "https://evil.com" }))).toBe("");
    expect(chatWsOrigin(base({ CHAT_WS_URL: "not a url" }))).toBe("");
    expect(chatWsOrigin(base())).toBe("");
  });
});

describe("spacesOrigins()", () => {
  it("is null unless BOTH key + secret are set", () => {
    expect(spacesOrigins(base())).toBeNull();
    expect(spacesOrigins(base({ SPACES_KEY: "k" }))).toBeNull();
    expect(spacesOrigins(base({ SPACES_SECRET: "s" }))).toBeNull();
  });
  it("derives upload + cdn hosts from bucket/region (matching s3presign.ts)", () => {
    const o = spacesOrigins(base({ SPACES_KEY: "k", SPACES_SECRET: "s", SPACES_REGION: "tor1", SPACES_BUCKET: "pyrax" }));
    expect(o).toEqual({
      upload: "https://pyrax.tor1.digitaloceanspaces.com",
      cdn: "https://pyrax.tor1.cdn.digitaloceanspaces.com",
    });
  });
});

describe("buildCsp()", () => {
  it("with chat + Spaces configured, permits the WSS, the bucket upload, the CDN, and Giphy", () => {
    const csp = buildCsp(base({ CHAT_WS_URL: "wss://chat.pyraxchain.com", SPACES_KEY: "k", SPACES_SECRET: "s" }));
    expect(csp).toMatch(/connect-src 'self' wss:\/\/chat\.pyraxchain\.com https:\/\/pyrax\.tor1\.digitaloceanspaces\.com/);
    expect(csp).toMatch(/img-src 'self' data: https:\/\/\*\.giphy\.com https:\/\/pyrax\.tor1\.cdn\.digitaloceanspaces\.com/);
    expect(csp).toMatch(/media-src 'self' https:\/\/pyrax\.tor1\.cdn\.digitaloceanspaces\.com/);
  });
  it("degrades safely with nothing configured — no empty/dangling directives", () => {
    const csp = buildCsp(base());
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("img-src 'self' data: https://*.giphy.com"); // Giphy is always allowed
    expect(csp).toContain("media-src 'self'");
    // No directive ends with a stray separator/space (would be an empty/invalid source list).
    for (const d of csp.split("; ")) {
      expect(d.trim()).toBe(d);
      expect(d.endsWith(" ")).toBe(false);
    }
  });
  it("keeps the locked-down baseline directives", () => {
    const csp = buildCsp(base());
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
  });
});
