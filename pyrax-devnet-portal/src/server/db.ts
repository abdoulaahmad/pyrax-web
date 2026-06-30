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
import { bugBounty } from "../lib/rewards";

// Prefer an explicit DATABASE_URL_DEVNET; otherwise derive it from the shared cluster URL by swapping
// the database name (team_pyrax → devnet_tester) so a single DATABASE_URL is enough to boot.
const URL_RAW = process.env.DATABASE_URL_DEVNET
  || (process.env.DATABASE_URL || process.env.DATABASE_URL_TEAM_PYRAX || "").replace(/\/team_pyrax(\?|$)/, "/devnet_tester$1");
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
        id TEXT PRIMARY KEY, bug_id TEXT NOT NULL, author_id TEXT NOT NULL,
        author_name TEXT NOT NULL DEFAULT '', author_user TEXT NOT NULL DEFAULT '', author_admin BOOLEAN NOT NULL DEFAULT FALSE,
        body TEXT NOT NULL, created_at BIGINT NOT NULL
      );
      ALTER TABLE bug_comments ADD COLUMN IF NOT EXISTS author_id TEXT;
      ALTER TABLE bug_comments ADD COLUMN IF NOT EXISTS author_name TEXT NOT NULL DEFAULT '';
      ALTER TABLE bug_comments ADD COLUMN IF NOT EXISTS author_user TEXT NOT NULL DEFAULT '';
      ALTER TABLE bug_comments ADD COLUMN IF NOT EXISTS author_admin BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE bug_comments DROP COLUMN IF EXISTS tester_id;
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
        id TEXT PRIMARY KEY, channel TEXT NOT NULL DEFAULT 'general', author_id TEXT NOT NULL,
        author_name TEXT NOT NULL DEFAULT '', author_user TEXT NOT NULL DEFAULT '', author_admin BOOLEAN NOT NULL DEFAULT FALSE,
        author_role TEXT NOT NULL DEFAULT 'tester', body TEXT NOT NULL DEFAULT '', gif TEXT, created_at BIGINT NOT NULL, deleted BOOLEAN NOT NULL DEFAULT FALSE
      );
      ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS author_role TEXT NOT NULL DEFAULT 'tester';
      ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS author_id TEXT;
      ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS author_name TEXT NOT NULL DEFAULT '';
      ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS author_user TEXT NOT NULL DEFAULT '';
      ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS author_admin BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS gif TEXT;
      ALTER TABLE chat_messages DROP COLUMN IF EXISTS tester_id;
      CREATE INDEX IF NOT EXISTS idx_chat_channel ON chat_messages(channel, created_at);
      -- Private conversations: DMs (2 members) + named group chats (multi-member). Messages live in
      -- chat_messages with channel = conversation id; the WS server enforces membership.
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY, type TEXT NOT NULL DEFAULT 'group', name TEXT NOT NULL DEFAULT '',
        created_by TEXT NOT NULL, created_at BIGINT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS conversation_members (
        conversation_id TEXT NOT NULL, member_id TEXT NOT NULL, member_user TEXT NOT NULL DEFAULT '',
        member_name TEXT NOT NULL DEFAULT '', member_admin BOOLEAN NOT NULL DEFAULT FALSE,
        PRIMARY KEY (conversation_id, member_id)
      );
      CREATE INDEX IF NOT EXISTS idx_convmembers_member ON conversation_members(member_id);
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
      -- Signed legal agreements (NDA + Alpha T&C). One row per acceptance; the latest row per
      -- (tester, doc_type) at the CURRENT version gates portal access. IP + UA captured at signing.
      CREATE TABLE IF NOT EXISTS legal_acceptances (
        id TEXT PRIMARY KEY, tester_id TEXT NOT NULL REFERENCES testers(id) ON DELETE CASCADE,
        doc_type TEXT NOT NULL, doc_version TEXT NOT NULL,
        recipient_name TEXT, signature TEXT, ip TEXT NOT NULL DEFAULT '', user_agent TEXT NOT NULL DEFAULT '',
        accepted_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_legal_tester ON legal_acceptances(tester_id, doc_type);
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
  // The network testers exercise is PYRAX FORGE (the public-facing dev network), chain 710823 —
  // NOT the team-internal Seed network. Admin-editable from the team-site devnet status panel.
  devnetName: "PYRAX Forge Network", version: "v0.1.0", chainId: 710823, rpc: "https://pyrax-forge.rpc.pyraxchain.com",
  whatToTest: "Spin up a Forge node, keep it online, and report anything that breaks.", telemetryUrl: "",
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
    `SELECT t.id, t.display_name, t.handle, t.founding_rank, COALESCE(SUM(l.pyrx),0) AS total,
            (SELECT COUNT(*) FROM bugs b WHERE b.tester_id = t.id AND b.bounty_pyrx > 0) AS bugs
     FROM testers t LEFT JOIN earnings_ledger l ON l.tester_id = t.id
     WHERE t.reward_eligible = TRUE AND t.status = 'active'
     GROUP BY t.id ORDER BY total DESC, t.joined_at ASC LIMIT $1`, [limit]);
  return r.rows.map((x) => ({ ...x, total: Number(x.total), bugs: Number(x.bugs) }));
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

// ---- Issue Council (bugs) ----
export const BUG_STATUSES = ["new", "confirmed", "in_progress", "fixed", "verified", "closed", "duplicate", "wont_fix"] as const;
export const BUG_SEVERITIES = ["low", "medium", "high", "critical"] as const;

export async function createBug(testerId: string, f: { title: string; description: string; reproSteps: string; expected: string; actual: string; severity: string; component: string; environment: Record<string, any>; attachments: any[] }): Promise<any> {
  await init();
  const now = Date.now();
  const sev = (BUG_SEVERITIES as readonly string[]).includes(f.severity) ? f.severity : "medium";
  const r = await db().query(
    `INSERT INTO bugs (id,tester_id,title,description,repro_steps,expected,actual,severity,component,environment,attachments,status,created_at,updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,'new',$12,$12) RETURNING *`,
    [id("bug"), testerId, f.title.slice(0, 160), f.description.slice(0, 8000), f.reproSteps.slice(0, 8000), f.expected.slice(0, 2000), f.actual.slice(0, 2000), sev, f.component.slice(0, 80), JSON.stringify(f.environment || {}), JSON.stringify((f.attachments || []).slice(0, 8)), now],
  );
  return r.rows[0];
}
export async function listBugs(opts: { status?: string; sort?: string } = {}): Promise<any[]> {
  await init();
  const where = opts.status && (BUG_STATUSES as readonly string[]).includes(opts.status) ? "WHERE b.status = $1" : "";
  const order = opts.sort === "votes" ? "b.votes DESC, b.created_at DESC" : opts.sort === "severity" ? "CASE b.severity WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END DESC, b.created_at DESC" : "b.created_at DESC";
  const r = await db().query(`SELECT b.id,b.title,b.severity,b.assigned_severity,b.component,b.status,b.votes,b.confirms,b.bounty_pyrx,b.created_at,b.attachments,t.display_name AS reporter_name,t.handle AS reporter_handle FROM bugs b JOIN testers t ON t.id=b.tester_id ${where} ORDER BY ${order} LIMIT 200`, opts.status && where ? [opts.status] : []);
  return r.rows;
}
export async function getBug(bugId: string, viewerId?: string): Promise<any | null> {
  await init();
  const r = await db().query(`SELECT b.*, t.display_name AS reporter_name, t.handle AS reporter_handle FROM bugs b JOIN testers t ON t.id=b.tester_id WHERE b.id=$1`, [bugId]);
  if (!r.rows[0]) return null;
  const cm = await db().query(`SELECT id,body,created_at,author_name AS display_name,author_user AS handle,author_admin AS is_staff FROM bug_comments WHERE bug_id=$1 ORDER BY created_at ASC`, [bugId]);
  let mine: string[] = [];
  if (viewerId) { const mr = await db().query("SELECT kind FROM bug_reactions WHERE bug_id=$1 AND tester_id=$2", [bugId, viewerId]); mine = mr.rows.map((x) => x.kind); }
  return { ...r.rows[0], comments: cm.rows, myReactions: mine };
}
export async function reactBug(bugId: string, testerId: string, kind: "vote" | "confirm"): Promise<{ votes: number; confirms: number; on: boolean }> {
  await init();
  const ex = await db().query("SELECT 1 FROM bug_reactions WHERE bug_id=$1 AND tester_id=$2 AND kind=$3", [bugId, testerId, kind]);
  let on: boolean;
  if ((ex.rowCount ?? 0) > 0) { await db().query("DELETE FROM bug_reactions WHERE bug_id=$1 AND tester_id=$2 AND kind=$3", [bugId, testerId, kind]); on = false; }
  else { await db().query("INSERT INTO bug_reactions (bug_id,tester_id,kind,created_at) VALUES ($1,$2,$3,$4)", [bugId, testerId, kind, Date.now()]); on = true; }
  const c = await db().query("SELECT COUNT(*) FILTER (WHERE kind='vote') AS votes, COUNT(*) FILTER (WHERE kind='confirm') AS confirms FROM bug_reactions WHERE bug_id=$1", [bugId]);
  const votes = Number(c.rows[0].votes), confirms = Number(c.rows[0].confirms);
  await db().query("UPDATE bugs SET votes=$2, confirms=$3, updated_at=$4 WHERE id=$1", [bugId, votes, confirms, Date.now()]);
  return { votes, confirms, on };
}
export async function addBugComment(bugId: string, author: { id: string; name: string; user: string; admin: boolean }, body: string): Promise<any> {
  await init();
  const r = await db().query("INSERT INTO bug_comments (id,bug_id,author_id,author_name,author_user,author_admin,body,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,body,created_at", [id("c"), bugId, author.id, author.name, author.user, author.admin, body.slice(0, 4000), Date.now()]);
  return r.rows[0];
}
/** Bug reporter (for notifications). */
export async function bugReporter(bugId: string): Promise<{ tester_id: string; title: string } | null> {
  await init(); const r = await db().query("SELECT tester_id, title FROM bugs WHERE id=$1", [bugId]); return r.rows[0] || null;
}
const VALID_STATUSES = ["confirmed", "in_progress", "fixed", "verified"];
/** Staff triage: set status/criticality + reward a VALID issue once. The bounty is the criticality
 *  (severity)-based amount unless an explicit override is given; the reporter is notified. */
export async function triageBug(bugId: string, f: { status?: string; assignedSeverity?: string; bountyPyrx?: number }): Promise<any | null> {
  await init();
  const cur = await db().query("SELECT tester_id, title, severity, assigned_severity FROM bugs WHERE id=$1", [bugId]);
  if (!cur.rows[0]) return null;
  const status = f.status && (BUG_STATUSES as readonly string[]).includes(f.status) ? f.status : undefined;
  const sev = f.assignedSeverity && (BUG_SEVERITIES as readonly string[]).includes(f.assignedSeverity) ? f.assignedSeverity : undefined;
  const explicit = typeof f.bountyPyrx === "number" && f.bountyPyrx > 0 ? Math.round(f.bountyPyrx) : undefined;
  const effSeverity = (sev || cur.rows[0].assigned_severity || cur.rows[0].severity) as string;
  const alreadyPaid = ((await db().query("SELECT 1 FROM earnings_ledger WHERE ref=$1", [`bug:${bugId}`])).rowCount ?? 0) > 0;
  let award = 0;
  if (!alreadyPaid) {
    if (explicit) award = explicit;
    else if (status && VALID_STATUSES.includes(status)) award = bugBounty(effSeverity as any);
  }
  const r = await db().query(
    `UPDATE bugs SET status=COALESCE($2,status), assigned_severity=COALESCE($3,assigned_severity), bounty_pyrx=COALESCE($4,bounty_pyrx), updated_at=$5 WHERE id=$1 RETURNING *`,
    [bugId, status ?? null, sev ?? null, award > 0 ? award : (explicit ?? null), Date.now()],
  );
  let _awarded: { reporterId: string; amount: number; title: string } | null = null;
  if (award > 0) {
    const reporter = cur.rows[0].tester_id;
    const t = await testerById(reporter);
    if (t?.reward_eligible) {
      await addLedger(reporter, "bug", award, cur.rows[0].title, `bug:${bugId}`);
      await addNotification(reporter, "bug", "Your bug was accepted 🎉", `"${cur.rows[0].title}" earned ${award.toLocaleString("en-US")} PYRX.`, "/app");
      _awarded = { reporterId: reporter, amount: award, title: cur.rows[0].title };
    }
  }
  return { ...r.rows[0], _awarded };
}

export async function testerByHandle(handle: string): Promise<TesterRow | null> {
  await init();
  const r = await db().query("SELECT * FROM testers WHERE lower(handle)=lower($1) AND handle <> ''", [handle]);
  return r.rows[0] ? row(r.rows[0]) : null;
}

// ---- notifications ----
export async function addNotification(testerId: string, kind: string, title: string, body: string, link?: string): Promise<void> {
  await init();
  await db().query("INSERT INTO notifications (id,tester_id,kind,title,body,link,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)", [id("n"), testerId, kind, title.slice(0, 160), body.slice(0, 400), link ?? null, Date.now()]);
}
export async function listNotifications(testerId: string, limit = 30): Promise<any[]> {
  await init();
  const r = await db().query("SELECT id,kind,title,body,link,read,created_at FROM notifications WHERE tester_id=$1 ORDER BY created_at DESC LIMIT $2", [testerId, limit]);
  return r.rows;
}
export async function unreadCount(testerId: string): Promise<number> {
  await init();
  const r = await db().query("SELECT COUNT(*)::int AS n FROM notifications WHERE tester_id=$1 AND read=FALSE", [testerId]);
  return r.rows[0].n;
}
export async function markNotificationsRead(testerId: string): Promise<void> {
  await init();
  await db().query("UPDATE notifications SET read=TRUE WHERE tester_id=$1 AND read=FALSE", [testerId]);
}
export async function bugsAcceptedCount(testerId: string): Promise<number> {
  await init();
  const r = await db().query("SELECT COUNT(*)::int AS n FROM bugs WHERE tester_id=$1 AND bounty_pyrx>0", [testerId]);
  return r.rows[0].n;
}

// ---- private conversations (DMs + group chats) ----
export interface ConvMember { id: string; user: string; name: string; admin: boolean }
export async function findDm(a: string, b: string): Promise<string | null> {
  await init();
  const r = await db().query(
    `SELECT c.id FROM conversations c
     JOIN conversation_members m1 ON m1.conversation_id=c.id AND m1.member_id=$1
     JOIN conversation_members m2 ON m2.conversation_id=c.id AND m2.member_id=$2
     WHERE c.type='dm' LIMIT 1`, [a, b]);
  return r.rows[0]?.id || null;
}
export async function createConversation(type: "dm" | "group", name: string, creator: ConvMember, members: ConvMember[]): Promise<string> {
  await init();
  const all = [creator, ...members].filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i);
  if (type === "dm" && all.length === 2) { const ex = await findDm(all[0].id, all[1].id); if (ex) return ex; }
  const cid = "c_" + crypto.randomBytes(10).toString("base64url");
  await db().query("INSERT INTO conversations (id,type,name,created_by,created_at) VALUES ($1,$2,$3,$4,$5)", [cid, type, name.slice(0, 80), creator.id, Date.now()]);
  for (const m of all) await db().query("INSERT INTO conversation_members (conversation_id,member_id,member_user,member_name,member_admin) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING", [cid, m.id, m.user, m.name, m.admin]);
  return cid;
}
export async function isConversationMember(convId: string, uid: string): Promise<boolean> {
  await init();
  const r = await db().query("SELECT 1 FROM conversation_members WHERE conversation_id=$1 AND member_id=$2", [convId, uid]);
  return (r.rowCount ?? 0) > 0;
}
export async function listConversations(uid: string): Promise<any[]> {
  await init();
  const r = await db().query(
    `SELECT c.id, c.type, c.name, c.created_at,
       (SELECT json_agg(json_build_object('id',cm.member_id,'user',cm.member_user,'name',cm.member_name,'admin',cm.member_admin)) FROM conversation_members cm WHERE cm.conversation_id=c.id) AS members,
       (SELECT body FROM chat_messages msg WHERE msg.channel=c.id AND msg.deleted=FALSE ORDER BY msg.created_at DESC LIMIT 1) AS last_body
     FROM conversations c JOIN conversation_members m ON m.conversation_id=c.id AND m.member_id=$1
     ORDER BY COALESCE((SELECT MAX(msg.created_at) FROM chat_messages msg WHERE msg.channel=c.id), c.created_at) DESC LIMIT 50`, [uid]);
  return r.rows;
}
export async function searchTesters(q: string, excludeId: string, limit = 8): Promise<any[]> {
  await init();
  const s = `%${q.toLowerCase()}%`;
  const r = await db().query("SELECT id, handle, display_name FROM testers WHERE status='active' AND id<>$1 AND handle<>'' AND (lower(handle) LIKE $2 OR lower(display_name) LIKE $2) ORDER BY handle LIMIT $3", [excludeId, s, limit]);
  return r.rows;
}
// ---- releases ----
export async function createRelease(by: string, f: { version: string; channel?: string; title?: string; notes?: string; downloadUrl?: string }): Promise<any> {
  await init();
  const r = await db().query("INSERT INTO releases (id,version,channel,title,notes,download_url,created_by,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
    [id("rel"), f.version.slice(0, 40), (f.channel || "inferno").slice(0, 24), (f.title || "").slice(0, 160), (f.notes || "").slice(0, 8000), f.downloadUrl || null, by, Date.now()]);
  return r.rows[0];
}
export async function listReleases(limit = 30): Promise<any[]> {
  await init();
  const r = await db().query("SELECT id,version,channel,title,notes,download_url,created_at FROM releases ORDER BY created_at DESC LIMIT $1", [limit]);
  return r.rows;
}

// ---- web push subscriptions ----
export async function savePushSub(testerId: string, endpoint: string, keys: any): Promise<void> {
  await init();
  await db().query("INSERT INTO push_subscriptions (endpoint,tester_id,keys,created_at) VALUES ($1,$2,$3::jsonb,$4) ON CONFLICT (endpoint) DO UPDATE SET tester_id=$2, keys=$3::jsonb", [endpoint, testerId, JSON.stringify(keys), Date.now()]);
}
export async function listPushSubs(): Promise<any[]> {
  await init();
  const r = await db().query("SELECT endpoint, keys FROM push_subscriptions");
  return r.rows;
}
export async function deletePushSub(endpoint: string): Promise<void> {
  await init();
  await db().query("DELETE FROM push_subscriptions WHERE endpoint=$1", [endpoint]);
}

/** Persist a system chat message (e.g., a release announcement) to a channel. */
export async function postSystemMessage(channel: string, body: string): Promise<void> {
  await init();
  await db().query("INSERT INTO chat_messages (id,channel,author_id,author_name,author_user,author_admin,author_role,body,created_at) VALUES ($1,$2,'system','PYRAX','PYRAX',TRUE,'admin',$3,$4)", [id("m"), channel, body.slice(0, 2000), Date.now()]);
}

/** Active-tester roster for the chat members panel (online status comes from the WS server).
 *  role: admin (staff/blue), support (community-support/green), tester (orange). */
export async function chatRoster(): Promise<any[]> {
  await init();
  const r = await db().query("SELECT id, handle AS user, display_name AS name, is_staff, permissions FROM testers WHERE status='active' AND handle<>'' ORDER BY is_staff DESC, lower(handle) ASC LIMIT 300");
  return r.rows.map((x) => ({ id: x.id, user: x.user, name: x.name, admin: !!x.is_staff, role: x.is_staff ? "admin" : ((x.permissions || []).includes("community.support") ? "support" : "tester") }));
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

// ---- legal agreements (NDA + Alpha T&C) ---------------------------------------------------------

/** Record a signed/accepted legal document with the signer's IP + user agent. */
export async function recordLegalAcceptance(
  testerId: string, docType: "nda" | "tos", docVersion: string,
  f: { recipientName?: string | null; signature?: string | null; ip: string; userAgent: string },
): Promise<void> {
  await init();
  await db().query(
    `INSERT INTO legal_acceptances (id, tester_id, doc_type, doc_version, recipient_name, signature, ip, user_agent, accepted_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [id("legal"), testerId, docType, docVersion, f.recipientName ?? null, f.signature ?? null, (f.ip || "").slice(0, 64), (f.userAgent || "").slice(0, 400), Date.now()],
  );
}

/** Portal gate status. The NDA is a ONE-TIME sign (any prior acceptance counts forever). The Alpha
 *  T&C must be accepted once PER LOGIN — satisfied only if there's an acceptance at/after the current
 *  session's start. Pass the session's created_at as `sessionStartedAt`. */
export async function getLegalStatus(testerId: string, sessionStartedAt = 0): Promise<{ ndaAccepted: boolean; tosAccepted: boolean }> {
  await init();
  const r = await db().query(
    `SELECT
       EXISTS(SELECT 1 FROM legal_acceptances WHERE tester_id=$1 AND doc_type='nda') AS nda,
       EXISTS(SELECT 1 FROM legal_acceptances WHERE tester_id=$1 AND doc_type='tos' AND accepted_at >= $2) AS tos`,
    [testerId, sessionStartedAt],
  );
  return { ndaAccepted: !!r.rows[0].nda, tosAccepted: !!r.rows[0].tos };
}

/** The tester's own latest signed NDA + T&C (so they can view their executed copy in their account). */
export async function getMyLegalAcceptances(testerId: string): Promise<{ nda: any | null; tos: any | null }> {
  await init();
  const r = await db().query(
    `SELECT DISTINCT ON (doc_type) doc_type, doc_version, recipient_name, signature, ip, accepted_at
       FROM legal_acceptances WHERE tester_id=$1 ORDER BY doc_type, accepted_at DESC`,
    [testerId],
  );
  const by: Record<string, any> = {};
  for (const x of r.rows) by[x.doc_type] = x;
  return { nda: by.nda || null, tos: by.tos || null };
}

/** Admin view: every signed agreement with the signer's identity, IP, and timestamp (latest first). */
export async function listLegalAcceptances(): Promise<any[]> {
  await init();
  const r = await db().query(
    `SELECT la.id, la.doc_type, la.doc_version, la.recipient_name, la.signature, la.ip, la.user_agent, la.accepted_at,
            t.email, t.handle, t.display_name
       FROM legal_acceptances la JOIN testers t ON t.id = la.tester_id
      ORDER BY la.accepted_at DESC LIMIT 1000`,
  );
  return r.rows;
}

/** Fully remove a tester and every record that references them (used when a tester DECLINES the
 *  legal terms). Cascading FKs cover sessions/nodes/pairing/ledger/push/legal; the rest are cleaned
 *  explicitly because they store a plain tester/author id (no FK). The superuser is never deletable. */
export async function deleteTesterFully(testerId: string): Promise<boolean> {
  await init();
  const me = await testerById(testerId);
  if (!me || me.is_superuser) return false;
  const c = await db().connect();
  try {
    await c.query("BEGIN");
    await c.query("DELETE FROM bug_reactions WHERE tester_id=$1", [testerId]);
    await c.query("DELETE FROM bug_comments WHERE author_id=$1", [testerId]);
    await c.query("DELETE FROM bugs WHERE tester_id=$1", [testerId]);
    await c.query("DELETE FROM reports WHERE tester_id=$1", [testerId]);
    await c.query("DELETE FROM notifications WHERE tester_id=$1", [testerId]);
    await c.query("DELETE FROM conversation_members WHERE member_id=$1", [testerId]);
    await c.query("DELETE FROM chat_messages WHERE author_id=$1", [testerId]);
    await c.query("DELETE FROM testers WHERE id=$1", [testerId]); // cascades sessions/nodes/pairing/ledger/push/legal
    await c.query("COMMIT");
    return true;
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}
