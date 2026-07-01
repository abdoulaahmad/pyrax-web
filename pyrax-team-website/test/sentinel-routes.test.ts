// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Authz-consistency lock for the Sentinel issue routes: the ENDPOINT permission must never be
// weaker than the button the console renders the action under. Both Investigate and Dispatch are
// rendered only under `canApprove` (sentinel.approve) in sentinel.tsx, and both drive on-GPU brain
// inference + audit writes on the single edge Sentinel — so both endpoints must require
// `sentinel.approve`. A view-only user must not be able to POST here to trigger inference.
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { APIContext } from "astro";

// Capture what each route asks proxySentinel to enforce (mock stands in for the real proxy).
const calls: Array<{ permission: string; path: string; method?: string }> = [];
vi.mock("../src/server/sentinel", () => ({
  proxySentinel: (_cookies: unknown, permission: string, path: string, init?: { method?: string }) => {
    calls.push({ permission, path, method: init?.method });
    return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
  },
}));

const investigate = await import("../src/pages/api/sentinel/issues/[id]/investigate");
const dispatch = await import("../src/pages/api/sentinel/issues/[id]/dispatch");

const ctx = (id: string) => ({ cookies: {}, params: { id } }) as unknown as APIContext;

beforeEach(() => {
  calls.length = 0;
});

describe("Sentinel issue endpoints require the elevated approve permission", () => {
  it("investigate is gated on sentinel.approve (matches the UI + dispatch, not the weaker sentinel.view)", async () => {
    await investigate.POST(ctx("abc-123"));
    expect(calls).toHaveLength(1);
    expect(calls[0].permission).toBe("sentinel.approve");
    expect(calls[0].method).toBe("POST");
    expect(calls[0].path).toContain("/investigate");
    expect(calls[0].path).toContain("abc-123");
  });

  it("dispatch is gated on sentinel.approve", async () => {
    await dispatch.POST(ctx("xyz-9"));
    expect(calls).toHaveLength(1);
    expect(calls[0].permission).toBe("sentinel.approve");
  });

  it("the id is URL-encoded into the backend path (no injection of raw path chars)", async () => {
    await investigate.POST(ctx("a/b?c"));
    expect(calls[0].path).toContain(encodeURIComponent("a/b?c"));
    expect(calls[0].path).not.toContain("a/b?c");
  });
});
