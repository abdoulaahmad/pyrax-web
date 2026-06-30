// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Postgres data layer for the Devnet Tester Portal (DO Managed PG, database `devnet_tester`).
// Connects from DATABASE_URL_DEVNET, creates the schema on first run, seeds the superuser.
// Timestamps are ms since epoch. The portal owns this schema; the team site's Devnet Users page
// also writes the testers/invites tables (idempotent CREATE … IF NOT EXISTS keeps that safe).
import pg from "pg";
import crypto from "node:crypto";
import type { Permission } from "../lib/permissions";
import { TESTER_BASELINE } from "../lib/permissions";
import { isStaffEmail, isRewardEligible } from "../lib/tester";

const URL_RAW = process.env.DATABASE_URL_DEVNET || process.env.DATABASE_URL || "";
const connectionString = URL_RAW.replace(/[?&]sslmode=[^&]*/, "");
export const SUPERUSER_EMAIL = (process.env.SUPERUSER_EMAIL || "shawn.wilson@pyraxchain.com").toLowerCase();

let pool: pg.Pool | null = null;
let ready: Promise<void> | null = null;
const id = (p: string) => `${p}_${crypto.randomBytes(8).toString("base64url")}`;

export interface TesterRow {
  id: string; email: string; display_name: string; handle: string;
  payout_wallet: string | null; reward_eligible: boolean; is_staff: boolean;
  permissions: Permission[]; is_superuser: boolean; status: "invited" | "active" | "suspended";
  session_max_days: number; founding_rank: number | null;
  created_at: number; joined_at: number | null; last_login: number | null;
}

function getPool(): pg.Pool {
  if (!pool) {
    if (!connectionString) throw new Error("DATABASE_URL_DEVNET is not configured.");
    pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false }, max: 6, idleTimeoutMillis: 30_000 });
  }
  return pool;
}
export function db(): pg.Pool { return getPool(); }

export function init(): Promise<void> {
  if (!ready) ready = (async () => {
    const p = getPool();
    await p.query(`
      CREATE TABLE IF NOT EXISTS testers (
        id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL DEFAULT '',
        handle TEXT NOT NULL DEFAULT '', payout_wallet TEXT,
        reward_eligible BOOLEAN NOT NULL DEFAULT TRUE, is_staff BOOLEAN NOT NULL DEFAULT FALSE,
        permissions JSONB NOT NULL DEFAULT '[]'::jsonb, is_superuser BOOLEAN NOT NULL DEFAULT FALSE,
        status TEXT NOT NULL DEFAULT 'invited', session_max_days INT NOT NULL DEFAULT 7,
        founding_rank INT, created_at BIGINT NOT NULL, joined_at BIGINT, last_login BIGINT
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_testers_email_lower ON testers (lower(email));
      CREATE UNIQUE INDEX IF NOT EXISTS idx_testers_handle_lower ON testers (lower(handle)) WHERE handle <> '';
      CREATE TABLE IF NOT EXISTS invites (
        token TEXT PRIMARY KEY, email TEXT NOT NULL, telegram_handle TEXT NOT NULL DEFAULT '',
        created_at BIGINT NOT NULL, expires_at BIGINT NOT NULL, accepted_at BIGINT, invited_by TEXT
      );
      ALTER TABLE invites ADD COLUMN IF NOT EXISTS telegram_handle TEXT NOT NULL DEFAULT '';
      CREATE INDEX IF NOT EXISTS idx_invites_email ON invites(lower(email));
      CREATE TABLE IF NOT EXISTS login_otps (
        code_hash TEXT PRIMARY KEY, email TEXT NOT NULL, created_at BIGINT NOT NULL,
        expires_at BIGINT NOT NULL, used_at BIGINT, rid TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_otps_rid ON login_otps(rid);
      CREATE TABLE IF NOT EXISTS sessions (
        sid_hash TEXT PRIMARY KEY, tester_id TEXT NOT NULL REFERENCES testers(id) ON DELETE CASCADE,
        created_at BIGINT NOT NULL, expires_at BIGINT NOT NULL, last_seen BIGINT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS nodes (
        node_pk TEXT PRIMARY KEY, tester_id TEXT NOT NULL REFERENCES testers(id) ON DELETE CASCADE,
        token_hash TEXT, label TEXT, app TEXT, app_version TEXT, node_version TEXT, height BIGINT, peers INT,
        first_seen BIGINT NOT NULL, last_heartbeat BIGINT NOT NULL
      );
      ALTER TABLE nodes ADD COLUMN IF NOT EXISTS token_hash TEXT;
      CREATE INDEX IF NOT EXISTS idx_nodes_tester ON nodes(tester_id);
      CREATE INDEX IF NOT EXISTS idx_nodes_token ON nodes(token_hash);
      CREATE TABLE IF NOT EXISTS pairing_codes (
        code TEXT PRIMARY KEY, tester_id TEXT NOT NULL REFERENCES testers(id) ON DELETE CASCADE,
        label TEXT, created_at BIGINT NOT NULL, expires_at BIGINT NOT NULL, used_at BIGINT
      );
      CREATE TABLE IF NOT EXISTS node_heartbeats (
        node_pk TEXT NOT NULL, tester_id TEXT NOT NULL, ts BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_hb_tester_ts ON node_heartbeats(tester_id, ts);
      CREATE TABLE IF NOT EXISTS earnings_ledger (
        id TEXT PRIMARY KEY, tester_id TEXT NOT NULL REFERENCES testers(id) ON DELETE CASCADE,
        reason TEXT NOT NULL, pyrx BIGINT NOT NULL, note TEXT, ref TEXT, created_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_ledger_tester ON earnings_ledger(tester_id);
      CREATE TABLE IF NOT EXISTS bugs (
        id TEXT PRIMARY KEY, tester_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
        repro_steps TEXT NOT NULL DEFAULT '', expected TEXT NOT NULL DEFAULT '', actual TEXT NOT NULL DEFAULT '',
        severity TEXT NOT NULL DEFAULT 'medium', assigned_severity TEXT, component TEXT NOT NULL DEFAULT '',
        environment JSONB NOT NULL DEFAULT '{}'::jsonb, attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
        status TEXT NOT NULL DEFAULT 'new', votes INT NOT NULL DEFAULT 0, confirms INT NOT NULL DEFAULT 0,
        bounty_pyrx BIGINT NOT NULL DEFAULT 0, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_bugs_status ON bugs(status);
      CREATE TABLE IF NOT EXISTS bug_reactions (
        bug_id TEXT NOT NULL, tester_id TEXT NOT NULL, kind TEXT NOT NULL, created_at BIGINT NOT NULL,
        PRIMARY KEY (bug_id, tester_id, kind)
      );
      CREATE TABLE IF NOT EXISTS bug_comments (
        id TEXT PRIMARY KEY, bug_id TEXT NOT NULL, tester_id TEXT NOT NULL, body TEXT NOT NULL, created_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_bugcomments_bug ON bug_comments(bug_id);
      CREATE TABLE IF NOT EXISTS campaigns (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '', steps JSONB NOT NULL DEFAULT '[]'::jsonb,
        opens_at BIGINT, closes_at BIGINT, status TEXT NOT NULL DEFAULT 'open', created_by TEXT, created_at BIGINT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL, tester_id TEXT NOT NULL, results JSONB NOT NULL DEFAULT '[]'::jsonb,
        notes TEXT NOT NULL DEFAULT '', attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
        accepted BOOLEAN, created_at BIGINT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY, channel TEXT NOT NULL DEFAULT 'general', tester_id TEXT NOT NULL,
        body TEXT NOT NULL, created_at BIGINT NOT NULL, deleted BOOLEAN NOT NULL DEFAULT FALSE
      );
      CREATE INDEX IF NOT EXISTS idx_chat_channel ON chat_messages(channel, created_at);
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY, tester_id TEXT NOT NULL, kind TEXT NOT NULL, title TEXT NOT NULL,
        body TEXT NOT NULL DEFAULT '', link TEXT, read BOOLEAN NOT NULL DEFAULT FALSE, created_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_notif_tester ON notifications(tester_id, created_at);
      CREATE TABLE IF NOT EXISTS releases (
        id TEXT PRIMARY KEY, version TEXT NOT NULL, channel TEXT NOT NULL DEFAULT 'inferno', title TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '', download_url TEXT, created_by TEXT, created_at BIGINT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        endpoint TEXT PRIMARY KEY, tester_id TEXT NOT NULL REFERENCES testers(id) ON DELETE CASCADE,
        keys JSONB NOT NULL, created_at BIGINT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS app_settings ( id INT PRIMARY KEY DEFAULT 1, data JSONB NOT NULL, updated_at BIGINT NOT NULL, CONSTRAINT app_settings_one CHECK (id = 1) );
    `);
    await p.query(
      `INSERT INTO testers (id, email, display_name, handle, reward_eligible, is_staff, is_superuser, status, created_at, joined_at)
       VALUES ('t_superuser', $1, 'Shawn Wilson', 'shawn', FALSE, TRUE, TRUE, 'active', $2, $2)
       ON CONFLICT (email) DO UPDATE SET is_superuser = TRUE, is_staff = TRUE, reward_eligible = FALSE, status = 'active'`,
      [SUPERUSER_EMAIL, Date.now()],
    );
  })();
  return ready;
}

function row(r: any): TesterRow { return { ...r, permissions: r.permissions || [], reward_eligible: !!r.reward_eligible, is_staff: !!r.is_staff, is_superuser: !!r.is_superuser }; }

export async function testerByEmail(email: string): Promise<TesterRow | null> {
  await init(); const r = await db().query("SELECT * FROM testers WHERE lower(email) = lower($1)", [email]); return r.rows[0] ? row(r.rows[0]) : null;
}
export async function testerById(idv: string): Promise<TesterRow | null> {
  await init(); const r = await db().query("SELECT * FROM testers WHERE id = $1", [idv]); return r.rows[0] ? row(r.rows[0]) : null;
}
export async function handleTaken(handle: string, exceptId?: string): Promise<boolean> {
  await init(); const r = await db().query("SELECT id FROM testers WHERE lower(handle) = lower($1) AND id <> $2", [handle, exceptId || ""]); return (r.rowCount ?? 0) > 0;
}
export async function listTesters(): Promise<TesterRow[]> {
  await init(); const r = await db().query("SELECT * FROM testers ORDER BY is_staff ASC, created_at ASC"); return r.rows.map(row);
}
export async function touchLogin(idv: string): Promise<void> {
  await db().query("UPDATE testers SET last_login = $1, status = CASE WHEN status='invited' THEN 'active' ELSE status END, joined_at = COALESCE(joined_at,$1) WHERE id = $2", [Date.now(), idv]);
}
export async function updateTesterProfile(idv: string, f: { display_name: string; handle: string; payout_wallet: string | null; session_max_days: number }): Promise<TesterRow | null> {
  await init();
  const r = await db().query(`UPDATE testers SET display_name=$2, handle=$3, payout_wallet=$4, session_max_days=$5 WHERE id=$1 RETURNING *`,
    [idv, f.display_name, f.handle, f.payout_wallet, f.session_max_days]);
  return r.rows[0] ? row(r.rows[0]) : null;
}
export async function setTesterPermissions(idv: string, perms: Permission[]): Promise<TesterRow | null> {
  await init(); const r = await db().query("UPDATE testers SET permissions=$2::jsonb WHERE id=$1 AND is_superuser=FALSE RETURNING *", [idv, JSON.stringify(perms)]); return r.rows[0] ? row(r.rows[0]) : null;
}

// ---- invites (created by staff on the team site's Devnet Users page) ----
// `telegram_handle` is captured at whitelist time and becomes the tester's chat username.
export async function createInvite(email: string, telegramHandle: string, invitedBy: string | null): Promise<{ token: string }> {
  await init();
  const e = email.trim().toLowerCase();
  const token = crypto.randomBytes(24).toString("base64url");
  const now = Date.now();
  await db().query("INSERT INTO invites (token,email,telegram_handle,created_at,expires_at,invited_by) VALUES ($1,$2,$3,$4,$5,$6)", [token, e, telegramHandle, now, now + 14 * 864e5, invitedBy]);
  return { token };
}
export async function inviteByToken(token: string): Promise<{ email: string; telegram_handle: string; expires_at: number; accepted_at: number | null } | null> {
  await init(); const r = await db().query("SELECT email, telegram_handle, expires_at, accepted_at FROM invites WHERE token=$1", [token]); return r.rows[0] || null;
}
/** Accept an invite → create (or return) the tester. The chat handle is the Telegram @handle set at
 *  whitelist time (testers don't pick their own). Idempotent on email. */
export async function acceptInvite(token: string, profile: { display_name: string; payout_wallet: string | null; session_max_days: number }): Promise<{ ok: true; tester: TesterRow } | { ok: false; reason: "invalid" | "expired" | "used" }> {
  await init();
  const inv = await db().query("SELECT email, telegram_handle, expires_at, accepted_at FROM invites WHERE token=$1", [token]);
  if (!inv.rows[0]) return { ok: false, reason: "invalid" };
  if (inv.rows[0].accepted_at) return { ok: false, reason: "used" };
  if (Number(inv.rows[0].expires_at) <= Date.now()) return { ok: false, reason: "expired" };
  const email = String(inv.rows[0].email).toLowerCase();
  const handle = String(inv.rows[0].telegram_handle || "").replace(/^@/, "");
  const now = Date.now();
  const existing = await testerByEmail(email);
  let tester: TesterRow | null;
  if (existing) {
    tester = await updateTesterProfile(existing.id, { ...profile, handle });
  } else {
    const r = await db().query(
      `INSERT INTO testers (id,email,display_name,handle,payout_wallet,reward_eligible,is_staff,permissions,status,session_max_days,created_at,joined_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,'active',$9,$10,$10) RETURNING *`,
      [id("t"), email, profile.display_name, handle, profile.payout_wallet, isRewardEligible(email), isStaffEmail(email), JSON.stringify(TESTER_BASELINE), profile.session_max_days, now],
    );
    tester = row(r.rows[0]);
  }
  await db().query("UPDATE invites SET accepted_at=$1 WHERE token=$2", [now, token]);
  return { ok: true, tester: tester! };
}

// ---- devnet status settings ----
const DEFAULT_SETTINGS = {
  devnetName: "PYRAX Devnet", version: "v0.4.0", chainId: 881109, rpc: "https://sidn-rpc.pyraxchain.com",
  whatToTest: "Spin up a node, keep it online, and report anything that breaks.", telemetryUrl: "",
  // Admin-controlled download gate (toggled from the team-site devnet admin dashboard).
  downloadsOpen: true,
  downloadsClosedMessage: "Downloads are temporarily closed by the admin team. You'll be notified the moment they reopen.",
  downloads: [
    { name: "Inferno", platform: "Windows", url: "https://updates.pyraxchain.com/inferno/latest/win", note: "Desktop node app" },
    { name: "Inferno", platform: "macOS", url: "https://updates.pyraxchain.com/inferno/latest/mac", note: "Desktop node app" },
    { name: "Inferno", platform: "Linux", url: "https://updates.pyraxchain.com/inferno/latest/linux", note: "Desktop node app" },
    { name: "PYRAX CLI", platform: "All platforms", url: "https://updates.pyraxchain.com/cli/latest", note: "Command-line node tool" },
  ],
};
export async function getDevnetSettings(): Promise<Record<string, any>> {
  await init(); const r = await db().query("SELECT data FROM app_settings WHERE id=1"); return { ...DEFAULT_SETTINGS, ...(r.rows[0]?.data || {}) };
}
export async function setDevnetSettings(data: Record<string, any>, by: string): Promise<void> {
  await init(); await db().query(`INSERT INTO app_settings (id,data,updated_at) VALUES (1,$1::jsonb,$2) ON CONFLICT (id) DO UPDATE SET data=$1::jsonb, updated_at=$2`, [JSON.stringify(data), Date.now()]);
}

// ---- nodes + heartbeats ----
const ONLINE_MS = 90_000;
export async function recordHeartbeat(testerId: string, nodePk: string, info: { label?: string; app?: string; appVersion?: string; nodeVersion?: string; height?: number; peers?: number }): Promise<void> {
  await init();
  const now = Date.now();
  await db().query(
    `INSERT INTO nodes (node_pk,tester_id,label,app,app_version,node_version,height,peers,first_seen,last_heartbeat)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)
     ON CONFLICT (node_pk) DO UPDATE SET label=COALESCE($3,nodes.label), app=COALESCE($4,nodes.app), app_version=COALESCE($5,nodes.app_version),
       node_version=COALESCE($6,nodes.node_version), height=COALESCE($7,nodes.height), peers=COALESCE($8,nodes.peers), last_heartbeat=$9`,
    [nodePk, testerId, info.label ?? null, info.app ?? null, info.appVersion ?? null, info.nodeVersion ?? null, info.height ?? null, info.peers ?? null, now],
  );
  await db().query("INSERT INTO node_heartbeats (node_pk,tester_id,ts) VALUES ($1,$2,$3)", [nodePk, testerId, now]);
}
export async function listNodesFor(testerId: string): Promise<any[]> {
  await init();
  const r = await db().query("SELECT * FROM nodes WHERE tester_id=$1 ORDER BY last_heartbeat DESC", [testerId]);
  const now = Date.now();
  return r.rows.map((n) => ({ ...n, online: now - Number(n.last_heartbeat) < ONLINE_MS }));
}
/** Best-single-node uptime % over the window (5-min presence buckets). */
export async function uptimePct(testerId: string, sinceMs: number): Promise<number> {
  await init();
  const now = Date.now();
  const expected = Math.max(1, Math.floor((now - sinceMs) / 300_000));
  const r = await db().query(
    `SELECT node_pk, COUNT(DISTINCT (ts/300000)) AS buckets FROM node_heartbeats WHERE tester_id=$1 AND ts >= $2 GROUP BY node_pk ORDER BY buckets DESC LIMIT 1`,
    [testerId, sinceMs],
  );
  const buckets = r.rows[0] ? Number(r.rows[0].buckets) : 0;
  return Math.min(100, Math.round((buckets / expected) * 1000) / 10);
}

// ---- earnings ledger ----
export async function addLedger(testerId: string, reason: string, pyrx: number, note: string, ref?: string): Promise<void> {
  await init(); await db().query("INSERT INTO earnings_ledger (id,tester_id,reason,pyrx,note,ref,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)", [id("l"), testerId, reason, Math.round(pyrx), note, ref ?? null, Date.now()]);
}
export async function ledgerTotal(testerId: string): Promise<number> {
  await init(); const r = await db().query("SELECT COALESCE(SUM(pyrx),0) AS total FROM earnings_ledger WHERE tester_id=$1", [testerId]); return Number(r.rows[0].total);
}
export async function listLedger(testerId: string, limit = 100): Promise<any[]> {
  await init(); const r = await db().query("SELECT reason,pyrx,note,ref,created_at FROM earnings_ledger WHERE tester_id=$1 ORDER BY created_at DESC LIMIT $2", [testerId, limit]); return r.rows;
}
export async function leaderboard(limit = 50): Promise<any[]> {
  await init();
  const r = await db().query(
    `SELECT t.id, t.display_name, t.handle, t.founding_rank, COALESCE(SUM(l.pyrx),0) AS total
     FROM testers t LEFT JOIN earnings_ledger l ON l.tester_id = t.id
     WHERE t.reward_eligible = TRUE AND t.status = 'active'
     GROUP BY t.id ORDER BY total DESC, t.joined_at ASC LIMIT $1`, [limit]);
  return r.rows.map((x) => ({ ...x, total: Number(x.total) }));
}

/** Claim a Founding Tester slot (first N to connect a node). Returns the rank or null if full/taken. */
export async function claimFounding(testerId: string, bonusPyrx: number, max: number): Promise<number | null> {
  await init();
  const t = await testerById(testerId);
  if (!t || t.founding_rank || !t.reward_eligible) return t?.founding_rank ?? null;
  const c = await db().query("SELECT COUNT(*)::int AS n FROM testers WHERE founding_rank IS NOT NULL");
  const used = c.rows[0].n as number;
  if (used >= max) return null;
  const rank = used + 1;
  await db().query("UPDATE testers SET founding_rank=$2 WHERE id=$1 AND founding_rank IS NULL", [testerId, rank]);
  await addLedger(testerId, "founding", bonusPyrx, `Founding Tester #${rank}`);
  return rank;
}

// ---- node pairing + tokens ----
const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
function genCode(n = 8): string { const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let s = ""; for (let i = 0; i < n; i++) s += a[crypto.randomInt(a.length)]; return s; }

/** Tester-initiated: mint a short pairing code the Inferno app/CLI enters to link a node (15 min). */
export async function createPairingCode(testerId: string, label?: string): Promise<{ code: string; expiresAt: number }> {
  await init();
  const now = Date.now(); const code = genCode(8); const expiresAt = now + 15 * 60_000;
  await db().query("INSERT INTO pairing_codes (code,tester_id,label,created_at,expires_at) VALUES ($1,$2,$3,$4,$5)", [code, testerId, label ?? null, now, expiresAt]);
  return { code, expiresAt };
}
/** App/CLI: redeem a pairing code → create the node + return its long-lived heartbeat token. */
export async function pairNode(code: string, info: { label?: string; app?: string; appVersion?: string; nodeVersion?: string }): Promise<{ ok: true; nodePk: string; nodeToken: string; testerId: string } | { ok: false; reason: "invalid" | "expired" | "used" }> {
  await init();
  const r = await db().query("SELECT tester_id, label, expires_at, used_at FROM pairing_codes WHERE code=$1", [code.trim().toUpperCase()]);
  const row = r.rows[0];
  if (!row) return { ok: false, reason: "invalid" };
  if (row.used_at) return { ok: false, reason: "used" };
  if (Number(row.expires_at) <= Date.now()) return { ok: false, reason: "expired" };
  const now = Date.now();
  const nodePk = "node_" + crypto.randomBytes(10).toString("base64url");
  const nodeToken = crypto.randomBytes(32).toString("base64url");
  await db().query("INSERT INTO nodes (node_pk,tester_id,token_hash,label,app,app_version,node_version,first_seen,last_heartbeat) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)",
    [nodePk, row.tester_id, sha256(nodeToken), info.label || row.label || null, info.app ?? null, info.appVersion ?? null, info.nodeVersion ?? null, now]);
  await db().query("UPDATE pairing_codes SET used_at=$1 WHERE code=$2", [now, code.trim().toUpperCase()]);
  return { ok: true, nodePk, nodeToken, testerId: row.tester_id };
}
/** Resolve a heartbeat Bearer token → the node it belongs to. */
export async function nodeByToken(token: string): Promise<{ node_pk: string; tester_id: string } | null> {
  await init();
  const r = await db().query("SELECT node_pk, tester_id FROM nodes WHERE token_hash=$1", [sha256(token || "")]);
  return r.rows[0] || null;
}

/** Award the monthly uptime reward once per tester per month (idempotent by ledger ref). */
export async function awardUptimeForMonth(testerId: string, ym: string, pyrx: number): Promise<boolean> {
  await init();
  if (pyrx <= 0) return false;
  const ref = `uptime:${ym}`;
  const exists = await db().query("SELECT 1 FROM earnings_ledger WHERE tester_id=$1 AND ref=$2", [testerId, ref]);
  if ((exists.rowCount ?? 0) > 0) return false;
  await addLedger(testerId, "uptime", pyrx, `Uptime — ${ym}`, ref);
  return true;
}
