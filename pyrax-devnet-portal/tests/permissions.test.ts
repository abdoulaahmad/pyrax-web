// SPDX-License-Identifier: LicenseRef-Proprietary
// RBAC: the can()/canGrant() escalation model + permission sanitization. The server enforces these,
// so a bug here is a real privilege bug. Pure logic — no DB required.
import { describe, it, expect } from "vitest";
import {
  can, canGrant, sanitizePermissions, isSuperuserOnly,
  TESTER_BASELINE, ALL_PERMISSIONS, PRESETS, type AccessSubject, type Permission,
} from "../src/lib/permissions";
import { isStaffEmail, isRewardEligible, clampSessionDays, validateWallet } from "../src/lib/tester";

const tester: AccessSubject = { isSuperuser: false, permissions: [...TESTER_BASELINE] };
const triager: AccessSubject = { isSuperuser: false, permissions: PRESETS.triage.permissions };
const manager: AccessSubject = { isSuperuser: false, permissions: ["dashboard.view", "testers.manage", "issues.triage"] as Permission[] };
const superuser: AccessSubject = { isSuperuser: true, permissions: [] };

describe("can()", () => {
  it("grants a held permission and denies an unheld one", () => {
    expect(can(tester, "issues.submit")).toBe(true);
    expect(can(tester, "issues.triage")).toBe(false);
    expect(can(tester, "rewards.admin")).toBe(false);
  });
  it("superuser passes every permission", () => {
    for (const p of ALL_PERMISSIONS) expect(can(superuser, p)).toBe(true);
  });
  it("a triager can triage but cannot do superuser-only reward admin", () => {
    expect(can(triager, "issues.triage")).toBe(true);
    expect(can(triager, "rewards.admin")).toBe(false);
  });
});

describe("canGrant() — privilege escalation guard", () => {
  it("a plain tester cannot grant anything", () => {
    for (const p of ALL_PERMISSIONS) expect(canGrant(tester, p)).toBe(false);
  });
  it("requires BOTH testers.manage AND holding the permission being granted", () => {
    // manager holds testers.manage + issues.triage → may grant issues.triage…
    expect(canGrant(manager, "issues.triage")).toBe(true);
    // …but NOT a permission they don't themselves hold (no self-escalation).
    expect(canGrant(manager, "releases.publish")).toBe(false);
  });
  it("never lets a non-superuser grant a superuser-only permission", () => {
    expect(isSuperuserOnly("rewards.admin")).toBe(true);
    const almighty: AccessSubject = { isSuperuser: false, permissions: [...ALL_PERMISSIONS] };
    expect(canGrant(almighty, "rewards.admin")).toBe(false);
  });
  it("superuser can grant anything", () => {
    for (const p of ALL_PERMISSIONS) expect(canGrant(superuser, p)).toBe(true);
  });
});

describe("sanitizePermissions()", () => {
  it("drops unknown/non-string entries and dedupes, returning only valid permissions", () => {
    const out = sanitizePermissions(["issues.view", "issues.view", "not.a.perm", 42, null, "rewards.admin"]);
    expect(out).toContain("issues.view");
    expect(out).toContain("rewards.admin");
    expect(out.filter((p) => p === "issues.view")).toHaveLength(1);
    expect(out).not.toContain("not.a.perm" as unknown as Permission);
  });
  it("returns [] for non-arrays", () => {
    expect(sanitizePermissions("issues.view")).toEqual([]);
    expect(sanitizePermissions(null)).toEqual([]);
    expect(sanitizePermissions(undefined)).toEqual([]);
  });
});

describe("tester identity helpers", () => {
  it("@pyraxchain.com is staff and NOT reward-eligible; external emails are the opposite", () => {
    expect(isStaffEmail("alice@pyraxchain.com")).toBe(true);
    expect(isRewardEligible("alice@pyraxchain.com")).toBe(false);
    expect(isStaffEmail("bob@gmail.com")).toBe(false);
    expect(isRewardEligible("bob@gmail.com")).toBe(true);
  });
  it("clampSessionDays caps at 7 and floors invalid input to the max", () => {
    expect(clampSessionDays(3)).toBe(3);
    expect(clampSessionDays(99)).toBe(7);
    expect(clampSessionDays(0)).toBe(7);
    expect(clampSessionDays("abc")).toBe(7);
    expect(clampSessionDays(-5)).toBe(7);
  });
  it("validateWallet accepts a 0x+40hex address (lowercased), empty, and rejects junk", () => {
    expect(validateWallet("")).toEqual({ ok: true, value: "" });
    const ok = validateWallet("0x" + "Ab".repeat(20));
    expect(ok.ok).toBe(true);
    expect(ok.value).toBe(ok.value?.toLowerCase());
    expect(validateWallet("0x123").ok).toBe(false);
    expect(validateWallet("not-an-address").ok).toBe(false);
  });
});
