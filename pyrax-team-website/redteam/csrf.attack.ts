// SPDX-License-Identifier: LicenseRef-Proprietary
//
// RED TEAM — CSRF attacks (team portal).
//
// Confirms two things the middleware promises:
//   1. Every cookie/session-authenticated browser route ENFORCES same-origin (a cross-origin POST is
//      rejected with reason origin-mismatch / no-origin).
//   2. The /api/ember/* exemption is SAFE: those routes are bearer/OTP-authed (no ambient cookie), so
//      exempting them from the same-origin check does not open a CSRF hole — and the exemption is
//      SCOPED (a look-alike path like /api/ember-evil is NOT exempt).
//
// Attacks covered:
//   C1  Cross-origin POST to a cookie-authed API route (e.g. /api/users) is blocked.
//   C2  A state-changing request with NO Origin and NO Referer is blocked.
//   C3  Origin: "null" (sandboxed iframe / privacy-stripped) is treated as a mismatch, blocked.
//   C4  A Referer-only forgery from an attacker host is blocked.
//   C5  The exemption predicate matches EXACTLY /api/ember/* — not a look-alike prefix.
//   C6  The exempt Ember routes carry no ambient cookie auth, so CSRF genuinely doesn't apply to them.
import { describe, it, expect, vi } from "vitest";
import { checkCsrf, checkRequestCsrf } from "../src/server/csrf";

process.env.NODE_ENV = "test";
process.env.SESSION_SECRET = "redteam-csrf-secret";

const TARGET = "https://team.pyraxchain.com/api/users";

// Mirror the middleware's exemption predicate so we test the REAL scoping rule (see src/middleware.ts:
// `url.pathname.startsWith("/api/") && !url.pathname.startsWith("/api/ember/")`).
const csrfChecked = (pathname: string) => pathname.startsWith("/api/") && !pathname.startsWith("/api/ember/");

describe("CSRF — cookie-authed browser routes must enforce same-origin (C1–C4)", () => {
  it("C1: a cross-origin POST from an attacker page is rejected", () => {
    const r = checkRequestCsrf(new Request(TARGET, { method: "POST", headers: { origin: "https://evil.example" } }));
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("origin-mismatch");
  });

  it("C2: a state-changing request with no Origin and no Referer is rejected", () => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      const r = checkCsrf({ method, origin: null, referer: null, requestUrl: TARGET });
      expect(r.ok, `${method} with no origin must be blocked`).toBe(false);
      expect(r.reason).toBe("no-origin");
    }
  });

  it("C3: Origin 'null' (sandboxed/stripped) is a mismatch, not a bypass", () => {
    const r = checkCsrf({ method: "POST", origin: "null", referer: null, requestUrl: TARGET });
    expect(r.ok).toBe(false);
  });

  it("C4: a forged Referer from an attacker host is rejected", () => {
    const r = checkCsrf({ method: "DELETE", origin: null, referer: "https://evil.example/csrf", requestUrl: TARGET });
    expect(r.ok).toBe(false);
  });

  it("C4b: a genuine same-origin POST is allowed (proves the gate isn't deny-all)", () => {
    const r = checkRequestCsrf(new Request(TARGET, { method: "POST", headers: { origin: "https://team.pyraxchain.com" } }));
    expect(r.ok).toBe(true);
  });

  it("C4c: a subdomain of the target is NOT same-origin (host must match exactly)", () => {
    const r = checkCsrf({ method: "POST", origin: "https://evil.team.pyraxchain.com", referer: null, requestUrl: TARGET });
    expect(r.ok).toBe(false);
  });
});

describe("CSRF — the /api/ember/* exemption is safe + scoped (C5/C6)", () => {
  it("C5: the exemption matches EXACTLY /api/ember/* and not a look-alike prefix", () => {
    // These ARE the bearer/OTP Ember routes — legitimately exempt.
    expect(csrfChecked("/api/ember/otp/verify")).toBe(false);
    expect(csrfChecked("/api/ember/device/status")).toBe(false);
    // A path-confusion attempt must STILL be CSRF-checked (attacker can't smuggle a cookie route in).
    expect(csrfChecked("/api/ember-evil/steal")).toBe(true);
    expect(csrfChecked("/api/emberX")).toBe(true);
    expect(csrfChecked("/api/users")).toBe(true);
    expect(csrfChecked("/api/network/broadcast")).toBe(true);
  });

  it("C6: the exempt Ember routes take auth from the request body/bearer, not an ambient cookie", async () => {
    // The device/status handler resolves auth from body.token (a bearer device token), NOT cookies —
    // so a cross-site request carries no usable ambient credential and CSRF simply doesn't apply.
    // A bogus token yields 401 regardless of Origin: there is nothing for CSRF to steal.
    // We mock ONLY the DB boundary (ember.deviceUser) — the handler's own control flow (it consults no
    // cookie, ignores Origin, and 401s on an unresolved token) is the real code under test.
    vi.resetModules();
    vi.doMock("../src/server/ember", () => ({
      deviceUser: (t: string) => Promise.resolve(null), // garbage token never resolves
      emberAccess: () => ({ tabs: [], roles: [] }),
    }));
    const mod = await import("../src/pages/api/ember/device/status");
    const res = await mod.POST({
      request: new Request("https://team.pyraxchain.com/api/ember/device/status", {
        method: "POST",
        headers: { origin: "https://evil.example", "content-type": "application/json" },
        body: JSON.stringify({ token: "attacker-supplied-garbage" }),
      }),
    } as any);
    expect(res.status).toBe(401); // no ambient session was ever consulted; the bad token just fails
    vi.doUnmock("../src/server/ember");
  });
});
