// SPDX-License-Identifier: LicenseRef-Proprietary
// The Sentinel reporter's PII scrub is the load-bearing privacy guarantee for this surface (tester
// emails, OTP/magic-link secrets, sessions, wallet/node-pairing, push subs must NEVER leave the
// process). These tests pin scrubRoute + the fail-open no-op behavior when unconfigured.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// The reporter reads NOVA_AGENT_SECRET at MODULE LOAD, so import it fresh per env below.
const ORIG = { ...process.env };
beforeEach(() => { vi.resetModules(); });
afterEach(() => { process.env = { ...ORIG }; vi.restoreAllMocks(); });

async function load(secret?: string) {
  if (secret === undefined) delete process.env.NOVA_AGENT_SECRET; else process.env.NOVA_AGENT_SECRET = secret;
  return await import("../src/server/sentinel");
}

describe("scrubRoute — PII-free route normalization", () => {
  it("keeps a plain route readable", async () => {
    const { scrubRoute } = await load("x");
    expect(scrubRoute("/api/node/pair")).toBe("/api/node/pair");
    expect(scrubRoute("/api/dashboard")).toBe("/api/dashboard");
  });
  it("strips the query string (tokens/emails often ride there)", async () => {
    const { scrubRoute } = await load("x");
    expect(scrubRoute("/api/auth/verify?token=abc123def456ghi&email=a@b.com")).toBe("/api/auth/verify");
  });
  it("redacts an email in the path", async () => {
    const { scrubRoute } = await load("x");
    expect(scrubRoute("/api/testers/shawn@pyrax.org")).toBe("/api/testers/:redacted");
  });
  it("replaces numeric + long/mixed id segments with a placeholder", async () => {
    const { scrubRoute } = await load("x");
    expect(scrubRoute("/api/bugs/12345")).toBe("/api/bugs/:id");
    expect(scrubRoute("/api/node/tk_9fA3bQ8xZ2mP7wL1")).toBe("/api/node/:id");
    expect(scrubRoute("/api/x/deadbeefdeadbeefdeadbeef")).toBe("/api/x/:id");
  });
  it("never lets a raw token/email survive scrubbing", async () => {
    const { scrubRoute } = await load("x");
    const out = scrubRoute("/api/session/sid_abcdef0123456789abcdef?magic=SECRETmagiclink&e=t@e.com");
    expect(out).not.toMatch(/@/);
    expect(out).not.toContain("SECRETmagiclink");
    expect(out).not.toContain("sid_abcdef0123456789abcdef");
  });
});

describe("fail-open behavior", () => {
  it("is a silent no-op (no fetch) when NOVA_AGENT_SECRET is unset", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ok"));
    const { reportPortalError } = await load(undefined);
    reportPortalError({ err: new TypeError("boom"), route: "/api/dashboard" });
    // give any (wrongly) scheduled microtask a tick
    await Promise.resolve();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it("never throws even if fetch itself throws synchronously", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() => { throw new Error("net down"); });
    const { reportPortalError } = await load("real-secret");
    expect(() => reportPortalError({ err: new Error("x"), route: "/api/dashboard" })).not.toThrow();
  });
});
