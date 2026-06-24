// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// team-pyrax — the data layer, backed by DigitalOcean Managed PostgreSQL (`pg`).
// Holds the user whitelist + roles, single-use magic-link tokens, and sessions.
// `init()` creates the schema and idempotently seeds the immutable superuser; it
// MUST be awaited before the server starts serving. All access is async.

import pg from "pg";
import { DATABASE_URL, DATABASE_SSL, DATABASE_CA, SUPERUSER_EMAIL, ROLES, ASSIGNABLE_ROLES } from "./config.js";

const pool = new pg.Pool({
  // Strip sslmode from the URL so node-postgres uses our explicit `ssl` below. Otherwise the
  // connection string's sslmode=require forces full chain verification, and DO's CA (not in
  // Node's trust store) fails as "self-signed certificate in certificate chain". On the private
  // VPC the connection is still encrypted; it's just not chain-verified unless DATABASE_CA is set.
  connectionString: DATABASE_URL.replace(/[?&]sslmode=[^&]*/gi, ""),
  ssl: DATABASE_SSL ? { rejectUnauthorized: !!DATABASE_CA, ca: DATABASE_CA || undefined } : false,
  max: Number(process.env.PG_POOL_MAX ?? 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});
pool.on("error", (e) => console.error("[team-pyrax] pg pool error:", e?.message ?? e));

const q = (text, params) => pool.query(text, params);
const now = () => Date.now();

/** Normalise the roles value (pg returns jsonb already parsed; tolerate a string
 *  too), dropping anything not in the role catalogue. */
function parseRoles(val) {
  let arr = val;
  if (typeof val === "string") {
    try { arr = JSON.parse(val); } catch { arr = []; }
  }
  return Array.isArray(arr) ? [...new Set(arr.filter((r) => ASSIGNABLE_ROLES.includes(r)))] : [];
}

function rowToUser(row) {
  if (!row) return null;
  const roles = parseRoles(row.roles);
  return {
    id: row.id,
    email: row.email,
    roles,
    isSuperuser: roles.includes(ROLES.SUPERUSER),
    createdAt: Number(row.created_at),
    createdBy: row.created_by,
    lastLogin: row.last_login === null ? null : Number(row.last_login),
  };
}

/** Create the schema + seed the hardcoded superuser. Idempotent; await on boot. */
export async function init() {
  await q(`
    CREATE TABLE IF NOT EXISTS users (
      id         SERIAL PRIMARY KEY,
      email      TEXT NOT NULL UNIQUE,
      roles      JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at BIGINT NOT NULL,
      created_by TEXT,
      last_login BIGINT
    );
    CREATE TABLE IF NOT EXISTS magic_tokens (
      token_hash TEXT PRIMARY KEY,
      email      TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      expires_at BIGINT NOT NULL,
      used_at    BIGINT
    );
    CREATE TABLE IF NOT EXISTS sessions (
      sid_hash   TEXT PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at BIGINT NOT NULL,
      expires_at BIGINT NOT NULL,
      last_seen  BIGINT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ember_otps (
      code_hash  TEXT PRIMARY KEY,
      email      TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      expires_at BIGINT NOT NULL,
      used_at    BIGINT
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_tokens_email ON magic_tokens(email);
    CREATE INDEX IF NOT EXISTS idx_otps_email ON ember_otps(email);
  `);

  // Seed / repair the hardcoded superuser so the platform can never lock itself out.
  const { rows } = await q("SELECT id, roles FROM users WHERE email = $1", [SUPERUSER_EMAIL]);
  if (rows.length === 0) {
    await q("INSERT INTO users (email, roles, created_at, created_by) VALUES ($1, $2, $3, $4)", [
      SUPERUSER_EMAIL,
      JSON.stringify([ROLES.SUPERUSER]),
      now(),
      "system",
    ]);
  } else {
    const roles = parseRoles(rows[0].roles);
    if (!roles.includes(ROLES.SUPERUSER)) {
      roles.push(ROLES.SUPERUSER);
      await q("UPDATE users SET roles = $1 WHERE id = $2", [JSON.stringify(roles), rows[0].id]);
    }
  }
}

export const Users = {
  byEmail: async (email) => rowToUser((await q("SELECT * FROM users WHERE email = $1", [String(email).toLowerCase()])).rows[0]),
  byId: async (id) => rowToUser((await q("SELECT * FROM users WHERE id = $1", [id])).rows[0]),
  all: async () => (await q("SELECT * FROM users ORDER BY created_at ASC")).rows.map(rowToUser),
  add: (email, roles, createdBy) =>
    q("INSERT INTO users (email, roles, created_at, created_by) VALUES ($1, $2, $3, $4)", [
      String(email).toLowerCase(),
      JSON.stringify(roles),
      now(),
      createdBy,
    ]),
  setRoles: (id, roles) => q("UPDATE users SET roles = $1 WHERE id = $2", [JSON.stringify(roles), id]),
  remove: (id) => q("DELETE FROM users WHERE id = $1", [id]), // cascades sessions
  touchLogin: (id) => q("UPDATE users SET last_login = $1 WHERE id = $2", [now(), id]),
};

export const Tokens = {
  create: (tokenHash, email, expiresAt) =>
    q("INSERT INTO magic_tokens (token_hash, email, created_at, expires_at) VALUES ($1, $2, $3, $4)", [
      tokenHash,
      String(email).toLowerCase(),
      now(),
      expiresAt,
    ]),
  /** Atomically consume in a single UPDATE … RETURNING: succeeds only if the token
   *  is currently unused AND unexpired, closing the double-use / replay race. */
  consume: async (tokenHash) => {
    const t = now();
    const { rows } = await q(
      "UPDATE magic_tokens SET used_at = $1 WHERE token_hash = $2 AND used_at IS NULL AND expires_at > $3 RETURNING *",
      [t, tokenHash, t],
    );
    return rows[0] ?? null;
  },
  recentCountForEmail: async (email, windowMs) =>
    Number(
      (await q("SELECT COUNT(*)::int AS c FROM magic_tokens WHERE email = $1 AND created_at > $2", [
        String(email).toLowerCase(),
        now() - windowMs,
      ])).rows[0].c,
    ),
  sweep: () => q("DELETE FROM magic_tokens WHERE expires_at < $1", [now() - 60 * 60 * 1000]),
};

/** Single-use OTPs that unlock the Ember desktop app's admin area. Stored only as
 *  an HMAC of the code (never plaintext), consumed atomically to close replay. */
export const EmberOtps = {
  create: (codeHash, email, expiresAt) =>
    q("INSERT INTO ember_otps (code_hash, email, created_at, expires_at) VALUES ($1, $2, $3, $4)", [
      codeHash,
      String(email).toLowerCase(),
      now(),
      expiresAt,
    ]),
  /** Atomically consume: succeeds only if this code is for `email`, unused, and
   *  unexpired (single UPDATE … RETURNING closes the double-use / replay race). */
  consume: async (codeHash, email) => {
    const t = now();
    const { rows } = await q(
      "UPDATE ember_otps SET used_at = $1 WHERE code_hash = $2 AND email = $3 AND used_at IS NULL AND expires_at > $4 RETURNING *",
      [t, codeHash, String(email).toLowerCase(), t],
    );
    return rows[0] ?? null;
  },
  recentCountForEmail: async (email, windowMs) =>
    Number(
      (await q("SELECT COUNT(*)::int AS c FROM ember_otps WHERE email = $1 AND created_at > $2", [
        String(email).toLowerCase(),
        now() - windowMs,
      ])).rows[0].c,
    ),
  sweep: () => q("DELETE FROM ember_otps WHERE expires_at < $1", [now() - 60 * 60 * 1000]),
};

export const Sessions = {
  create: (sidHash, userId, expiresAt) =>
    q("INSERT INTO sessions (sid_hash, user_id, created_at, expires_at, last_seen) VALUES ($1, $2, $3, $4, $5)", [
      sidHash,
      userId,
      now(),
      expiresAt,
      now(),
    ]),
  /** Fetch a live session and slide its last_seen in one atomic UPDATE … RETURNING. */
  get: async (sidHash) => {
    const t = now();
    const { rows } = await q(
      "UPDATE sessions SET last_seen = $1 WHERE sid_hash = $2 AND expires_at > $3 RETURNING *",
      [t, sidHash, t],
    );
    return rows[0] ?? null;
  },
  destroy: (sidHash) => q("DELETE FROM sessions WHERE sid_hash = $1", [sidHash]),
  destroyForUser: (userId) => q("DELETE FROM sessions WHERE user_id = $1", [userId]),
  sweep: () => q("DELETE FROM sessions WHERE expires_at < $1", [now()]),
};

export default pool;
