// SPDX-License-Identifier: LicenseRef-Proprietary
// The SESSION_SECRET fail-closed guard in src/server/crypto.ts: production refuses to boot without a
// real secret, while dev falls back to an insecure default for convenience.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const ORIG = { ...process.env };
beforeEach(() => { vi.resetModules(); });
afterEach(() => { process.env = { ...ORIG }; });

async function loadCrypto(secret: string | undefined, nodeEnv: string) {
  if (secret === undefined) delete process.env.SESSION_SECRET; else process.env.SESSION_SECRET = secret;
  process.env.NODE_ENV = nodeEnv;
  return await import("../src/server/crypto");
}

describe("SESSION_SECRET fail-closed guard", () => {
  it("throws at module load in production when unset", async () => {
    await expect(loadCrypto(undefined, "production")).rejects.toThrow(/SESSION_SECRET/);
  });
  it("loads in production with a real secret and HMACs deterministically", async () => {
    const m = await loadCrypto("real-prod-secret", "production");
    expect(m.hmac("x")).toBe(m.hmac("x"));
  });
  it("does NOT throw in development without a secret (insecure dev fallback)", async () => {
    const m = await loadCrypto(undefined, "development");
    expect(typeof m.hmac).toBe("function");
  });
});
