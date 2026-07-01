// SPDX-License-Identifier: LicenseRef-Proprietary
//
// RED TEAM — RBAC bypass + device-token + suspension attacks (devnet tester portal).
//
// Drives the REAL src/server/app-device.ts + src/lib/permissions.ts against a faithful in-memory fake
// of app_devices + testers. The device grant proves IDENTITY; capabilities are recomputed LIVE from
// RBAC on every check, so a suspension / revoke / demotion takes effect immediately. A FAILING test =
// a real auth-bypass or privilege-escalation vulnerability.
//
// Attacks covered:
//   F1  A baseline tester cannot reach staff/admin capabilities (triage/testers/releases).
//   F2  rewards.admin is superuser-only — no non-superuser (even a devnet_admin) can grant it.
//   F3  Forged / tampered / never-issued device tokens are rejected.
//   F4  Token replay after revoke (app logout) is rejected on the next check-in.
//   F5  SUSPENDED tester ⇒ device/status resolves to null ⇒ 401, immediately (no fresh OTP needed to lock out).
//   F6  A token minted for tester X never resolves to tester Y (no cross-account lift).
//   F7  Permission tampering: unknown/hostile keys are dropped by sanitizePermissions.
import { describe, it, expect, vi, beforeEach } from "vitest";

process.env.NODE_ENV = "test";
process.env.SESSION_SECRET = "redteam-devnet-secret";

import {
  can, canGrant, sanitizePermissions, isSuperuserOnly, ALL_PERMISSIONS, TESTER_BASELINE,
  type AccessSubject, type Permission,
} from "../src/lib/permissions";

const subject = (perms: Permission[], isSuperuser = false): AccessSubject => ({ isSuperuser, permissions: perms });

// ---- Faithful fake of app_devices + testers -------------------------------------------------------
interface DeviceRow { token_hash: string; tester_id: string; device_id: string; device_name: string; created_at: number; last_seen: number; expires_at: number; revoked: boolean }
const devices: DeviceRow[] = [];
const testers: Record<string, any> = {
  t_base: { id: "t_base", email: "base@tester.io", display_name: "Base", handle: "base", is_staff: false, is_superuser: false, reward_eligible: true, status: "active", permissions: [...TESTER_BASELINE] },
  t_staff: { id: "t_staff", email: "staff@pyraxchain.com", display_name: "Staff", handle: "staff", is_staff: true, is_superuser: false, reward_eligible: false, status: "active", permissions: [...TESTER_BASELINE, "issues.triage", "testers.view"] },
  t_susp: { id: "t_susp", email: "susp@tester.io", display_name: "Susp", handle: "susp", is_staff: false, is_superuser: false, reward_eligible: true, status: "suspended", permissions: [...TESTER_BASELINE] },
};

function fakeQuery(sql: string, params: any[] = []): { rows: any[]; rowCount: number } {
  const s = sql.replace(/\s+/g, " ").trim();
  if (s.startsWith("CREATE TABLE") || s.startsWith("CREATE INDEX") || s.includes("CREATE INDEX")) return { rows: [], rowCount: 0 };
  if (s.startsWith("INSERT INTO app_devices")) {
    const [token_hash, tester_id, device_id, device_name, created_at, expires_at] = params;
    devices.push({ token_hash, tester_id, device_id, device_name, created_at, last_seen: created_at, expires_at, revoked: false });
    return { rows: [], rowCount: 1 };
  }
  if (s.startsWith("UPDATE app_devices SET last_seen")) {
    const [now, newExp, token_hash] = params;
    const row = devices.find((d) => d.token_hash === token_hash && !d.revoked && d.expires_at > now);
    if (!row) return { rows: [], rowCount: 0 };
    row.last_seen = now; row.expires_at = newExp;
    return { rows: [{ tester_id: row.tester_id }], rowCount: 1 };
  }
  if (s.startsWith("UPDATE app_devices SET revoked = TRUE")) {
    const [token_hash] = params;
    const row = devices.find((d) => d.token_hash === token_hash);
    if (row) row.revoked = true;
    return { rows: [], rowCount: row ? 1 : 0 };
  }
  throw new Error("unexpected SQL in devnet device fake: " + s);
}

vi.mock("../src/server/db", () => ({
  db: () => ({ query: (sql: string, params?: any[]) => Promise.resolve(fakeQuery(sql, params)) }),
  init: () => Promise.resolve(),
  testerById: (id: string) => Promise.resolve(testers[id] ? { ...testers[id] } : null),
  testerByEmail: (email: string) => Promise.resolve(Object.values(testers).find((t) => t.email === email.toLowerCase()) || null),
  touchLogin: () => Promise.resolve(),
}));

const appDevice = await import("../src/server/app-device");
const { hmac } = await import("../src/server/crypto");

beforeEach(() => { devices.length = 0; });

describe("RBAC bypass — tester cannot reach staff capabilities (F1/F2/F7)", () => {
  it("F1: a baseline tester holds ONLY the baseline; triage/manage/publish/admin are denied", () => {
    const tester = subject([...TESTER_BASELINE]);
    for (const p of TESTER_BASELINE) expect(can(tester, p)).toBe(true); // control
    for (const p of ["issues.triage", "campaigns.manage", "releases.publish", "testers.view", "testers.manage", "rewards.admin"] as Permission[]) {
      expect(can(tester, p)).toBe(false);
    }
  });

  it("F2: rewards.admin is superuser-only — even a devnet_admin cannot grant it", () => {
    expect(isSuperuserOnly("rewards.admin")).toBe(true);
    const devnetAdmin = subject(ALL_PERMISSIONS.filter((p) => !isSuperuserOnly(p)).concat(["testers.manage"] as Permission[]));
    expect(canGrant(devnetAdmin, "rewards.admin")).toBe(false);
    // A tester with testers.manage but not the perm itself can't grant something they don't hold, either.
    const partial = subject(["testers.manage", "issues.triage"]);
    expect(canGrant(partial, "releases.publish")).toBe(false);
    expect(canGrant(partial, "issues.triage")).toBe(true); // control: holds + can assign
  });

  it("F7: hostile permission keys are stripped by sanitizePermissions (no injection into the grant)", () => {
    const cleaned = sanitizePermissions([
      "issues.view", "rewards.admin", "__proto__", "constructor", "'; DROP TABLE testers; --",
      { x: 1 }, 7, null, "issues.triage.EXTRA",
    ]);
    expect(cleaned).toContain("issues.view");
    expect(cleaned).toContain("rewards.admin"); // real key survives (grant filter blocks it downstream)
    expect(cleaned.every((p) => ALL_PERMISSIONS.includes(p))).toBe(true);
    expect(cleaned).not.toContain("__proto__" as Permission);
    expect(sanitizePermissions("rewards.admin")).toEqual([]);
  });
});

describe("device-token attacks (F3/F4/F6)", () => {
  it("F3: forged / never-issued / tampered device tokens are rejected", async () => {
    const token = await appDevice.createDeviceToken("t_base", "dev-1", "laptop");
    expect((await appDevice.deviceUser(token))?.id).toBe("t_base"); // sanity
    expect(await appDevice.deviceUser("never-issued")).toBeNull();
    expect(await appDevice.deviceUser(undefined)).toBeNull();
    const flipped = token.slice(0, -1) + (token.slice(-1) === "A" ? "B" : "A");
    expect(await appDevice.deviceUser(flipped)).toBeNull();
  });

  it("F4: replay after revoke (app logout) is rejected on the next check-in", async () => {
    const token = await appDevice.createDeviceToken("t_base", "dev-1", "laptop");
    await appDevice.revokeDevice(token);
    expect(await appDevice.deviceUser(token)).toBeNull();
  });

  it("F6: a token minted for one tester never resolves to another", async () => {
    const a = await appDevice.createDeviceToken("t_base", "da", "a");
    const b = await appDevice.createDeviceToken("t_staff", "db", "b");
    expect((await appDevice.deviceUser(a))?.id).toBe("t_base");
    expect((await appDevice.deviceUser(b))?.id).toBe("t_staff");
    expect((await appDevice.deviceUser(a))?.id).not.toBe("t_staff");
  });

  it("F3b: the stored value is a keyed HMAC, never the raw token", async () => {
    const token = await appDevice.createDeviceToken("t_base", "dev-1", "laptop");
    expect(devices[0].token_hash).toBe(hmac(token));
    expect(devices[0].token_hash).not.toBe(token);
  });
});

describe("suspended tester lockout (F5) — the standout requirement", () => {
  it("F5: a SUSPENDED tester's valid device token resolves to null (immediate lockout)", async () => {
    // The tester had a working device; then an admin suspends them. Their token row is still unrevoked
    // and unexpired, but deviceUser() re-checks tester.status === 'suspended' on EVERY call → null.
    const token = await appDevice.createDeviceToken("t_susp", "dev-s", "s");
    expect(devices[0].revoked).toBe(false);          // token itself was never revoked
    expect(devices[0].expires_at).toBeGreaterThan(Date.now()); // and not expired
    expect(await appDevice.deviceUser(token)).toBeNull();       // …yet access is denied because suspended
  });

  it("F5b: exercising the REAL device/status handler, a suspended tester gets 401", async () => {
    // The token is valid; only the suspension gates access. The handler must 401.
    const token = await appDevice.createDeviceToken("t_susp", "dev-s", "s");
    const mod = await import("../src/pages/api/app/device/status");
    const res = await mod.POST({
      request: new Request("https://devnet.pyraxchain.com/api/app/device/status", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }),
      }),
    } as any);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it("F5c: an ACTIVE tester's device/status succeeds (proves the gate isn't deny-all)", async () => {
    const token = await appDevice.createDeviceToken("t_base", "dev-b", "b");
    const mod = await import("../src/pages/api/app/device/status");
    const res = await mod.POST({
      request: new Request("https://devnet.pyraxchain.com/api/app/device/status", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }),
      }),
    } as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.email).toBe("base@tester.io");
    // A baseline tester surfaces only baseline tabs — never staff tabs.
    expect(body.tabs).not.toContain("triage");
    expect(body.tabs).not.toContain("testers");
  });
});
