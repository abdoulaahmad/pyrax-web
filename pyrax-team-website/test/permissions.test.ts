// SPDX-License-Identifier: LicenseRef-Proprietary
//
// RBAC escalation invariants. These lock the rule that a non-superuser admin can only ever grant a
// permission they (a) hold themselves and (b) are allowed to assign — and can never grant a
// superuser-only one. This is the core privilege-escalation guard the whole portal relies on.
import { describe, it, expect } from "vitest";
import {
  can,
  canGrant,
  isSuperuserOnly,
  isElevated,
  sanitizePermissions,
  ALL_PERMISSIONS,
  PRESETS,
  type AccessSubject,
  type Permission,
} from "../src/lib/permissions";

const superuser: AccessSubject = { isSuperuser: true, permissions: [] };
const subject = (perms: Permission[]): AccessSubject => ({ isSuperuser: false, permissions: perms });

describe("can()", () => {
  it("superuser can do anything, even with an empty permission set", () => {
    for (const p of ALL_PERMISSIONS) expect(can(superuser, p)).toBe(true);
  });
  it("a normal user can only do what they explicitly hold", () => {
    const u = subject(["dashboard.view", "faucet.view"]);
    expect(can(u, "dashboard.view")).toBe(true);
    expect(can(u, "faucet.view")).toBe(true);
    expect(can(u, "users.invite")).toBe(false);
  });
});

describe("canGrant() — escalation safety", () => {
  it("superuser can grant any permission (including superuser-only)", () => {
    for (const p of ALL_PERMISSIONS) expect(canGrant(superuser, p)).toBe(true);
  });

  it("a mid-level admin cannot grant a permission they do NOT hold", () => {
    // Holds users.assign_permissions but NOT downloads.ember.
    const admin = subject(["users.view", "users.assign_permissions", "downloads.view"]);
    expect(canGrant(admin, "downloads.ember")).toBe(false);
  });

  it("a mid-level admin CAN grant a permission they hold + can assign", () => {
    const admin = subject(["users.assign_permissions", "faucet.view", "faucet.drip"]);
    expect(canGrant(admin, "faucet.view")).toBe(true);
    expect(canGrant(admin, "faucet.drip")).toBe(true);
  });

  it("no non-superuser can ever grant a superuser-only permission, even if they 'hold' it", () => {
    const sneaky = subject(["users.assign_permissions", "node_control.kill"]);
    expect(isSuperuserOnly("node_control.kill")).toBe(true);
    expect(canGrant(sneaky, "node_control.kill")).toBe(false);
  });

  it("without users.assign_permissions you can grant nothing", () => {
    const noAssign = subject(["users.view", "faucet.view", "downloads.view"]);
    for (const p of ALL_PERMISSIONS) expect(canGrant(noAssign, p)).toBe(false);
  });

  it("a Team Admin preset cannot escalate beyond its own bundle", () => {
    const teamAdmin = subject(PRESETS.team_admin.permissions);
    // It can assign the things it holds...
    expect(canGrant(teamAdmin, "users.invite")).toBe(true);
    // ...but not things outside its bundle (e.g. removing users, signature, devnet, kill-switch).
    expect(canGrant(teamAdmin, "users.remove")).toBe(false);
    expect(canGrant(teamAdmin, "signature.manage")).toBe(false);
    expect(canGrant(teamAdmin, "node_control.kill")).toBe(false);
  });

  it("simulates the /api/users/:id filter: the granted set never exceeds the grantor's scope", () => {
    const admin = subject(["users.assign_permissions", "faucet.view", "faucet.drip", "downloads.view"]);
    const requested: Permission[] = ["faucet.view", "downloads.ember", "node_control.kill", "users.remove"];
    const granted = requested.filter((p) => canGrant(admin, p));
    expect(granted).toEqual(["faucet.view"]); // everything out of scope is dropped
  });
});

describe("sanitizePermissions()", () => {
  it("drops unknown keys and dedups, returning canonical order", () => {
    const out = sanitizePermissions(["faucet.view", "not.a.real.perm", "dashboard.view", "faucet.view", 42, null]);
    expect(out).toContain("faucet.view");
    expect(out).toContain("dashboard.view");
    expect(out).not.toContain("not.a.real.perm" as Permission);
    // canonical order = ALL_PERMISSIONS order
    expect(out).toEqual(ALL_PERMISSIONS.filter((p) => out.includes(p)));
  });
  it("returns [] for non-array input", () => {
    expect(sanitizePermissions("nope")).toEqual([]);
    expect(sanitizePermissions(undefined)).toEqual([]);
    expect(sanitizePermissions({})).toEqual([]);
  });
});

describe("permission flags", () => {
  it("elevated + superuser-only flags are read correctly", () => {
    expect(isElevated("users.remove")).toBe(true);
    expect(isElevated("dashboard.view")).toBe(false);
    expect(isSuperuserOnly("node_control.kill")).toBe(true);
    expect(isSuperuserOnly("users.assign_permissions")).toBe(false);
  });
  it("full_admin preset excludes every superuser-only permission", () => {
    for (const p of PRESETS.full_admin.permissions) expect(isSuperuserOnly(p)).toBe(false);
  });
});
