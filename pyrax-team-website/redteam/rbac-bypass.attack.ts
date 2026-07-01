// SPDX-License-Identifier: LicenseRef-Proprietary
//
// RED TEAM — RBAC bypass attacks (team portal).
//
// Each `it` is an attack an adversary would actually attempt against the RBAC layer; the assertion
// proves the defense holds. A FAILING test here is a real privilege-escalation vulnerability.
//
// Attacks covered:
//   A1  An unentitled user tries to receive the internal Ember build from /api/downloads.
//   A2  A user without downloads.view tries to reach the download center at all.
//   A3  A non-admin (no users.assign_permissions) tries to grant themselves any permission.
//   A4  A mid-level admin tries to escalate — grant a permission they don't hold, or a superuser-only one.
//   A5  Permission-set tampering: hostile/unknown keys injected into a grant are dropped, not honored.
//   A6  A non-superuser tries to grant the superuser-only node kill-switch even while "holding" it.
//   A7  The /api/users/:id grant filter never lets the resulting set exceed the grantor's scope.
import { describe, it, expect, vi, beforeEach } from "vitest";

process.env.NODE_ENV = "test";
process.env.SESSION_SECRET = "redteam-test-secret";

import {
  can,
  canGrant,
  sanitizePermissions,
  isSuperuserOnly,
  ALL_PERMISSIONS,
  type AccessSubject,
  type Permission,
} from "../src/lib/permissions";

const subject = (perms: Permission[], isSuperuser = false): AccessSubject => ({ isSuperuser, permissions: perms });

describe("RBAC bypass — Ember download gate (A1/A2)", () => {
  // The real /api/downloads handler decides Ember visibility with `can(subject, "downloads.ember")`.
  // We exercise that exact predicate against a hostile subject: a user with the base download role but
  // WITHOUT downloads.ember must NOT be entitled to Ember (its presigned URL is never even minted).
  it("A1: a downloads.view-only user is NOT entitled to Ember", () => {
    const attacker = subject(["dashboard.view", "downloads.view"]);
    expect(can(attacker, "downloads.ember")).toBe(false);
    // Defense-in-depth: even a user with an unrelated grab-bag of perms can't reach it.
    const grabBag = subject(["dashboard.view", "downloads.view", "faucet.view", "faucet.drip", "users.view"]);
    expect(can(grabBag, "downloads.ember")).toBe(false);
  });

  it("A2: a user with NO download role is denied the download center entirely", () => {
    const attacker = subject(["dashboard.view", "faucet.view"]);
    expect(can(attacker, "downloads.view")).toBe(false);
  });

  it("A1b: exercising the REAL /api/downloads handler, a non-Ember user never receives an Ember product", async () => {
    // Mock ONLY the boundaries: the session→user resolver and the Spaces feed resolver. The RBAC
    // decision (canEmber) is the real code under test. Ember must never appear in the product list.
    vi.resetModules();
    const attacker = { is_superuser: false, permissions: ["dashboard.view", "downloads.view"] };
    vi.doMock("../src/server/guard", () => ({
      requireUser: () => Promise.resolve(attacker),
      subjectOf: (u: any) => ({ isSuperuser: u.is_superuser, permissions: u.permissions }),
    }));
    vi.doMock("../src/server/spaces", () => ({ spacesConfigured: () => true }));
    const resolveDesktopFeed = vi.fn((feed: string) =>
      Promise.resolve({ id: feed, name: feed, note: "", version: "1.0.0", downloads: [{ platform: "win", label: "Windows", filename: `${feed}.exe`, url: `https://signed/${feed}` }] }),
    );
    vi.doMock("../src/server/feeds", () => ({
      resolveDesktopFeed,
      resolveCliFeed: () => Promise.resolve({ id: "cli", name: "cli", note: "", version: null, downloads: [] }),
    }));
    const { GET } = await import("../src/pages/api/downloads");
    const res = await GET({ cookies: { get: () => undefined } } as any);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.canEmber).toBe(false);
    // The Ember feed resolver must NEVER have been called for a non-Ember user.
    const feedsRequested = resolveDesktopFeed.mock.calls.map((c) => c[0]);
    expect(feedsRequested).not.toContain("ember");
    const ids = (body.products as { id: string }[]).map((p) => p.id);
    expect(ids).not.toContain("ember");
    vi.doUnmock("../src/server/guard");
    vi.doUnmock("../src/server/spaces");
    vi.doUnmock("../src/server/feeds");
  });

  it("A1c: an Ember-entitled user DOES receive it (proves the gate isn't just deny-all)", async () => {
    vi.resetModules();
    const legit = { is_superuser: false, permissions: ["dashboard.view", "downloads.view", "downloads.ember"] };
    vi.doMock("../src/server/guard", () => ({
      requireUser: () => Promise.resolve(legit),
      subjectOf: (u: any) => ({ isSuperuser: u.is_superuser, permissions: u.permissions }),
    }));
    vi.doMock("../src/server/spaces", () => ({ spacesConfigured: () => true }));
    vi.doMock("../src/server/feeds", () => ({
      resolveDesktopFeed: (feed: string, meta: any) => Promise.resolve({ id: meta.id, name: meta.name, note: meta.note, version: "1.0.0", downloads: [] }),
      resolveCliFeed: () => Promise.resolve({ id: "cli", name: "cli", note: "", version: null, downloads: [] }),
    }));
    const { GET } = await import("../src/pages/api/downloads");
    const res = await GET({ cookies: { get: () => undefined } } as any);
    const body = await res.json();
    expect(body.canEmber).toBe(true);
    expect((body.products as { id: string }[]).map((p) => p.id)).toContain("ember");
    vi.doUnmock("../src/server/guard");
    vi.doUnmock("../src/server/spaces");
    vi.doUnmock("../src/server/feeds");
  });
});

describe("RBAC bypass — privilege escalation via grants (A3/A4/A6)", () => {
  it("A3: a user without users.assign_permissions can grant NOTHING", () => {
    const attacker = subject(["dashboard.view", "users.view", "downloads.view", "faucet.drip"]);
    for (const p of ALL_PERMISSIONS) expect(canGrant(attacker, p)).toBe(false);
  });

  it("A4: an admin cannot grant a permission they do NOT themselves hold", () => {
    const admin = subject(["users.view", "users.assign_permissions", "downloads.view"]);
    // They hold downloads.view but NOT downloads.ember / faucet.drip / users.remove.
    expect(canGrant(admin, "downloads.ember")).toBe(false);
    expect(canGrant(admin, "faucet.drip")).toBe(false);
    expect(canGrant(admin, "users.remove")).toBe(false);
    // The one thing they DO hold + can assign is grantable (control assertion).
    expect(canGrant(admin, "downloads.view")).toBe(true);
  });

  it("A6: NO non-superuser can grant the superuser-only node kill-switch, even if their set 'contains' it", () => {
    const sneaky = subject(["users.assign_permissions", "node_control.kill"]);
    expect(isSuperuserOnly("node_control.kill")).toBe(true);
    expect(canGrant(sneaky, "node_control.kill")).toBe(false);
    // ...and holding it doesn't let them USE it as a stepping stone to grant it to a puppet account.
    const puppet = subject([]);
    const grantable = ALL_PERMISSIONS.filter((p) => canGrant(sneaky, p));
    expect(grantable).not.toContain("node_control.kill");
    void puppet;
  });
});

describe("RBAC bypass — permission-set tampering (A5/A7)", () => {
  it("A5: injected unknown / non-string permission keys are stripped by sanitizePermissions", () => {
    const hostile = [
      "faucet.view",
      "downloads.ember",            // real, but must still pass the grant filter downstream
      "node_control.kill",          // real superuser-only
      "__proto__",                  // prototype-pollution probe
      "constructor",
      "'; DROP TABLE users; --",    // SQL-ish junk
      { evil: true },               // non-string
      42,
      null,
      "users.assign_permissions.EXTRA", // near-miss key
    ];
    const cleaned = sanitizePermissions(hostile);
    // Only the genuinely-known keys survive; everything hostile is dropped.
    expect(cleaned).toContain("faucet.view");
    expect(cleaned).toContain("downloads.ember");
    expect(cleaned).toContain("node_control.kill");
    expect(cleaned).not.toContain("__proto__" as Permission);
    expect(cleaned).not.toContain("constructor" as Permission);
    expect(cleaned.every((p) => ALL_PERMISSIONS.includes(p))).toBe(true);
  });

  it("A5b: sanitizePermissions never throws and returns [] for hostile non-array shapes", () => {
    expect(sanitizePermissions("node_control.kill")).toEqual([]);
    expect(sanitizePermissions({ 0: "faucet.view", length: 1 })).toEqual([]); // array-like, not an array
    expect(sanitizePermissions(null)).toEqual([]);
    expect(sanitizePermissions(undefined)).toEqual([]);
  });

  it("A7: the /api/users/:id grant filter can NEVER let the result exceed the grantor's grantable scope", () => {
    // Reproduce the exact filter the PUT handler applies: keep target's out-of-scope perms, and for
    // in-scope perms honor `incoming`. An attacker submits a maximal hostile `incoming`.
    const grantor = subject(["users.assign_permissions", "faucet.view", "faucet.drip"]);
    const target = subject(["dashboard.view", "signature.manage"]); // signature.manage is out of grantor's scope
    const hostileIncoming = new Set(sanitizePermissions([
      "faucet.view", "faucet.drip", "downloads.ember", "node_control.kill", "users.remove", "signature.manage",
    ]));
    const grantable = new Set(ALL_PERMISSIONS.filter((p) => canGrant(grantor, p)));
    const next: Permission[] = ALL_PERMISSIONS.filter((p) =>
      grantable.has(p) ? hostileIncoming.has(p) : target.permissions.includes(p),
    );
    // The attacker only managed to set the two perms the grantor could grant; the target keeps its own
    // out-of-scope perms untouched, and NONE of the escalation targets leaked in.
    expect(next).toContain("faucet.view");
    expect(next).toContain("faucet.drip");
    expect(next).toContain("dashboard.view");      // preserved (target had it, out of grantor scope)
    expect(next).toContain("signature.manage");    // preserved (out of grantor scope — not strippable either)
    expect(next).not.toContain("downloads.ember");
    expect(next).not.toContain("node_control.kill");
    expect(next).not.toContain("users.remove");
  });
});
