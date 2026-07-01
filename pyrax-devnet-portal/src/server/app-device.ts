// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Inferno desktop-app device auth — the devnet portal's own OAuth-style device grant, built on the
// portal's existing magic-link (9-digit OTP) login. A tester signs in with their emailed code and
// the app is issued a long-lived, DEVICE-BOUND, revocable token (sealed in the OS keychain on the
// app side). ONE tester account can link MANY PCs. The token is stored only as a keyed HMAC, so a
// database read can neither reveal a live token nor hijack a session. The capabilities the token
// unlocks are derived LIVE from the tester's RBAC on every check — a permission change, suspension,
// or revoke takes effect immediately (the token proves IDENTITY, not a frozen capability set).
//
// Mirrors the Team portal's src/server/ember.ts, adapted to the tester data model.
import { db, testerById, type TesterRow } from "./db";
import { hmac, randomSessionId } from "./crypto";
import { can, TESTER_BASELINE, type Permission } from "../lib/permissions";

const DEVICE_TTL_MS = 30 * 24 * 60 * 60_000; // 30 days, sliding on activity

let ensured = false;
/** Idempotently create the device table (self-contained; keeps the shared schema untouched). */
async function ensure(): Promise<void> {
  if (ensured) return;
  await db().query(`
    CREATE TABLE IF NOT EXISTS app_devices (
      token_hash  TEXT PRIMARY KEY,
      tester_id   TEXT NOT NULL,
      device_id   TEXT NOT NULL,
      device_name TEXT NOT NULL DEFAULT '',
      created_at  BIGINT NOT NULL,
      last_seen   BIGINT NOT NULL,
      expires_at  BIGINT NOT NULL,
      revoked     BOOLEAN NOT NULL DEFAULT FALSE
    );
    CREATE INDEX IF NOT EXISTS idx_app_devices_tester ON app_devices(tester_id);
  `);
  ensured = true;
}

/** The Inferno app capabilities, each gated by one RBAC permission the tester may hold. Testers get
 *  the baseline set on join; staff/admins additionally unlock triage/manage tabs live. */
const APP_CAPABILITIES: readonly { tab: string; perm: Permission }[] = [
  { tab: "dashboard", perm: "dashboard.view" },
  { tab: "issues", perm: "issues.view" },
  { tab: "submit", perm: "issues.submit" },
  { tab: "campaigns", perm: "campaigns.view" },
  { tab: "triage", perm: "issues.triage" },
  { tab: "releases", perm: "releases.publish" },
  { tab: "testers", perm: "testers.view" },
];

export interface AppAccess {
  id: string;
  email: string;
  name: string;
  handle: string;
  isStaff: boolean;
  isSuperuser: boolean;
  rewardEligible: boolean;
  status: TesterRow["status"];
  /** App tabs/features this tester may open, derived live from RBAC. */
  tabs: string[];
  /** The granted permission keys (for display / client gating). */
  capabilities: Permission[];
}

/** The identity + capabilities the app should surface for a tester (derived live from RBAC). */
export function appAccess(tester: TesterRow): AppAccess {
  const granted = APP_CAPABILITIES.filter((c) => can({ isSuperuser: tester.is_superuser, permissions: tester.permissions }, c.perm));
  // A tester always has at least the baseline (defensive: reflect the join baseline if perms are empty).
  const caps = new Set<Permission>(granted.map((g) => g.perm));
  if (caps.size === 0) for (const p of TESTER_BASELINE) caps.add(p);
  const tabs = granted.length ? granted.map((g) => g.tab) : APP_CAPABILITIES.filter((c) => TESTER_BASELINE.includes(c.perm)).map((c) => c.tab);
  return {
    id: tester.id,
    email: tester.email,
    name: tester.display_name,
    handle: tester.handle,
    isStaff: tester.is_staff,
    isSuperuser: tester.is_superuser,
    rewardEligible: tester.reward_eligible,
    status: tester.status,
    tabs,
    capabilities: [...caps],
  };
}

/** Issue a device-bound token for a signed-in tester. Returns the RAW token (only its HMAC is stored). */
export async function createDeviceToken(testerId: string, deviceId: string, deviceName: string): Promise<string> {
  await ensure();
  const token = randomSessionId();
  const now = Date.now();
  await db().query(
    `INSERT INTO app_devices (token_hash, tester_id, device_id, device_name, created_at, last_seen, expires_at)
     VALUES ($1,$2,$3,$4,$5,$5,$6)`,
    [hmac(token), testerId, (deviceId || "").slice(0, 128), (deviceName || "").slice(0, 128), now, now + DEVICE_TTL_MS],
  );
  return token;
}

/** Resolve a device token to its tester, sliding the window. Null if unknown / revoked / expired /
 *  the tester is suspended or gone. */
export async function deviceUser(token: string | undefined): Promise<TesterRow | null> {
  if (!token) return null;
  await ensure();
  const now = Date.now();
  const r = await db().query(
    `UPDATE app_devices SET last_seen = $1, expires_at = $2
     WHERE token_hash = $3 AND revoked = FALSE AND expires_at > $1 RETURNING tester_id`,
    [now, now + DEVICE_TTL_MS, hmac(token)],
  );
  if (r.rowCount === 0) return null;
  const tester = await testerById(r.rows[0].tester_id);
  if (!tester || tester.status === "suspended") return null;
  return tester;
}

/** Revoke a single device token (app logout / device unlink). Idempotent. */
export async function revokeDevice(token: string | undefined): Promise<void> {
  if (!token) return;
  await ensure();
  await db().query("UPDATE app_devices SET revoked = TRUE WHERE token_hash = $1", [hmac(token)]);
}

/** List a tester's linked devices (for a "manage my devices" screen). */
export async function listDevices(testerId: string): Promise<{ deviceId: string; deviceName: string; lastSeen: number; createdAt: number }[]> {
  await ensure();
  const r = await db().query(
    `SELECT device_id, device_name, last_seen, created_at FROM app_devices
     WHERE tester_id = $1 AND revoked = FALSE AND expires_at > $2 ORDER BY last_seen DESC`,
    [testerId, Date.now()],
  );
  return r.rows.map((x: { device_id: string; device_name: string; last_seen: string; created_at: string }) => ({
    deviceId: x.device_id,
    deviceName: x.device_name,
    lastSeen: Number(x.last_seen),
    createdAt: Number(x.created_at),
  }));
}
