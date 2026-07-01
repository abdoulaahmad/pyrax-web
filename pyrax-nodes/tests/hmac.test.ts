// SPDX-License-Identifier: LicenseRef-Proprietary
// HMAC gate: canonical string, ±90s window, single-use replay, constant-time compare, and the
// usingDevSecret()/ingestSecretReady() fail-closed guard.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import crypto from "node:crypto";

const SECRET = "test-secret-abc123";

// Build a valid PYRAX-HMAC Authorization header for the given request, matching the server's canonical
// string: `${METHOD}\n${PATH}\n${ts}\n${sha256hex(body)}`.
function signHeader(method: string, path: string, body: string, ts: number, secret = SECRET): string {
  const bodyHash = crypto.createHash("sha256").update(body || "").digest("hex");
  const canon = `${method}\n${path}\n${ts}\n${bodyHash}`;
  const sig = crypto.createHmac("sha256", secret).update(canon).digest("hex");
  return `PYRAX-HMAC ts=${ts},sig=${sig}`;
}

// Import hmac.ts fresh with a controlled environment (SECRET/NODE_ENV are read at module-load for some
// helpers), so each scenario gets a clean module instance + replay cache.
async function freshHmac(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return await import("../src/server/hmac");
}

describe("verifyHmac", () => {
  beforeEach(() => { vi.useRealTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("accepts a correctly signed request", async () => {
    const { verifyHmac } = await freshHmac({ PYRAX_DIRECTORY_SECRET: SECRET, NODE_ENV: "production" });
    const body = JSON.stringify({ hello: "world" });
    const header = signHeader("POST", "/api/announce", body, Date.now());
    expect(verifyHmac("POST", "/api/announce", body, header)).toBe(true);
  });

  it("rejects a tampered body (canonical string includes the body hash)", async () => {
    const { verifyHmac } = await freshHmac({ PYRAX_DIRECTORY_SECRET: SECRET });
    const ts = Date.now();
    const header = signHeader("POST", "/api/announce", JSON.stringify({ a: 1 }), ts);
    // Same signature, different body → hash mismatch → reject.
    expect(verifyHmac("POST", "/api/announce", JSON.stringify({ a: 2 }), header)).toBe(false);
  });

  it("rejects when the method or path differs (bound into the canonical string)", async () => {
    const { verifyHmac } = await freshHmac({ PYRAX_DIRECTORY_SECRET: SECRET });
    const body = "";
    const ts = Date.now();
    const header = signHeader("POST", "/api/announce", body, ts);
    expect(verifyHmac("GET", "/api/announce", body, header)).toBe(false);
    expect(verifyHmac("POST", "/api/deregister", body, header)).toBe(false);
  });

  it("rejects a signature made with the wrong secret", async () => {
    const { verifyHmac } = await freshHmac({ PYRAX_DIRECTORY_SECRET: SECRET });
    const body = "{}";
    const ts = Date.now();
    const header = signHeader("POST", "/api/announce", body, ts, "a-different-secret");
    expect(verifyHmac("POST", "/api/announce", body, header)).toBe(false);
  });

  it("enforces the ±90s clock window", async () => {
    const { verifyHmac } = await freshHmac({ PYRAX_DIRECTORY_SECRET: SECRET });
    const now = Date.now();
    const body = "{}";
    // 91s in the past → outside the window.
    const oldHeader = signHeader("POST", "/api/announce", body, now - 91_000);
    expect(verifyHmac("POST", "/api/announce", body, oldHeader)).toBe(false);
    // 91s in the future → outside the window.
    const futureHeader = signHeader("POST", "/api/announce", body, now + 91_000);
    expect(verifyHmac("POST", "/api/announce", body, futureHeader)).toBe(false);
    // 89s in the past → still inside.
    const okHeader = signHeader("POST", "/api/announce", body, now - 89_000);
    expect(verifyHmac("POST", "/api/announce", body, okHeader)).toBe(true);
  });

  it("is single-use: replaying the same signature is rejected", async () => {
    const { verifyHmac } = await freshHmac({ PYRAX_DIRECTORY_SECRET: SECRET });
    const body = JSON.stringify({ peerId: "abc123" });
    const header = signHeader("POST", "/api/announce", body, Date.now());
    expect(verifyHmac("POST", "/api/announce", body, header)).toBe(true);  // first use ok
    expect(verifyHmac("POST", "/api/announce", body, header)).toBe(false); // replay rejected
  });

  it("rejects malformed / missing Authorization headers", async () => {
    const { verifyHmac } = await freshHmac({ PYRAX_DIRECTORY_SECRET: SECRET });
    expect(verifyHmac("POST", "/api/announce", "", null)).toBe(false);
    expect(verifyHmac("POST", "/api/announce", "", "Bearer x")).toBe(false);
    expect(verifyHmac("POST", "/api/announce", "", "PYRAX-HMAC ts=,sig=")).toBe(false);
    expect(verifyHmac("POST", "/api/announce", "", "PYRAX-HMAC ts=abc,sig=def")).toBe(false);
  });

  it("uses a constant-time comparison (length-mismatched sig rejected without throw)", async () => {
    const { verifyHmac } = await freshHmac({ PYRAX_DIRECTORY_SECRET: SECRET });
    const ts = Date.now();
    // A sig that's the wrong length must be rejected (and must not throw on timingSafeEqual).
    expect(() => verifyHmac("POST", "/api/announce", "", `PYRAX-HMAC ts=${ts},sig=deadbeef`)).not.toThrow();
    expect(verifyHmac("POST", "/api/announce", "", `PYRAX-HMAC ts=${ts},sig=deadbeef`)).toBe(false);
  });
});

describe("dev-secret fail-closed guard", () => {
  it("usingDevSecret() is true when no secret is configured", async () => {
    const { usingDevSecret } = await freshHmac({ PYRAX_DIRECTORY_SECRET: undefined });
    expect(usingDevSecret()).toBe(true);
  });

  it("usingDevSecret() is false when a real secret is set", async () => {
    const { usingDevSecret } = await freshHmac({ PYRAX_DIRECTORY_SECRET: SECRET });
    expect(usingDevSecret()).toBe(false);
  });

  it("ingestSecretReady() is FALSE in production with the dev secret (ingest must refuse)", async () => {
    const m = await freshHmac({ PYRAX_DIRECTORY_SECRET: undefined, NODE_ENV: "production" });
    expect(m.ingestSecretReady()).toBe(false);
  });

  it("ingestSecretReady() is TRUE in production with a real secret", async () => {
    const m = await freshHmac({ PYRAX_DIRECTORY_SECRET: SECRET, NODE_ENV: "production" });
    expect(m.ingestSecretReady()).toBe(true);
  });

  it("ingestSecretReady() is TRUE outside production even with the dev secret (local dev works)", async () => {
    const m = await freshHmac({ PYRAX_DIRECTORY_SECRET: undefined, NODE_ENV: "development" });
    expect(m.ingestSecretReady()).toBe(true);
  });
});
