// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// team-pyrax — the SQLite store (better-sqlite3, synchronous). Holds three things:
//   • users   — the whitelist itself (a row exists iff the email may sign in) + roles
//   • magic_tokens — single-use, short-TTL sign-in tokens (stored hashed)
//   • sessions     — active sessions (stored hashed)
// The hardcoded superuser row is seeded idempotently on boot and force-kept super.

import Database from "better-sqlite3";
import { join } from "node:path";
import { DATA_DIR, SUPERUSER_EMAIL, ROLES, ALL_ROLES } from "./config.js";

const db = new Database(join(DATA_DIR, "team-pyrax.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY,
    email      TEXT NOT NULL UNIQUE,
    roles      TEXT NOT NULL DEFAULT '[]',   -- JSON array of role strings
    created_at INTEGER NOT NULL,
    created_by TEXT,                          -- email of the admin who whitelisted them
    last_login INTEGER
  );
  CREATE TABLE IF NOT EXISTS magic_tokens (
    token_hash TEXT PRIMARY KEY,              -- HMAC(SESSION_SECRET, raw token)
    email      TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    used_at    INTEGER
  );
  CREATE TABLE IF NOT EXISTS sessions (
    sid_hash   TEXT PRIMARY KEY,              -- HMAC(SESSION_SECRET, raw session id)
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    last_seen  INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_tokens_email ON magic_tokens(email);
`);

const now = () => Date.now();

/** Parse + validate the roles JSON, dropping anything not in the role catalogue. */
function parseRoles(json) {
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? [...new Set(arr.filter((r) => ALL_ROLES.includes(r)))] : [];
  } catch {
    return [];
  }
}

function rowToUser(row) {
  if (!row) return null;
  const roles = parseRoles(row.roles);
  return {
    id: row.id,
    email: row.email,
    roles,
    isSuperuser: roles.includes(ROLES.SUPERUSER),
    createdAt: row.created_at,
    createdBy: row.created_by,
    lastLogin: row.last_login,
  };
}

// --- seed the hardcoded superuser (idempotent) ------------------------------
{
  const existing = db.prepare("SELECT * FROM users WHERE email = ?").get(SUPERUSER_EMAIL);
  if (!existing) {
    db.prepare("INSERT INTO users (email, roles, created_at, created_by) VALUES (?,?,?,?)").run(
      SUPERUSER_EMAIL,
      JSON.stringify([ROLES.SUPERUSER]),
      now(),
      "system",
    );
  } else {
    // The superuser ALWAYS retains the superuser role — repair it if anything ever
    // stripped it, so the platform can never be locked out of itself.
    const roles = parseRoles(existing.roles);
    if (!roles.includes(ROLES.SUPERUSER)) {
      roles.push(ROLES.SUPERUSER);
      db.prepare("UPDATE users SET roles = ? WHERE id = ?").run(JSON.stringify(roles), existing.id);
    }
  }
}

export const Users = {
  byEmail: (email) => rowToUser(db.prepare("SELECT * FROM users WHERE email = ?").get(String(email).toLowerCase())),
  byId: (id) => rowToUser(db.prepare("SELECT * FROM users WHERE id = ?").get(id)),
  all: () => db.prepare("SELECT * FROM users ORDER BY created_at ASC").all().map(rowToUser),
  add: (email, roles, createdBy) =>
    db
      .prepare("INSERT INTO users (email, roles, created_at, created_by) VALUES (?,?,?,?)")
      .run(String(email).toLowerCase(), JSON.stringify(roles), now(), createdBy),
  setRoles: (id, roles) => db.prepare("UPDATE users SET roles = ? WHERE id = ?").run(JSON.stringify(roles), id),
  remove: (id) => db.prepare("DELETE FROM users WHERE id = ?").run(id), // cascades sessions
  touchLogin: (id) => db.prepare("UPDATE users SET last_login = ? WHERE id = ?").run(now(), id),
};

export const Tokens = {
  create: (tokenHash, email, expiresAt) =>
    db
      .prepare("INSERT INTO magic_tokens (token_hash, email, created_at, expires_at) VALUES (?,?,?,?)")
      .run(tokenHash, String(email).toLowerCase(), now(), expiresAt),
  /** Atomically consume: succeeds only if the token is currently unused AND
   *  unexpired, closing the double-use / replay race. Returns the row or null. */
  consume: (tokenHash) => {
    const t = now();
    const info = db
      .prepare("UPDATE magic_tokens SET used_at = ? WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?")
      .run(t, tokenHash, t);
    if (info.changes !== 1) return null;
    return db.prepare("SELECT * FROM magic_tokens WHERE token_hash = ?").get(tokenHash);
  },
  recentCountForEmail: (email, windowMs) =>
    db
      .prepare("SELECT COUNT(*) AS c FROM magic_tokens WHERE email = ? AND created_at > ?")
      .get(String(email).toLowerCase(), now() - windowMs).c,
  sweep: () => db.prepare("DELETE FROM magic_tokens WHERE expires_at < ?").run(now() - 60 * 60 * 1000),
};

export const Sessions = {
  create: (sidHash, userId, expiresAt) =>
    db
      .prepare("INSERT INTO sessions (sid_hash, user_id, created_at, expires_at, last_seen) VALUES (?,?,?,?,?)")
      .run(sidHash, userId, now(), expiresAt, now()),
  /** Fetch a live session (and slide its last_seen). Expired rows return null. */
  get: (sidHash) => {
    const t = now();
    const row = db.prepare("SELECT * FROM sessions WHERE sid_hash = ? AND expires_at > ?").get(sidHash, t);
    if (row) db.prepare("UPDATE sessions SET last_seen = ? WHERE sid_hash = ?").run(t, sidHash);
    return row ?? null;
  },
  destroy: (sidHash) => db.prepare("DELETE FROM sessions WHERE sid_hash = ?").run(sidHash),
  destroyForUser: (userId) => db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId),
  sweep: () => db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(now()),
};

export default db;
