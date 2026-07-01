// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Fail-closed secret guard. Locks the rule that, in production, a required secret left unset or at
// its public dev default refuses to boot (default-deny) — the invariant behind both SESSION_SECRET
// and DEVNET_CHAT_SECRET.
import { describe, it, expect } from "vitest";
import { resolveSecret } from "../src/lib/env-guard";

const NAME = "TEST_SECRET";
const DEV = "dev-default-value";

describe("resolveSecret() — production fail-closed", () => {
  it("throws in production when the secret is unset", () => {
    expect(() => resolveSecret({ value: "", devDefault: DEV, nodeEnv: "production", name: NAME })).toThrow(/TEST_SECRET/);
    expect(() => resolveSecret({ value: undefined, devDefault: DEV, nodeEnv: "production", name: NAME })).toThrow();
  });
  it("throws in production when the secret equals the dev default", () => {
    expect(() => resolveSecret({ value: DEV, devDefault: DEV, nodeEnv: "production", name: NAME })).toThrow(/TEST_SECRET/);
  });
  it("returns the real value in production when properly configured", () => {
    expect(resolveSecret({ value: "a-real-strong-secret", devDefault: DEV, nodeEnv: "production", name: NAME })).toBe("a-real-strong-secret");
  });
});

describe("resolveSecret() — non-production", () => {
  it("falls back to the dev default when unset outside production", () => {
    expect(resolveSecret({ value: "", devDefault: DEV, nodeEnv: "development", name: NAME })).toBe(DEV);
    expect(resolveSecret({ value: undefined, devDefault: DEV, nodeEnv: undefined, name: NAME })).toBe(DEV);
  });
  it("uses a provided value outside production", () => {
    expect(resolveSecret({ value: "local-override", devDefault: DEV, nodeEnv: "test", name: NAME })).toBe("local-override");
  });
});
