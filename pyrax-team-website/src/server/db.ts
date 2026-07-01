// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Postgres data layer for the team portal (DigitalOcean Managed PG, database `team_pyrax`).
// Connects from the app-specific DATABASE_URL_TEAM_PYRAX (its own unique per-app URL), falling back to
// a generic DATABASE_URL only if that is unset. Creates the schema on first run and seeds the immutable
// superuser. Timestamps are ms since epoch.

import pg from "pg";
import type { Permission } from "../lib/permissions";
import { newUserId } from "./crypto";
import { DEFAULT_SIGNATURE_SETTINGS, sanitizeSettings, type SignatureSettings } from "../lib/signature-settings";

const URL_RAW = process.env.DATABASE_URL_TEAM_PYRAX || process.env.DATABASE_URL || "";
// DO managed PG presents a CA the node trust store doesn't have; the connection is still TLS.
const connectionString = URL_RAW.replace(/[?&]sslmode=[^&]*/, "");

let pool: pg.Pool | null = null;
let ready: Promise<void> | null = null;

export const SUPERUSER_EMAIL = (process.env.SUPERUSER_EMAIL || "shawn.wilson@pyraxchain.com").toLowerCase();

export interface UserRow {
  id: string;
  email: string;
  display_name: string;
  position: string;
  phone: string | null;
  booking_url: string | null;
  chat_username: string | null;
  socials: Record<string, string>;
  permissions: Permission[];
  is_superuser: boolean;
  status: "invited" | "active";
  verified_at: number | null;
  created_at: number;
  created_by: string | null;
  last_login: number | null;
}

function getPool(): pg.Pool {
  if (!pool) {
    if (!connectionString) throw new Error("DATABASE_URL is not configured for the team portal.");
    pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false }, max: 6, idleTimeoutMillis: 30_000 });
  }
  return pool;
}

export function db(): pg.Pool { return getPool(); }

/** Create the schema (idempotent) + seed the superuser. Awaited once per process. */
export function init(): Promise<void> {
  if (!ready) ready = (async () => {
    const p = getPool();
    await p.query(`
      CREATE TABLE IF NOT EXISTS users (
        id           TEXT PRIMARY KEY,
        email        TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL DEFAULT '',
        position     TEXT NOT NULL DEFAULT '',
        phone        TEXT,
        booking_url  TEXT,
        chat_username TEXT,
        socials      JSONB NOT NULL DEFAULT '{}'::jsonb,
        permissions  JSONB NOT NULL DEFAULT '[]'::jsonb,
        is_superuser BOOLEAN NOT NULL DEFAULT FALSE,
        status       TEXT NOT NULL DEFAULT 'invited',
        verified_at  BIGINT,
        created_at   BIGINT NOT NULL,
        created_by   TEXT,
        last_login   BIGINT
      );
      ALTER TABLE users ADD COLUMN IF NOT EXISTS booking_url TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS chat_username TEXT;
      CREATE TABLE IF NOT EXISTS login_otps (
        code_hash  TEXT PRIMARY KEY,
        email      TEXT NOT NULL,
        created_at BIGINT NOT NULL,
        expires_at BIGINT NOT NULL,
        attempts   INT NOT NULL DEFAULT 0,
        used_at    BIGINT,
        rid        TEXT
      );
      ALTER TABLE login_otps ADD COLUMN IF NOT EXISTS rid TEXT;
      CREATE INDEX IF NOT EXISTS idx_otps_email ON login_otps(email);
      CREATE INDEX IF NOT EXISTS idx_otps_rid ON login_otps(rid);
      CREATE TABLE IF NOT EXISTS sessions (
        sid_hash   TEXT PRIMARY KEY,
        user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at BIGINT NOT NULL,
        expires_at BIGINT NOT NULL,
        last_seen  BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
      -- DB-backed rate-limit buckets (sliding window). One row per (bucket,key); hits is a JSONB
      -- array of epoch-ms timestamps. Survives redeploys + works across replicas, unlike in-process
      -- Maps. Reaped opportunistically (stale rows are pruned on read) + by the GC sweep.
      CREATE TABLE IF NOT EXISTS rate_limits (
        bucket     TEXT NOT NULL,
        key        TEXT NOT NULL,
        hits       JSONB NOT NULL DEFAULT '[]'::jsonb,
        updated_at BIGINT NOT NULL,
        PRIMARY KEY (bucket, key)
      );
      CREATE INDEX IF NOT EXISTS idx_rate_limits_updated ON rate_limits(updated_at);
      -- Append-only audit log of sensitive admin mutations (invites, removals, permission changes,
      -- company-signature + nodes-site edits). Surfaced via an admin-only API. Never updated/deleted
      -- in normal operation (the GC sweep only trims very old rows if a retention is configured).
      CREATE TABLE IF NOT EXISTS audit_log (
        id         BIGSERIAL PRIMARY KEY,
        at         BIGINT NOT NULL,
        actor_id   TEXT,
        actor_email TEXT,
        action     TEXT NOT NULL,
        target_id  TEXT,
        target_email TEXT,
        detail     JSONB NOT NULL DEFAULT '{}'::jsonb
      );
      CREATE INDEX IF NOT EXISTS idx_audit_at ON audit_log(at DESC);
      -- Case-insensitive email uniqueness: exactly one account per address (we also lowercase on write).
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email));
      -- Company-wide email-signature design (single row, edited by Signature Managers).
      CREATE TABLE IF NOT EXISTS signature_settings (
        id         INT PRIMARY KEY DEFAULT 1,
        data       JSONB NOT NULL,
        updated_at BIGINT NOT NULL,
        updated_by TEXT,
        CONSTRAINT signature_settings_single_row CHECK (id = 1)
      );
    `);
    // Seed / enforce the immutable superuser. Profile details are placeholders the founder
    // can edit on first login; the superuser flag + active status are always enforced.
    await p.query(
      `INSERT INTO users (id, email, display_name, position, is_superuser, status, created_at)
       VALUES ('u_superuser', $1, 'Shawn Wilson', 'Founder', TRUE, 'active', $2)
       ON CONFLICT (email) DO UPDATE SET is_superuser = TRUE, status = 'active'`,
      [SUPERUSER_EMAIL, Date.now()],
    );
    // Reap expired OTPs/sessions + stale rate-limit rows: an immediate sweep + hourly thereafter.
    startGc();
  })();
  return ready;
}

function rowToUser(r: any): UserRow {
  return { ...r, socials: r.socials || {}, permissions: r.permissions || [] };
}

export async function userByEmail(email: string): Promise<UserRow | null> {
  await init();
  const r = await db().query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
  return r.rows[0] ? rowToUser(r.rows[0]) : null;
}
export async function userById(id: string): Promise<UserRow | null> {
  await init();
  const r = await db().query("SELECT * FROM users WHERE id = $1", [id]);
  return r.rows[0] ? rowToUser(r.rows[0]) : null;
}
export async function listUsers(): Promise<UserRow[]> {
  await init();
  const r = await db().query("SELECT * FROM users ORDER BY is_superuser DESC, created_at ASC");
  return r.rows.map(rowToUser);
}
/** Active team members who can be assigned work gated by `permission` (superusers implicitly hold every
 *  permission). Used e.g. by the Test Reviews assign dropdown to list `devnet.tests` holders. */
export async function listPermissionHolders(permission: Permission): Promise<Array<{ id: string; name: string; email: string }>> {
  await init();
  const r = await db().query(
    "SELECT id, display_name, email, is_superuser, permissions FROM users WHERE status = 'active' ORDER BY is_superuser DESC, display_name ASC",
  );
  return r.rows
    .filter((u) => u.is_superuser || (Array.isArray(u.permissions) && u.permissions.includes(permission)))
    .map((u) => ({ id: u.id, name: u.display_name || u.email, email: u.email }));
}
export async function touchLogin(id: string): Promise<void> {
  await db().query("UPDATE users SET last_login = $1, status = 'active' WHERE id = $2", [Date.now(), id]);
}

/** The company-wide signature design (defaults until a manager saves one). Always sanitized. */
export async function getSignatureSettings(): Promise<SignatureSettings> {
  await init();
  const r = await db().query("SELECT data FROM signature_settings WHERE id = 1");
  return r.rows[0] ? sanitizeSettings(r.rows[0].data) : DEFAULT_SIGNATURE_SETTINGS;
}

/** Save the company-wide signature design. Takes effect for every member's signature immediately. */
export async function setSignatureSettings(s: SignatureSettings, updatedBy: string): Promise<void> {
  await init();
  await db().query(
    `INSERT INTO signature_settings (id, data, updated_at, updated_by) VALUES (1, $1::jsonb, $2, $3)
     ON CONFLICT (id) DO UPDATE SET data = $1::jsonb, updated_at = $2, updated_by = $3`,
    [JSON.stringify(s), Date.now(), updatedBy],
  );
}

/** Whitelist (invite) a new member. Email is stored lowercased and is UNIQUE (case-insensitive),
 *  so an address can exist exactly once — a duplicate returns { ok:false, reason:"exists" }. */
export async function createInvitedUser(f: { email: string; display_name: string; position: string; permissions: Permission[]; created_by: string | null }): Promise<{ ok: true; user: UserRow } | { ok: false; reason: "exists" }> {
  await init();
  try {
    const r = await db().query(
      `INSERT INTO users (id, email, display_name, position, permissions, status, created_at, created_by)
       VALUES ($1,$2,$3,$4,$5::jsonb,'invited',$6,$7) RETURNING *`,
      [newUserId(), f.email.trim().toLowerCase(), f.display_name, f.position, JSON.stringify(f.permissions), Date.now(), f.created_by],
    );
    return { ok: true, user: rowToUser(r.rows[0]) };
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "23505") return { ok: false, reason: "exists" }; // unique_violation
    throw e;
  }
}

/** Replace a member's permission set. Never touches the superuser (guarded in SQL too). */
export async function setUserPermissions(id: string, perms: Permission[]): Promise<UserRow | null> {
  await init();
  const r = await db().query("UPDATE users SET permissions = $2::jsonb WHERE id = $1 AND is_superuser = FALSE RETURNING *", [id, JSON.stringify(perms)]);
  return r.rows[0] ? rowToUser(r.rows[0]) : null;
}

/** Remove a member. Never removes the superuser (guarded in SQL too). Returns true if a row went. */
export async function removeUser(id: string): Promise<boolean> {
  await init();
  const r = await db().query("DELETE FROM users WHERE id = $1 AND is_superuser = FALSE", [id]);
  return (r.rowCount ?? 0) > 0;
}

/* =============================================================== Rate limiting =====
 * DB-backed sliding-window limiter. Survives redeploys + scales across replicas (the previous
 * in-process Maps reset on every deploy + didn't share state). Atomic: a single UPSERT prunes the
 * window, counts, and records the new hit, returning whether the request is allowed. */
export async function rateAllow(bucket: string, key: string, max: number, windowMs: number): Promise<boolean> {
  await init();
  const now = Date.now();
  const cutoff = now - windowMs;
  // Atomic read-modify-write under the row's primary-key lock: prune old hits, decide, append.
  // We do it in a transaction so concurrent requests for the same key can't both slip past `max`.
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    const r = await client.query("SELECT hits FROM rate_limits WHERE bucket=$1 AND key=$2 FOR UPDATE", [bucket, key]);
    const prev: number[] = Array.isArray(r.rows[0]?.hits) ? r.rows[0].hits : [];
    const recent = prev.filter((t) => typeof t === "number" && t > cutoff);
    if (recent.length >= max) {
      // Persist the pruned window (keeps the row small) but do not record a new hit.
      await client.query(
        `INSERT INTO rate_limits (bucket, key, hits, updated_at) VALUES ($1,$2,$3::jsonb,$4)
         ON CONFLICT (bucket, key) DO UPDATE SET hits = $3::jsonb, updated_at = $4`,
        [bucket, key, JSON.stringify(recent), now],
      );
      await client.query("COMMIT");
      return false;
    }
    recent.push(now);
    await client.query(
      `INSERT INTO rate_limits (bucket, key, hits, updated_at) VALUES ($1,$2,$3::jsonb,$4)
       ON CONFLICT (bucket, key) DO UPDATE SET hits = $3::jsonb, updated_at = $4`,
      [bucket, key, JSON.stringify(recent), now],
    );
    await client.query("COMMIT");
    return true;
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch { /* ignore */ }
    throw e;
  } finally {
    client.release();
  }
}

/* ============================================================= Audit logging =====
 * Append-only record of sensitive admin actions. Best-effort: a logging failure must never block
 * the underlying mutation, so writes are caught + logged, not thrown. */
export interface AuditEntry {
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  targetId?: string | null;
  targetEmail?: string | null;
  detail?: Record<string, unknown>;
}
export async function audit(e: AuditEntry): Promise<void> {
  try {
    await init();
    await db().query(
      `INSERT INTO audit_log (at, actor_id, actor_email, action, target_id, target_email, detail)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
      [Date.now(), e.actorId, e.actorEmail, e.action, e.targetId ?? null, e.targetEmail ?? null, JSON.stringify(e.detail ?? {})],
    );
  } catch (err) {
    console.error("[audit] write failed:", err);
  }
}
export async function listAudit(limit = 200): Promise<any[]> {
  await init();
  const n = Math.max(1, Math.min(1000, Math.floor(limit) || 200));
  const r = await db().query("SELECT id, at, actor_id, actor_email, action, target_id, target_email, detail FROM audit_log ORDER BY at DESC, id DESC LIMIT $1", [n]);
  return r.rows;
}

/* ============================================================ Garbage collection =====
 * Expired OTPs + sessions and stale rate-limit rows are never read again — reap them so the tables
 * don't grow without bound. Runs once at boot + on an hourly interval. */
export async function reapExpired(): Promise<{ otps: number; sessions: number; rateLimits: number }> {
  await init();
  const now = Date.now();
  const otps = await db().query("DELETE FROM login_otps WHERE expires_at < $1", [now]);
  const sessions = await db().query("DELETE FROM sessions WHERE expires_at < $1", [now]);
  // Rate-limit rows older than 24h can't be inside any live window we use (max window is 15 min).
  const rl = await db().query("DELETE FROM rate_limits WHERE updated_at < $1", [now - 24 * 60 * 60_000]);
  return { otps: otps.rowCount ?? 0, sessions: sessions.rowCount ?? 0, rateLimits: rl.rowCount ?? 0 };
}

let gcTimer: ReturnType<typeof setInterval> | null = null;
/** Start the periodic GC (idempotent). Sweeps immediately, then hourly. */
export function startGc(intervalMs = 60 * 60_000): void {
  if (gcTimer) return;
  void reapExpired().catch((e) => console.error("[gc] startup sweep failed:", e));
  gcTimer = setInterval(() => {
    void reapExpired().catch((e) => console.error("[gc] sweep failed:", e));
  }, intervalMs);
  // Don't keep the event loop alive solely for the GC timer.
  if (typeof gcTimer.unref === "function") gcTimer.unref();
}

/** Update a member's OWN editable profile fields (never email/permissions/superuser). */
export async function updateUserProfile(
  id: string,
  f: { display_name: string; position: string; phone: string | null; booking_url: string | null; chat_username: string | null; socials: Record<string, string> },
): Promise<UserRow | null> {
  await init();
  const r = await db().query(
    `UPDATE users SET display_name = $2, position = $3, phone = $4, booking_url = $5, chat_username = $6, socials = $7::jsonb
     WHERE id = $1 RETURNING *`,
    [id, f.display_name, f.position, f.phone, f.booking_url, f.chat_username, JSON.stringify(f.socials)],
  );
  return r.rows[0] ? rowToUser(r.rows[0]) : null;
}
