// SPDX-License-Identifier: LicenseRef-Proprietary
// Chat token: HMAC sign/verify round-trip, tamper/expiry rejection, defensive claim-length clamps,
// and the production fail-closed secret guard.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const ORIG = { ...process.env };
beforeEach(() => { vi.resetModules(); });
afterEach(() => { process.env = { ...ORIG }; });

async function loadWith(secret: string | undefined, nodeEnv = "test") {
  if (secret === undefined) delete process.env.DEVNET_CHAT_SECRET; else process.env.DEVNET_CHAT_SECRET = secret;
  process.env.NODE_ENV = nodeEnv;
  return await import("../src/lib/chat-token");
}

const claims = { uid: "u_1", name: "Alice", user: "alice", admin: false, role: "tester" as const };

describe("sign/verify round-trip", () => {
  it("a freshly signed token verifies and returns the claims", async () => {
    const { signChatToken, verifyChatToken } = await loadWith("a-real-secret");
    const tok = signChatToken(claims);
    const out = verifyChatToken(tok);
    expect(out).not.toBeNull();
    expect(out!.user).toBe("alice");
    expect(out!.role).toBe("tester");
    expect(out!.admin).toBe(false);
  });
  it("rejects a tampered body and a tampered signature", async () => {
    const { signChatToken, verifyChatToken } = await loadWith("a-real-secret");
    const tok = signChatToken(claims);
    const [body, sig] = tok.split(".");
    expect(verifyChatToken(`${body}x.${sig}`)).toBeNull();
    expect(verifyChatToken(`${body}.${sig}x`)).toBeNull();
    expect(verifyChatToken("garbage")).toBeNull();
    expect(verifyChatToken("")).toBeNull();
  });
  it("rejects an expired token", async () => {
    const { signChatToken, verifyChatToken } = await loadWith("a-real-secret");
    const tok = signChatToken(claims, -10); // already expired
    expect(verifyChatToken(tok)).toBeNull();
  });
  it("a token signed under a different secret does not verify", async () => {
    const a = await loadWith("secret-A");
    const tok = a.signChatToken(claims);
    // Force a fresh module instance so the second import picks up the new secret (the SECRET is a
    // module-level const captured at eval time).
    vi.resetModules();
    const b = await loadWith("secret-B");
    expect(b.verifyChatToken(tok)).toBeNull();
  });
});

describe("defensive claim-length clamps (<=64)", () => {
  it("clamps name/user/uid to 64 chars on a validly-signed oversized token", async () => {
    const { signChatToken, verifyChatToken } = await loadWith("a-real-secret");
    const big = "x".repeat(500);
    const tok = signChatToken({ ...claims, name: big, user: big, uid: big });
    const out = verifyChatToken(tok);
    expect(out).not.toBeNull();
    expect(out!.name.length).toBe(64);
    expect(out!.user.length).toBe(64);
    expect(out!.uid.length).toBe(64);
  });
});

describe("fail-closed secret guard", () => {
  it("throws at load in production when the secret is unset", async () => {
    await expect(loadWith(undefined, "production")).rejects.toThrow(/DEVNET_CHAT_SECRET/);
  });
  it("throws at load in production when the secret is the dev default", async () => {
    await expect(loadWith("dev-chat-secret-change-me", "production")).rejects.toThrow(/DEVNET_CHAT_SECRET/);
  });
  it("loads fine in production with a real secret", async () => {
    const m = await loadWith("a-strong-production-secret", "production");
    expect(typeof m.signChatToken).toBe("function");
  });
  it("does NOT throw outside production even with no secret (dev convenience)", async () => {
    const m = await loadWith(undefined, "development");
    expect(typeof m.signChatToken).toBe("function");
  });
});
