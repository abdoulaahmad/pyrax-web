// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Ember desktop-app device auth — PYRAX's own OAuth-style device grant, built on the portal's
// existing magic-link login. A team member signs in with their emailed OTP and the app is issued
// a long-lived, DEVICE-BOUND, revocable token (sealed in the OS keychain on the app side). One
// account can link MANY devices/PCs. The token is stored only as a keyed HMAC; the admin tabs it
// unlocks are derived LIVE from the user's RBAC permissions on every check, so a permission change
// or a revoke takes effect immediately (the token proves identity, not a frozen capability set).

import { db, userById, type UserRow } from "./db";
import { hmac, randomSessionId } from "./crypto";
import { can, type Permission } from "../lib/permissions";

const DEVICE_TTL_MS = 30 * 24 * 60 * 60_000; // 30 days, sliding on activity

let ensured = false;
/** Idempotently create the device table (self-contained; keeps the shared schema untouched). */
async function ensure(): Promise<void> {
  if (ensured) return;
  await db().query(`
    CREATE TABLE IF NOT EXISTS ember_devices (
      token_hash  TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL,
      device_id   TEXT NOT NULL,
      device_name TEXT NOT NULL DEFAULT '',
      created_at  BIGINT NOT NULL,
      last_seen   BIGINT NOT NULL,
      expires_at  BIGINT NOT NULL,
      revoked     BOOLEAN NOT NULL DEFAULT FALSE
    )
  `);
  ensured = true;
}

/** The Ember desktop admin tabs, each gated by one RBAC permission. */
const EMBER_TABS: readonly { tab: string; perm: Permission }[] = [
  { tab: "seedlists", perm: "ember.seed_lists" },
];

/** The admin tabs this user may open + the granted permission keys (for display). */
export function emberAccess(user: UserRow): { tabs: string[]; roles: string[] } {
  const granted = EMBER_TABS.filter((t) => can(user, t.perm));
  return { tabs: granted.map((t) => t.tab), roles: granted.map((t) => t.perm) };
}

/** Issue a device-bound token for a signed-in user. Returns the RAW token (only its HMAC is stored). */
export async function createDeviceToken(userId: string, deviceId: string, deviceName: string): Promise<string> {
  await ensure();
  const token = randomSessionId();
  const now = Date.now();
  await db().query(
    `INSERT INTO ember_devices (token_hash, user_id, device_id, device_name, created_at, last_seen, expires_at)
     VALUES ($1,$2,$3,$4,$5,$5,$6)`,
    [hmac(token), userId, (deviceId || "").slice(0, 128), (deviceName || "").slice(0, 128), now, now + DEVICE_TTL_MS],
  );
  return token;
}

/** Resolve a device token to its user, sliding the window. Null if unknown / revoked / expired. */
export async function deviceUser(token: string | undefined): Promise<UserRow | null> {
  if (!token) return null;
  await ensure();
  const now = Date.now();
  const r = await db().query(
    `UPDATE ember_devices SET last_seen = $1, expires_at = $2
     WHERE token_hash = $3 AND revoked = FALSE AND expires_at > $1 RETURNING user_id`,
    [now, now + DEVICE_TTL_MS, hmac(token)],
  );
  if (r.rowCount === 0) return null;
  return userById(r.rows[0].user_id);
}

/** Revoke a single device token (app logout / device unlink). */
export async function revokeDevice(token: string | undefined): Promise<void> {
  if (!token) return;
  await ensure();
  await db().query("UPDATE ember_devices SET revoked = TRUE WHERE token_hash = $1", [hmac(token)]);
}

/** List a user's linked devices (for a future "manage my devices" screen). */
export async function listDevices(userId: string): Promise<{ deviceId: string; deviceName: string; lastSeen: number; createdAt: number }[]> {
  await ensure();
  const r = await db().query(
    `SELECT device_id, device_name, last_seen, created_at FROM ember_devices
     WHERE user_id = $1 AND revoked = FALSE AND expires_at > $2 ORDER BY last_seen DESC`,
    [userId, Date.now()],
  );
  return r.rows.map((x: { device_id: string; device_name: string; last_seen: string; created_at: string }) => ({
    deviceId: x.device_id,
    deviceName: x.device_name,
    lastSeen: Number(x.last_seen),
    createdAt: Number(x.created_at),
  }));
}
