// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Chat-token HMAC semantics + the real fail-closed module-load guard on DEVNET_CHAT_SECRET. Uses
// dynamic import + vi.resetModules so each case re-evaluates the module under a chosen environment.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const ORIG = { ...process.env };

beforeEach(() => {
  vi.resetModules();
});
afterEach(() => {
  process.env = { ...ORIG };
});

describe("DEVNET_CHAT_SECRET fail-closed guard", () => {
  it("throws on import in production when the secret is unset", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.DEVNET_CHAT_SECRET;
    await expect(import("../src/lib/chat-token")).rejects.toThrow(/DEVNET_CHAT_SECRET/);
  });

  it("throws on import in production when the secret is the dev default", async () => {
    process.env.NODE_ENV = "production";
    process.env.DEVNET_CHAT_SECRET = "dev-chat-secret-change-me";
    await expect(import("../src/lib/chat-token")).rejects.toThrow(/DEVNET_CHAT_SECRET/);
  });

  it("imports fine in production with a real secret", async () => {
    process.env.NODE_ENV = "production";
    process.env.DEVNET_CHAT_SECRET = "a-genuinely-strong-shared-secret";
    const mod = await import("../src/lib/chat-token");
    expect(typeof mod.signChatToken).toBe("function");
  });

  it("imports fine outside production without a secret (dev fallback)", async () => {
    process.env.NODE_ENV = "test";
    delete process.env.DEVNET_CHAT_SECRET;
    const mod = await import("../src/lib/chat-token");
    expect(typeof mod.signChatToken).toBe("function");
  });
});

describe("sign/verify chat token round-trip", () => {
  it("verifies a token it just signed, and rejects a tampered one", async () => {
    process.env.NODE_ENV = "test";
    process.env.DEVNET_CHAT_SECRET = "round-trip-secret";
    const { signChatToken, verifyChatToken } = await import("../src/lib/chat-token");
    const token = signChatToken({ uid: "u1", name: "Ada", user: "ada", admin: true, role: "admin" });
    const claims = verifyChatToken(token);
    expect(claims?.uid).toBe("u1");
    expect(claims?.admin).toBe(true);

    // Tamper with the payload → signature no longer matches → null.
    const [body, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ uid: "attacker", name: "x", user: "x", admin: true, role: "admin", exp: Math.floor(Date.now() / 1000) + 999 })).toString("base64url");
    expect(verifyChatToken(`${forged}.${sig}`)).toBeNull();
    expect(verifyChatToken(`${body}.deadbeef`)).toBeNull();
  });

  it("rejects an expired token", async () => {
    process.env.NODE_ENV = "test";
    process.env.DEVNET_CHAT_SECRET = "exp-secret";
    const { signChatToken, verifyChatToken } = await import("../src/lib/chat-token");
    const token = signChatToken({ uid: "u1", name: "Ada", user: "ada", admin: false, role: "tester" }, -10);
    expect(verifyChatToken(token)).toBeNull();
  });

  it("a token signed under one secret does not verify under another", async () => {
    process.env.NODE_ENV = "test";
    process.env.DEVNET_CHAT_SECRET = "secret-A";
    const a = await import("../src/lib/chat-token");
    const token = a.signChatToken({ uid: "u1", name: "Ada", user: "ada", admin: false, role: "tester" });

    vi.resetModules();
    process.env.DEVNET_CHAT_SECRET = "secret-B";
    const b = await import("../src/lib/chat-token");
    expect(b.verifyChatToken(token)).toBeNull();
  });
});
