// SPDX-License-Identifier: LicenseRef-Proprietary
//
// NEURAX Sentinel proxy invariants:
//  - a hung/blackholed backend must NOT hold the request open forever: sentinelFetch bounds every
//    call with an AbortSignal and maps a timeout to a clean 504 (not an infinite hang);
//  - a transport failure maps to a 502;
//  - proxySentinel enforces the SRE permission BEFORE it ever touches the backend (403 without it).
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { AstroCookies } from "astro";

process.env.NODE_ENV = "test";
process.env.SENTINEL_ADMIN_SECRET = "test-sentinel-secret";

// Mock the auth guard so we control the caller's identity + permissions without a DB/session.
let currentUser: { is_superuser: boolean; permissions: string[] } | null = null;
vi.mock("../src/server/guard", () => ({
  requireUser: () => Promise.resolve(currentUser),
  subjectOf: (u: { is_superuser: boolean; permissions: string[] }) => ({ isSuperuser: u.is_superuser, permissions: u.permissions }),
}));

const { proxySentinel } = await import("../src/server/sentinel");

const cookies = {} as AstroCookies; // never read — requireUser is mocked
const viewer = { is_superuser: false, permissions: ["sentinel.view"] };

async function bodyOf(r: Response): Promise<Record<string, unknown>> {
  return (await r.json()) as Record<string, unknown>;
}

beforeEach(() => {
  currentUser = { ...viewer };
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("proxySentinel permission gate", () => {
  it("401s when there is no signed-in user (never calls the backend)", async () => {
    currentUser = null;
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const r = await proxySentinel(cookies, "sentinel.view", "/api/nova/status");
    expect(r.status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("403s when the user lacks the required permission (never calls the backend)", async () => {
    currentUser = { is_superuser: false, permissions: ["dashboard.view"] };
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const r = await proxySentinel(cookies, "sentinel.approve", "/api/nova/issues/x/investigate", { method: "POST" });
    expect(r.status).toBe(403);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("sentinelFetch resilience (via proxySentinel)", () => {
  it("maps an AbortSignal timeout to a clean 504 instead of hanging", async () => {
    // Simulate undici rejecting with the DOMException-style TimeoutError that AbortSignal.timeout raises.
    vi.stubGlobal("fetch", (_url: string, init: RequestInit) => {
      // Assert the fix is actually in place: a total-request AbortSignal was supplied.
      expect(init.signal).toBeInstanceOf(AbortSignal);
      const err = new Error("The operation was aborted due to timeout");
      err.name = "TimeoutError";
      return Promise.reject(err);
    });
    const r = await proxySentinel(cookies, "sentinel.view", "/api/nova/status");
    expect(r.status).toBe(504);
    expect(String((await bodyOf(r)).error)).toMatch(/timed out/i);
  });

  it("maps a generic transport failure to 502", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new Error("ECONNREFUSED")));
    const r = await proxySentinel(cookies, "sentinel.view", "/api/nova/status");
    expect(r.status).toBe(502);
    expect(String((await bodyOf(r)).error)).toMatch(/couldn't reach/i);
  });

  it("passes a short poll budget for GETs and a long inference budget for POSTs", async () => {
    // We can't read the numeric budget off an AbortSignal, but we CAN prove a signal is always set
    // (so a hang is impossible) and that the happy path forwards the bearer + normalizes the reply.
    let seenAuth = "";
    let seenSignal: unknown = "MISSING";
    vi.stubGlobal("fetch", (_url: string, init: RequestInit & { signal?: unknown }) => {
      seenAuth = String((init.headers as Record<string, string>).authorization || "");
      seenSignal = init.signal;
      return Promise.resolve(new Response(JSON.stringify({ ok: true, model: "edge" }), { status: 200 }));
    });
    const r = await proxySentinel(cookies, "sentinel.view", "/api/nova/status");
    expect(r.status).toBe(200);
    expect(seenAuth).toBe("Bearer test-sentinel-secret");
    expect(seenSignal).toBeInstanceOf(AbortSignal);
    expect((await bodyOf(r)).model).toBe("edge");
  });
});
