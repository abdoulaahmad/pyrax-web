// SPDX-License-Identifier: LicenseRef-Proprietary
//
// CSRF same-origin invariants. Locks: safe methods always pass; state-changing methods require an
// Origin (or Referer) whose host matches the target host; a foreign or absent Origin is rejected.
import { describe, it, expect } from "vitest";
import { checkCsrf, checkRequestCsrf } from "../src/server/csrf";

const TARGET = "https://team.pyraxchain.com/api/users";

describe("checkCsrf()", () => {
  it("allows safe methods regardless of Origin", () => {
    expect(checkCsrf({ method: "GET", origin: "https://evil.com", referer: null, requestUrl: TARGET }).ok).toBe(true);
    expect(checkCsrf({ method: "HEAD", origin: null, referer: null, requestUrl: TARGET }).ok).toBe(true);
    expect(checkCsrf({ method: "OPTIONS", origin: null, referer: null, requestUrl: TARGET }).ok).toBe(true);
  });

  it("allows a same-origin POST", () => {
    expect(checkCsrf({ method: "POST", origin: "https://team.pyraxchain.com", referer: null, requestUrl: TARGET }).ok).toBe(true);
  });

  it("rejects a cross-origin POST", () => {
    const r = checkCsrf({ method: "POST", origin: "https://evil.com", referer: null, requestUrl: TARGET });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("origin-mismatch");
  });

  it("rejects a state-changing request with no Origin and no Referer", () => {
    const r = checkCsrf({ method: "DELETE", origin: null, referer: null, requestUrl: TARGET });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("no-origin");
  });

  it("treats Origin 'null' as a mismatch (sandboxed/stripped origin)", () => {
    const r = checkCsrf({ method: "POST", origin: "null", referer: null, requestUrl: TARGET });
    expect(r.ok).toBe(false);
  });

  it("falls back to Referer host when Origin is absent", () => {
    expect(checkCsrf({ method: "PUT", origin: null, referer: "https://team.pyraxchain.com/app", requestUrl: TARGET }).ok).toBe(true);
    expect(checkCsrf({ method: "PUT", origin: null, referer: "https://evil.com/app", requestUrl: TARGET }).ok).toBe(false);
  });

  it("prefers the explicit Host header over the request URL host", () => {
    // Same-origin per Host header even though requestUrl host is the internal one.
    const r = checkCsrf({
      method: "POST",
      origin: "https://team.pyraxchain.com",
      referer: null,
      requestUrl: "http://10.0.0.5:4321/api/users",
      hostHeader: "team.pyraxchain.com",
    });
    expect(r.ok).toBe(true);
  });
});

describe("checkRequestCsrf()", () => {
  it("works off a real Request object", () => {
    const ok = new Request("https://team.pyraxchain.com/api/users", { method: "POST", headers: { origin: "https://team.pyraxchain.com" } });
    expect(checkRequestCsrf(ok).ok).toBe(true);
    const bad = new Request("https://team.pyraxchain.com/api/users", { method: "POST", headers: { origin: "https://attacker.test" } });
    expect(checkRequestCsrf(bad).ok).toBe(false);
  });
});
