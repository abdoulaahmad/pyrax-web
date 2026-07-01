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
import { bugBounty, perTestReward, boundedAward, consistencyBonus, CONSISTENCY, type TesterTestStats } from "../lib/rewards";
import { SEED_TESTS } from "./tests-seed";

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
    pool = new pg.Pool({
      connectionString, ssl: { rejectUnauthorized: false }, max: 6, idleTimeoutMillis: 30_000,
      // Bound EVERY DB operation so a stalled connect or query can never hang a request forever.
      // The login path awaits init(), so an UNBOUNDED connect meant one stuck connection wedged the
      // whole portal ("send code just hangs"). connect ≤10s; a query ≤20s → fail fast, never hang.
      connectionTimeoutMillis: 10_000, statement_timeout: 20_000, query_timeout: 20_000,
    });
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
      -- Idempotency is a DB INVARIANT, not an app-level check. Every payable event has a stable ref
      -- (test:{id}, bug:{id}, consistency:{isoWeek}, uptime:{ym}); without a UNIQUE index the award path
      -- was a check-then-insert TOCTOU race two concurrent accepts could double-pay. Collapse any
      -- pre-existing duplicate refs (keep the earliest row) BEFORE the index so it builds cleanly, then
      -- enforce exactly-once at the database (paired with INSERT ... ON CONFLICT (ref) DO NOTHING).
      DELETE FROM earnings_ledger a USING earnings_ledger b WHERE a.ref IS NOT NULL AND a.ref = b.ref AND a.ctid > b.ctid;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_ref ON earnings_ledger(ref) WHERE ref IS NOT NULL;
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
      -- Product Tests. The campaigns table is repurposed as TESTS (a self-contained module a tester
      -- completes and submits proof for) and reports as SUBMISSIONS. The new columns below are added
      -- with guarded, additive ALTERs so re-running init() on an existing DB is always safe.
      CREATE TABLE IF NOT EXISTS campaigns (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '', steps JSONB NOT NULL DEFAULT '[]'::jsonb,
        opens_at BIGINT, closes_at BIGINT, status TEXT NOT NULL DEFAULT 'open', created_by TEXT, created_at BIGINT NOT NULL
      );
      ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS track TEXT NOT NULL DEFAULT 'inferno';
      ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS app_version TEXT NOT NULL DEFAULT '';
      ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS weight_pyrx BIGINT NOT NULL DEFAULT 0;
      ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS prereq_slugs JSONB NOT NULL DEFAULT '[]'::jsonb;
      ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS order_idx INT NOT NULL DEFAULT 0;
      ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS est_minutes INT NOT NULL DEFAULT 0;
      ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS slug TEXT;
      -- slug is the stable id used by prereqs + the boot seed. UNIQUE so upsert-by-slug is atomic;
      -- the partial predicate keeps any legacy rows that predate slugs (NULL) from colliding.
      CREATE UNIQUE INDEX IF NOT EXISTS idx_campaigns_slug ON campaigns(slug) WHERE slug IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_campaigns_track_order ON campaigns(track, order_idx);
      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL, tester_id TEXT NOT NULL, results JSONB NOT NULL DEFAULT '[]'::jsonb,
        notes TEXT NOT NULL DEFAULT '', attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
        accepted BOOLEAN, created_at BIGINT NOT NULL
      );
      ALTER TABLE reports ADD COLUMN IF NOT EXISTS assigned_to TEXT;
      ALTER TABLE reports ADD COLUMN IF NOT EXISTS assigned_by TEXT;
      ALTER TABLE reports ADD COLUMN IF NOT EXISTS assigned_at BIGINT;
      ALTER TABLE reports ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'submitted';
      ALTER TABLE reports ADD COLUMN IF NOT EXISTS reviewer_verdict TEXT;
      ALTER TABLE reports ADD COLUMN IF NOT EXISTS reviewer_notes TEXT;
      ALTER TABLE reports ADD COLUMN IF NOT EXISTS logs TEXT;
      ALTER TABLE reports ADD COLUMN IF NOT EXISTS sentinel_assessment JSONB;
      ALTER TABLE reports ADD COLUMN IF NOT EXISTS awarded_pyrx BIGINT NOT NULL DEFAULT 0;
      ALTER TABLE reports ADD COLUMN IF NOT EXISTS accepted_at BIGINT;
      ALTER TABLE reports ADD COLUMN IF NOT EXISTS updated_at BIGINT NOT NULL DEFAULT 0;
      CREATE INDEX IF NOT EXISTS idx_reports_status_created ON reports(review_status, created_at);
      CREATE INDEX IF NOT EXISTS idx_reports_assignee ON reports(assigned_to);
      CREATE INDEX IF NOT EXISTS idx_reports_tester_created ON reports(tester_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_reports_campaign ON reports(campaign_id);
      -- Submission review thread (mirrors bug_comments): staff ↔ tester back-and-forth on a submission.
      CREATE TABLE IF NOT EXISTS report_comments (
        id TEXT PRIMARY KEY, report_id TEXT NOT NULL, author_id TEXT NOT NULL,
        author_name TEXT NOT NULL DEFAULT '', author_user TEXT NOT NULL DEFAULT '', author_admin BOOLEAN NOT NULL DEFAULT FALSE,
        body TEXT NOT NULL, created_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_reportcomments_report ON report_comments(report_id, created_at);
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
    // Seed the pre-authored Product Test suite, idempotently by slug (upsert overwrites seeded content
    // so instruction edits ship on the next boot; testers' submissions reference the campaign id which
    // is stable across re-seeds). Failures here must never block boot — the portal runs without tests.
    // Seed the Product-Test catalog in the BACKGROUND — the login/session path must NEVER wait on
    // (or be blocked by) the content seed. Best-effort; on failure the catalog is just empty until the
    // next boot. This keeps init() (and therefore sign-in) fast + resilient no matter the seed's state.
    void seedTests().catch((e) => console.error("[db] test seed failed:", (e as { message?: string })?.message || e));
    // Boot-time + periodic retention sweep for raw heartbeats (in addition to the write-path prune),
    // so an idle portal still trims the table. Unref'd so it never holds the process open.
    void pruneHeartbeats().catch(() => {});
    const sweep = setInterval(() => void pruneHeartbeats().catch(() => {}), HEARTBEAT_PRUNE_EVERY_MS);
    if (typeof (sweep as any).unref === "function") (sweep as any).unref();
  })().catch((e) => {
    // A failed init (a transient DB blip / connect timeout) must NOT wedge the portal forever: clear
    // the cached promise so the NEXT request retries a fresh init, instead of every request awaiting
    // a permanently-rejected one (which looked like "login always hangs").
    ready = null;
    throw e;
  });
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
// Raw heartbeat rows are only needed for the uptime window (the dashboard reads 30 days). We keep a
// little headroom and prune anything older than 35 days so the table can't grow without bound — one
// online node emits a heartbeat every ~30s (~100k rows/month). uptimePct stays correct because its
// query never looks past `sinceMs` (≤30d).
export const HEARTBEAT_RETENTION_MS = 35 * 86_400_000;
const HEARTBEAT_PRUNE_EVERY_MS = 6 * 3_600_000; // at most once every 6h per process
let lastHeartbeatPrune = 0;

/** Delete heartbeat rows older than the retention window. Returns rows removed. */
export async function pruneHeartbeats(retentionMs = HEARTBEAT_RETENTION_MS): Promise<number> {
  await init();
  const cutoff = Date.now() - retentionMs;
  const r = await db().query("DELETE FROM node_heartbeats WHERE ts < $1", [cutoff]);
  return r.rowCount ?? 0;
}
/** Best-effort, throttled prune triggered on the heartbeat write path (no separate cron needed). */
function maybePruneHeartbeats(): void {
  const now = Date.now();
  if (now - lastHeartbeatPrune < HEARTBEAT_PRUNE_EVERY_MS) return;
  lastHeartbeatPrune = now;
  void pruneHeartbeats().catch((e) => console.error("[db] heartbeat prune failed:", e?.message || e));
}

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
  maybePruneHeartbeats();
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
export async function addLedger(testerId: string, reason: string, pyrx: number, note: string, ref?: string): Promise<boolean> {
  await init();
  // Exactly-once by ref: the partial UNIQUE index on (ref) WHERE ref IS NOT NULL turns a concurrent or
  // replayed award into a no-op instead of a double-pay. Returns TRUE only when a NEW row was written —
  // so callers know whether to notify / echo the award; FALSE means this ref was already paid.
  const r = await db().query(
    "INSERT INTO earnings_ledger (id,tester_id,reason,pyrx,note,ref,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (ref) WHERE ref IS NOT NULL DO NOTHING",
    [id("l"), testerId, reason, Math.round(pyrx), note, ref ?? null, Date.now()],
  );
  return (r.rowCount ?? 0) > 0;
}

/** Serialize the auto-award critical section (weekly-cap read → §8 decision → award) per tester across
 *  concurrent observer assessments. The weekly cap isn't keyed by a ledger ref, so the unique-ref
 *  idempotency can't bound it — N concurrent assessments of DIFFERENT submissions by one tester could
 *  each read `autoAwardsThisWeek < cap` and collectively blow past it. A cooperative per-tester advisory
 *  lock (held on a dedicated pooled connection) forces those sections to run one at a time. The lock is
 *  advisory: it only works because EVERY auto-award path runs inside it. */
export async function withTesterAwardLock<T>(testerId: string, fn: () => Promise<T>): Promise<T> {
  await init();
  const client = await db().connect();
  const key = `tests-award:${testerId}`;
  try {
    await client.query("SELECT pg_advisory_lock(hashtext($1))", [key]);
    return await fn();
  } finally {
    try { await client.query("SELECT pg_advisory_unlock(hashtext($1))", [key]); } catch { /* connection may have dropped; the lock auto-frees on close */ }
    client.release();
  }
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

/** How many Founding Tester slots have been claimed (testers with a non-null founding_rank). */
export async function foundingClaimedCount(): Promise<number> {
  await init();
  const r = await db().query("SELECT COUNT(*)::int AS n FROM testers WHERE founding_rank IS NOT NULL");
  return r.rows[0].n as number;
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
/** Remove a node the tester owns (revokes the node + its heartbeat token; prunes its heartbeats).
 *  Scoped to the owner so a tester can only unlink their own nodes. Returns true if one was removed. */
export async function unlinkNode(testerId: string, nodePk: string): Promise<boolean> {
  await init();
  const r = await db().query("DELETE FROM nodes WHERE node_pk=$1 AND tester_id=$2", [nodePk, testerId]);
  if ((r.rowCount ?? 0) === 0) return false;
  // Heartbeat rows aren't FK-bound to nodes; clean them up so uptime no longer counts the removed node.
  await db().query("DELETE FROM node_heartbeats WHERE node_pk=$1 AND tester_id=$2", [nodePk, testerId]);
  return true;
}
/** Rotate a node's heartbeat token (invalidates the old one). Scoped to the owner. Returns the new
 *  raw token (shown once) + nodePk, or null if the tester doesn't own that node. */
export async function rotateNodeToken(testerId: string, nodePk: string): Promise<{ nodePk: string; nodeToken: string } | null> {
  await init();
  const nodeToken = crypto.randomBytes(32).toString("base64url");
  const r = await db().query("UPDATE nodes SET token_hash=$3 WHERE node_pk=$1 AND tester_id=$2 RETURNING node_pk", [nodePk, testerId, sha256(nodeToken)]);
  if ((r.rowCount ?? 0) === 0) return null;
  return { nodePk, nodeToken };
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
      // Notify + echo only when THIS call actually wrote the ledger row (atomic ON CONFLICT), so a
      // concurrent/replayed triage can't double-notify or double-count the same bounty.
      const paid = await addLedger(reporter, "bug", award, cur.rows[0].title, `bug:${bugId}`);
      if (paid) {
        await addNotification(reporter, "bug", "Your bug was accepted 🎉", `"${cur.rows[0].title}" earned ${award.toLocaleString("en-US")} PYRX.`, "/app");
        _awarded = { reporterId: reporter, amount: award, title: cur.rows[0].title };
      }
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
  // Atomic once-per-month: the unique-ref index guarantees a single payment even under a concurrent
  // sweep. `paid` is TRUE only when this call wrote the row.
  return addLedger(testerId, "uptime", pyrx, `Uptime — ${ym}`, ref);
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
    await c.query("DELETE FROM report_comments WHERE author_id=$1", [testerId]);
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

// ===================================================================================================
// Product Tests — the "tests" (campaigns) + "submissions" (reports) data layer.
//
// A test is a self-contained module a tester completes and submits proof for; submissions flow through
// a review state machine and, on acceptance, pay the test's weight (+ on-time bonus) once via the
// earnings ledger under the idempotent ref `test:{report_id}`. Prereq slugs gate progression:
// a test unlocks for a tester only once every prereq test has an ACCEPTED submission by that tester.
// ===================================================================================================

export const REVIEW_STATUSES = ["submitted", "ai_screening", "in_review", "needs_more", "accepted", "rejected"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];
export const REVIEW_VERDICTS = ["accept", "reject", "needs_more"] as const;
export type ReviewVerdict = (typeof REVIEW_VERDICTS)[number];

// One ISO-week has 7 days; used for the "this week" windows in testerTestStats + consistency.
const WEEK_MS = 7 * 86_400_000;
/** Start (ms) of the current UTC ISO week (Monday 00:00 UTC). Consistency + weekly caps key off this. */
export function isoWeekStart(nowMs = Date.now()): number {
  const d = new Date(nowMs);
  const dow = (d.getUTCDay() + 6) % 7; // 0 = Monday
  const monday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - dow * 86_400_000;
  return monday;
}
/** Compact ISO-week label (e.g. "2026-W27") for idempotent consistency-award refs. */
export function isoWeekLabel(nowMs = Date.now()): string {
  const start = isoWeekStart(nowMs);
  const d = new Date(start);
  // ISO week number: Thursday of this week decides the year.
  const thursday = new Date(start + 3 * 86_400_000);
  const year = thursday.getUTCFullYear();
  const jan1 = Date.UTC(year, 0, 1);
  const week = Math.floor((thursday.getTime() - jan1) / WEEK_MS) + 1;
  void d;
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** Normalize a DB campaign row into the "test" shape the app consumes (numbers coerced from bigint). */
function testRow(r: any) {
  return {
    id: r.id as string,
    slug: (r.slug ?? null) as string | null,
    track: r.track as string,
    title: r.title as string,
    body: r.body as string,
    steps: (r.steps ?? []) as any[],
    prereqSlugs: (r.prereq_slugs ?? []) as string[],
    orderIdx: Number(r.order_idx ?? 0),
    estMinutes: Number(r.est_minutes ?? 0),
    weightPyrx: Number(r.weight_pyrx ?? 0),
    appVersion: (r.app_version ?? "") as string,
    status: r.status as string,
    opensAt: r.opens_at == null ? null : Number(r.opens_at),
    closesAt: r.closes_at == null ? null : Number(r.closes_at),
    createdAt: Number(r.created_at ?? 0),
  };
}
export type ProductTest = ReturnType<typeof testRow>;

/** Idempotently create/update a test by slug (used by the boot seed AND staff authoring). Returns the
 *  test id. `steps`/`prereqSlugs` are stored as JSONB. Existing rows keep their id (submissions stay
 *  linked); content columns are overwritten with the supplied values. */
export async function upsertTest(t: {
  slug: string; track: string; title: string; body?: string; steps?: any[];
  prereqSlugs?: string[]; orderIdx?: number; estMinutes?: number; weightPyrx?: number;
  appVersion?: string; status?: string; opensAt?: number | null; closesAt?: number | null; createdBy?: string | null;
}): Promise<string> {
  await init();
  const now = Date.now();
  const slug = t.slug.trim().toLowerCase().slice(0, 80);
  const track = t.track === "cli" ? "cli" : "inferno";
  const r = await db().query(
    `INSERT INTO campaigns (id, slug, track, title, body, steps, prereq_slugs, order_idx, est_minutes, weight_pyrx, app_version, status, opens_at, closes_at, created_by, created_at)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     ON CONFLICT (slug) WHERE slug IS NOT NULL DO UPDATE SET
       track=EXCLUDED.track, title=EXCLUDED.title, body=EXCLUDED.body, steps=EXCLUDED.steps,
       prereq_slugs=EXCLUDED.prereq_slugs, order_idx=EXCLUDED.order_idx, est_minutes=EXCLUDED.est_minutes,
       weight_pyrx=EXCLUDED.weight_pyrx, app_version=EXCLUDED.app_version, status=EXCLUDED.status,
       opens_at=EXCLUDED.opens_at, closes_at=EXCLUDED.closes_at
     RETURNING id`,
    [
      id("test"), slug, track, t.title.slice(0, 200), (t.body || "").slice(0, 4000),
      JSON.stringify(t.steps || []), JSON.stringify(t.prereqSlugs || []),
      Math.round(t.orderIdx ?? 0), Math.round(t.estMinutes ?? 0), Math.round(t.weightPyrx ?? 0),
      (t.appVersion || "").slice(0, 40), t.status || "open",
      t.opensAt ?? null, t.closesAt ?? null, t.createdBy ?? null, now,
    ],
  );
  return r.rows[0].id as string;
}

/** Upsert the entire pre-authored suite (called on boot). Idempotent by slug. */
async function seedTests(): Promise<void> {
  for (const t of SEED_TESTS) {
    await upsertTest({
      slug: t.slug, track: t.track, title: t.title, body: t.body, steps: t.steps,
      prereqSlugs: t.prereq_slugs, orderIdx: t.order_idx, estMinutes: t.est_minutes,
      weightPyrx: t.weight_pyrx, appVersion: t.app_version, status: "open", createdBy: "seed",
    });
  }
}

/** All published tests (staff view), ordered by track then order_idx. */
export async function listTests(): Promise<ProductTest[]> {
  await init();
  const r = await db().query("SELECT * FROM campaigns ORDER BY track ASC, order_idx ASC, created_at ASC");
  return r.rows.map(testRow);
}
/** One test by id. */
export async function getTest(testId: string): Promise<ProductTest | null> {
  await init();
  const r = await db().query("SELECT * FROM campaigns WHERE id=$1", [testId]);
  return r.rows[0] ? testRow(r.rows[0]) : null;
}
/** One test by slug (prereq resolution + seeding). */
export async function getTestBySlug(slug: string): Promise<ProductTest | null> {
  await init();
  const r = await db().query("SELECT * FROM campaigns WHERE slug=$1", [slug]);
  return r.rows[0] ? testRow(r.rows[0]) : null;
}

/** Whether the test's on-time window is still open (closes_at unset ⇒ always on time). */
export function testIsOnTime(test: Pick<ProductTest, "closesAt">, nowMs = Date.now()): boolean {
  return test.closesAt == null || nowMs <= test.closesAt;
}

// ---- submissions ----------------------------------------------------------------------------------

/** Sanitized submission input the tester POSTs. `results` mirrors the test's steps by index. */
export interface SubmissionInput {
  results: Array<{ stepIndex: number; pass: boolean; note?: string }>;
  attachments: Array<{ url: string; type: string; stepIndex?: number; name?: string; size?: number }>;
  logs?: string;
  notes?: string;
}

const MAX_LOGS = 16_000;

/** Create a tester's submission for a test. `onTime` is captured at submit against the test's window.
 *  Returns the new submission id. The caller validates prereqs + attachments before calling. */
export async function createSubmission(testerId: string, testId: string, input: SubmissionInput): Promise<{ id: string }> {
  await init();
  const now = Date.now();
  const rid = id("sub");
  await db().query(
    `INSERT INTO reports (id, campaign_id, tester_id, results, notes, attachments, logs, review_status, created_at, updated_at)
     VALUES ($1,$2,$3,$4::jsonb,$5,$6::jsonb,$7,'submitted',$8,$8)`,
    [
      rid, testId, testerId,
      JSON.stringify((input.results || []).slice(0, 200)),
      (input.notes || "").slice(0, 4000),
      JSON.stringify((input.attachments || []).slice(0, 24)),
      input.logs ? String(input.logs).slice(0, MAX_LOGS) : null,
      now,
    ],
  );
  return { id: rid };
}

/** Normalize a submission row joined with its test + tester into the app shape. */
function submissionRow(r: any) {
  return {
    id: r.id as string,
    testId: r.campaign_id as string,
    testSlug: (r.test_slug ?? null) as string | null,
    testTitle: (r.test_title ?? "") as string,
    track: (r.test_track ?? "") as string,
    weightPyrx: Number(r.test_weight ?? 0),
    testerId: r.tester_id as string,
    testerName: (r.tester_name ?? "") as string,
    testerHandle: (r.tester_handle ?? "") as string,
    results: (r.results ?? []) as any[],
    attachments: (r.attachments ?? []) as any[],
    notes: (r.notes ?? "") as string,
    logs: (r.logs ?? null) as string | null,
    reviewStatus: (r.review_status ?? "submitted") as ReviewStatus,
    reviewerVerdict: (r.reviewer_verdict ?? null) as string | null,
    reviewerNotes: (r.reviewer_notes ?? null) as string | null,
    sentinelAssessment: (r.sentinel_assessment ?? null) as any,
    assignedTo: (r.assigned_to ?? null) as string | null,
    assignedBy: (r.assigned_by ?? null) as string | null,
    assignedAt: r.assigned_at == null ? null : Number(r.assigned_at),
    awardedPyrx: Number(r.awarded_pyrx ?? 0),
    acceptedAt: r.accepted_at == null ? null : Number(r.accepted_at),
    createdAt: Number(r.created_at ?? 0),
    updatedAt: Number(r.updated_at ?? 0),
  };
}
export type Submission = ReturnType<typeof submissionRow>;

const SUBMISSION_SELECT = `
  SELECT rp.*, c.slug AS test_slug, c.title AS test_title, c.track AS test_track, c.weight_pyrx AS test_weight,
         t.display_name AS tester_name, t.handle AS tester_handle
  FROM reports rp
  JOIN campaigns c ON c.id = rp.campaign_id
  JOIN testers t ON t.id = rp.tester_id`;

/** One submission by id (with its test + tester). */
export async function getSubmission(submissionId: string): Promise<Submission | null> {
  await init();
  const r = await db().query(`${SUBMISSION_SELECT} WHERE rp.id=$1`, [submissionId]);
  return r.rows[0] ? submissionRow(r.rows[0]) : null;
}

/** List submissions with optional filters (staff review queue + tester history share this). */
export async function listSubmissions(filter: { status?: string; assignee?: string; track?: string; tester?: string; limit?: number } = {}): Promise<Submission[]> {
  await init();
  const where: string[] = [];
  const vals: any[] = [];
  if (filter.status && (REVIEW_STATUSES as readonly string[]).includes(filter.status)) { vals.push(filter.status); where.push(`rp.review_status = $${vals.length}`); }
  if (filter.assignee) { vals.push(filter.assignee); where.push(`rp.assigned_to = $${vals.length}`); }
  if (filter.track === "cli" || filter.track === "inferno") { vals.push(filter.track); where.push(`c.track = $${vals.length}`); }
  if (filter.tester) { vals.push(filter.tester); where.push(`rp.tester_id = $${vals.length}`); }
  vals.push(Math.min(500, Math.max(1, filter.limit ?? 200)));
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const r = await db().query(`${SUBMISSION_SELECT} ${clause} ORDER BY rp.created_at DESC LIMIT $${vals.length}`, vals);
  return r.rows.map(submissionRow);
}

/** Assign a submission to a reviewer (staff). Idempotent-ish: overwrites the assignee. */
export async function assignSubmission(submissionId: string, assigneeId: string, assignedBy: string): Promise<Submission | null> {
  await init();
  const now = Date.now();
  await db().query(
    `UPDATE reports SET assigned_to=$2, assigned_by=$3, assigned_at=$4,
       review_status = CASE WHEN review_status IN ('submitted','ai_screening') THEN 'in_review' ELSE review_status END,
       updated_at=$4 WHERE id=$1`,
    [submissionId, assigneeId, assignedBy, now],
  );
  return getSubmission(submissionId);
}

/** Attach Sentinel's machine assessment to a submission (server-to-server observer path). Setting an
 *  assessment moves a fresh submission into 'ai_screening' unless a human already picked it up. */
export async function setSentinelAssessment(submissionId: string, assessment: unknown): Promise<Submission | null> {
  await init();
  const now = Date.now();
  await db().query(
    `UPDATE reports SET sentinel_assessment=$2::jsonb,
       review_status = CASE WHEN review_status = 'submitted' THEN 'ai_screening' ELSE review_status END,
       updated_at=$3 WHERE id=$1`,
    [submissionId, JSON.stringify(assessment ?? null), now],
  );
  return getSubmission(submissionId);
}

/** Human (or guardrailed-auto) review of a submission. Sets the terminal status + verdict + notes and,
 *  on ACCEPT, pays the test's weight (+ on-time bonus if `onTime`) ONCE via the ledger ref
 *  `test:{submissionId}`. Reward-ineligible testers (staff) never get a ledger entry. An explicit
 *  `awardPyrx` overrides the computed amount (staff discretion). Returns the updated submission +
 *  whether an award was written. Reversible: a later 'rejected' review does NOT claw back, but the
 *  ledger ref guarantees a re-accept can't double-pay. */
export async function reviewSubmission(
  submissionId: string,
  f: { verdict: ReviewVerdict; notes?: string; awardPyrx?: number; reviewer?: string; auto?: boolean },
): Promise<{ submission: Submission; awarded: number } | null> {
  await init();
  const sub = await getSubmission(submissionId);
  if (!sub) return null;
  const now = Date.now();
  const status: ReviewStatus = f.verdict === "accept" ? "accepted" : f.verdict === "reject" ? "rejected" : "needs_more";

  // Atomically CLAIM the transition: only a non-terminal submission may be decided, and only ONE caller
  // wins the claim. This closes two holes at once — a rejected/accepted row can't be flipped to a fresh
  // terminal state (no resurrecting a reject into a pay), and two concurrent accepts can't both proceed
  // (the loser matches 0 rows). A null return therefore means "not found OR already decided" (409-ish).
  const claim = await db().query(
    `UPDATE reports SET review_status=$2, reviewer_verdict=$3, reviewer_notes=$4, accepted=$5,
       accepted_at = CASE WHEN $2='accepted' THEN $6 ELSE accepted_at END,
       assigned_to = COALESCE(assigned_to, $7), updated_at=$6
     WHERE id=$1 AND review_status IN ('submitted','ai_screening','in_review','needs_more')`,
    [submissionId, status, f.verdict, (f.notes || "").slice(0, 8000), f.verdict === "accept", now, f.reviewer ?? null],
  );
  if ((claim.rowCount ?? 0) === 0) return null;

  let awarded = 0;
  if (f.verdict === "accept") {
    const ref = `test:${submissionId}`;
    const test = await getTest(sub.testId);
    const tester = await testerById(sub.testerId);
    if (test && tester?.reward_eligible) {
      const onTime = testIsOnTime(test, sub.createdAt);
      const computed = perTestReward({ weight_pyrx: test.weightPyrx }, onTime);
      // Cap any manual override to a defensible ceiling (a single reviewer can't mint unbounded PYRX).
      const amount = boundedAward(f.awardPyrx, computed, test.weightPyrx);
      if (amount > 0) {
        // Idempotent write: addLedger returns TRUE only if this call actually created the ledger row, so
        // a replayed accept (or the observer racing a human) never double-pays or double-notifies.
        const paid = await addLedger(sub.testerId, "test", amount, `${test.title}`, ref);
        if (paid) {
          await addNotification(sub.testerId, "test", "Your test was accepted 🎉", `"${test.title}" earned ${amount.toLocaleString("en-US")} PYRX.`, "/app");
          awarded = amount;
          await db().query("UPDATE reports SET awarded_pyrx=$2, updated_at=$3 WHERE id=$1", [submissionId, awarded, now]);
        }
      }
    }
  }
  const updated = await getSubmission(submissionId);
  return { submission: updated!, awarded };
}

// ---- submission comments (review thread) ----------------------------------------------------------
export async function addReportComment(reportId: string, author: { id: string; name: string; user: string; admin: boolean }, body: string): Promise<any> {
  await init();
  const r = await db().query(
    "INSERT INTO report_comments (id,report_id,author_id,author_name,author_user,author_admin,body,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,body,created_at,author_name,author_user,author_admin",
    [id("rc"), reportId, author.id, author.name, author.user, author.admin, body.slice(0, 4000), Date.now()],
  );
  return r.rows[0];
}
export async function listReportComments(reportId: string): Promise<any[]> {
  await init();
  const r = await db().query(
    "SELECT id, body, created_at, author_name AS display_name, author_user AS handle, author_admin AS is_staff FROM report_comments WHERE report_id=$1 ORDER BY created_at ASC",
    [reportId],
  );
  return r.rows;
}

// ---- tester-facing stats + unlock computation -----------------------------------------------------

/** Per-tester test stats for the dashboard + consistency engine.
 *  - acceptedThisWeek: accepted test submissions in the current ISO week.
 *  - acceptedIssueReportsThisWeek: accepted (bounty-paid) bugs in the current ISO week.
 *  - rollingAcceptRate: accepted / decided over the tester's most recent submissions (0..1; 1 if none
 *    decided yet, so a brand-new tester isn't penalized before their first review).
 *  - weeklyStreak: consecutive ISO weeks (ending this week) meeting the consistency cadence+accuracy bar. */
export async function testerTestStats(testerId: string, nowMs = Date.now()): Promise<TesterTestStats> {
  await init();
  const weekStart = isoWeekStart(nowMs);

  const acceptedThisWeek = Number((await db().query(
    "SELECT COUNT(*)::int AS n FROM reports WHERE tester_id=$1 AND review_status='accepted' AND accepted_at >= $2",
    [testerId, weekStart],
  )).rows[0].n);

  const acceptedIssueReportsThisWeek = Number((await db().query(
    "SELECT COUNT(*)::int AS n FROM bugs WHERE tester_id=$1 AND bounty_pyrx > 0 AND updated_at >= $2",
    [testerId, weekStart],
  )).rows[0].n);

  // Rolling accept-rate over the last 20 DECIDED submissions.
  const decided = await db().query(
    "SELECT review_status FROM reports WHERE tester_id=$1 AND review_status IN ('accepted','rejected') ORDER BY updated_at DESC LIMIT 20",
    [testerId],
  );
  const total = decided.rowCount ?? 0;
  const acc = decided.rows.filter((x) => x.review_status === "accepted").length;
  const rollingAcceptRate = total === 0 ? 1 : acc / total;

  // Weekly streak: walk back week-by-week while each week met the cadence bar. We approximate accuracy
  // with the CURRENT rolling rate (cheap + stable); the cadence check is per-week from the ledger-free
  // acceptance timestamps. Bounded to sustainedWeeks+1 look-back so this stays O(1) queries-ish.
  let weeklyStreak = 0;
  for (let w = 0; w <= CONSISTENCY.sustainedWeeks; w++) {
    const from = weekStart - w * WEEK_MS;
    const to = from + WEEK_MS;
    const tCount = Number((await db().query(
      "SELECT COUNT(*)::int AS n FROM reports WHERE tester_id=$1 AND review_status='accepted' AND accepted_at >= $2 AND accepted_at < $3",
      [testerId, from, to],
    )).rows[0].n);
    const bCount = Number((await db().query(
      "SELECT COUNT(*)::int AS n FROM bugs WHERE tester_id=$1 AND bounty_pyrx > 0 AND updated_at >= $2 AND updated_at < $3",
      [testerId, from, to],
    )).rows[0].n);
    const cadence = tCount >= CONSISTENCY.minAcceptedTestsPerWeek || bCount >= CONSISTENCY.minAcceptedIssueReportsPerWeek;
    if (cadence && rollingAcceptRate >= CONSISTENCY.accuracyFloor) weeklyStreak++;
    else break;
  }

  return { acceptedThisWeek, acceptedIssueReportsThisWeek, rollingAcceptRate, weeklyStreak };
}

/** The catalog for a tester: every test with that tester's per-test status + a computed unlock flag.
 *  A test is `locked` until every prereq slug has an ACCEPTED submission by this tester. `status` is the
 *  tester's latest submission status for the test (or 'not_started'). */
export async function listTestsForTester(testerId: string): Promise<Array<ProductTest & {
  myStatus: "not_started" | ReviewStatus; mySubmissionId: string | null; locked: boolean; missingPrereqs: string[];
}>> {
  await init();
  const tests = await listTests();
  // Latest submission per test for this tester.
  const subs = await db().query(
    `SELECT DISTINCT ON (campaign_id) campaign_id, id, review_status
       FROM reports WHERE tester_id=$1 ORDER BY campaign_id, created_at DESC`,
    [testerId],
  );
  const latest = new Map<string, { id: string; status: ReviewStatus }>();
  for (const s of subs.rows) latest.set(s.campaign_id, { id: s.id, status: s.review_status });
  // Slugs this tester has an ACCEPTED submission for (prereq satisfaction).
  const acceptedSlugs = new Set<string>();
  const accepted = await db().query(
    `SELECT DISTINCT c.slug AS slug FROM reports rp JOIN campaigns c ON c.id = rp.campaign_id
       WHERE rp.tester_id=$1 AND rp.review_status='accepted' AND c.slug IS NOT NULL`,
    [testerId],
  );
  for (const a of accepted.rows) acceptedSlugs.add(a.slug);

  return tests.map((t) => {
    const mine = latest.get(t.id);
    const missingPrereqs = (t.prereqSlugs || []).filter((s) => !acceptedSlugs.has(s));
    return {
      ...t,
      myStatus: mine ? mine.status : ("not_started" as const),
      mySubmissionId: mine ? mine.id : null,
      locked: missingPrereqs.length > 0,
      missingPrereqs,
    };
  });
}

/** Whether a tester may submit for a test right now: the test exists + is open, and every prereq slug
 *  has an ACCEPTED submission by this tester. Returns the test + the unmet prereqs (empty ⇒ allowed). */
export async function canTesterSubmit(testerId: string, testId: string): Promise<{ ok: boolean; test: ProductTest | null; missingPrereqs: string[]; reason?: string }> {
  await init();
  const test = await getTest(testId);
  if (!test) return { ok: false, test: null, missingPrereqs: [], reason: "not_found" };
  if (test.status !== "open") return { ok: false, test, missingPrereqs: [], reason: "closed" };
  if (!test.prereqSlugs.length) return { ok: true, test, missingPrereqs: [] };
  const accepted = await db().query(
    `SELECT DISTINCT c.slug AS slug FROM reports rp JOIN campaigns c ON c.id = rp.campaign_id
       WHERE rp.tester_id=$1 AND rp.review_status='accepted' AND c.slug = ANY($2::text[])`,
    [testerId, test.prereqSlugs],
  );
  const have = new Set(accepted.rows.map((x) => x.slug));
  const missingPrereqs = test.prereqSlugs.filter((s) => !have.has(s));
  return { ok: missingPrereqs.length === 0, test, missingPrereqs, reason: missingPrereqs.length ? "prereq" : undefined };
}

/** How many auto-awards this tester has already received THIS ISO week (for the weekly auto-award cap
 *  guardrail — counts test-reason ledger entries written by the auto path in the current week). */
export async function testerAutoAwardsThisWeek(testerId: string, nowMs = Date.now()): Promise<number> {
  await init();
  const weekStart = isoWeekStart(nowMs);
  const r = await db().query(
    "SELECT COUNT(*)::int AS n FROM earnings_ledger WHERE tester_id=$1 AND reason='test' AND ref LIKE 'test:%' AND created_at >= $2",
    [testerId, weekStart],
  );
  return Number(r.rows[0].n);
}

/** Total accepted submissions ever by this tester (used by the "new tester → always human" guardrail:
 *  the first N submissions must be reviewed by a person, never auto-awarded). */
export async function testerDecidedSubmissionCount(testerId: string): Promise<number> {
  await init();
  const r = await db().query(
    "SELECT COUNT(*)::int AS n FROM reports WHERE tester_id=$1 AND review_status IN ('accepted','rejected')",
    [testerId],
  );
  return Number(r.rows[0].n);
}

/** Award the sustained-participation consistency bonus ONCE per ISO week (idempotent by ledger ref
 *  `consistency:{isoWeek}`). No-op for reward-ineligible testers or when the streak/accuracy bar isn't
 *  met. Returns the PYRX paid (0 if none). Callers gate this behind the observer/consistency path. */
export async function awardConsistencyForWeek(testerId: string, nowMs = Date.now()): Promise<number> {
  await init();
  const tester = await testerById(testerId);
  if (!tester?.reward_eligible) return 0;
  const stats = await testerTestStats(testerId, nowMs);
  const amount = consistencyBonus(stats);
  if (amount <= 0) return 0;
  const ref = `consistency:${isoWeekLabel(nowMs)}`;
  // Atomic once-per-week: the unique-ref index makes a concurrent sweep + observer call collapse to one
  // payment. Notify only when THIS call wrote the row (paid), never on the idempotent no-op.
  const paid = await addLedger(testerId, "consistency", amount, `Consistency bonus — ${isoWeekLabel(nowMs)}`, ref);
  if (!paid) return 0;
  await addNotification(testerId, "consistency", "Consistency bonus 🔥", `You earned a ${amount.toLocaleString("en-US")} PYRX consistency bonus.`, "/app");
  return amount;
}

/** Every reward-eligible, active tester (the default sweep set for the weekly consistency runner). */
export async function eligibleActiveTesterIds(): Promise<string[]> {
  await init();
  const r = await db().query("SELECT id FROM testers WHERE reward_eligible = TRUE AND status = 'active'");
  return r.rows.map((x) => x.id as string);
}

// ---- anti-fraud: proof content-hash de-duplication ------------------------------------------------
// Each submission attachment carries a client-computed SHA-256 of the file bytes. Reusing the same
// photo/video across submissions is a farming signal even when the CDN url differs (every upload gets a
// unique key). We index the hashes stored in reports.attachments and flag any hash that appears on more
// than one submission (optionally excluding the submission being examined). Advisory only — surfaced to
// Sentinel + reviewers in the /pending context; never auto-rejects on its own.

/** Content hashes on `submissionId` that ALSO appear on at least one OTHER submission, each with the
 *  count of distinct other submissions using it + a small sample of those submission ids. Empty ⇒ all
 *  of this submission's proof is unique. Reads the JSONB attachment arrays via a lateral unnest. */
export async function duplicateProofHashes(submissionId: string): Promise<Array<{ hash: string; otherCount: number; otherSubmissions: string[] }>> {
  await init();
  const r = await db().query(
    `WITH mine AS (
       SELECT DISTINCT lower(a->>'contentHash') AS h
       FROM reports rp, jsonb_array_elements(rp.attachments) a
       WHERE rp.id = $1 AND a ? 'contentHash' AND a->>'contentHash' ~ '^[0-9a-f]{64}$'
     ),
     others AS (
       SELECT lower(a->>'contentHash') AS h, rp.id AS sid
       FROM reports rp, jsonb_array_elements(rp.attachments) a
       WHERE rp.id <> $1 AND a ? 'contentHash' AND a->>'contentHash' ~ '^[0-9a-f]{64}$'
     )
     SELECT m.h AS hash, COUNT(DISTINCT o.sid)::int AS other_count,
            (array_agg(DISTINCT o.sid))[1:5] AS other_submissions
     FROM mine m JOIN others o ON o.h = m.h
     GROUP BY m.h`,
    [submissionId],
  );
  return r.rows.map((x) => ({ hash: x.hash as string, otherCount: Number(x.other_count), otherSubmissions: (x.other_submissions || []) as string[] }));
}

// ---- observer (Sentinel) context ------------------------------------------------------------------
// The observer POLLS for work: submissions in 'submitted' that have no assessment yet. Each is enriched
// with everything Sentinel needs for its chain cross-checks — the test's steps, the tester's results +
// logs + attachments (with dup-proof flags), the tester's payout identity, and their nodes' current
// height + last heartbeat — so the observer never has to call back for context.

export interface PendingNode { nodePk: string; height: number | null; lastHeartbeat: number; app: string | null; appVersion: string | null; online: boolean }
export interface PendingSubmissionContext {
  submissionId: string;
  testSlug: string | null;
  testTitle: string;
  track: string;
  steps: any[];
  results: any[];
  logs: string | null;
  attachments: any[];
  tester: { id: string; handle: string; displayName: string; payoutWallet: string | null; rewardEligible: boolean; decidedCount: number; autoAwardsThisWeek: number };
  nodes: PendingNode[];
  dupProof: Array<{ hash: string; otherCount: number; otherSubmissions: string[] }>;
  createdAt: number;
}

/** The observer work queue: submissions in 'submitted' WITHOUT an assessment yet, each enriched with
 *  the full context Sentinel needs (steps, results, logs, attachments + dup-proof flags, tester payout
 *  identity + guardrail counters, and the tester's nodes with height/heartbeat). Newest-first. */
export async function pendingSubmissionContexts(limit = 25): Promise<PendingSubmissionContext[]> {
  await init();
  const lim = Math.min(100, Math.max(1, Math.floor(limit)));
  const rows = await db().query(
    `SELECT rp.id, rp.campaign_id, rp.tester_id, rp.results, rp.attachments, rp.logs, rp.created_at,
            c.slug AS test_slug, c.title AS test_title, c.track AS test_track, c.steps AS test_steps,
            t.handle AS tester_handle, t.display_name AS tester_name, t.payout_wallet, t.reward_eligible
       FROM reports rp
       JOIN campaigns c ON c.id = rp.campaign_id
       JOIN testers t ON t.id = rp.tester_id
      WHERE rp.review_status = 'submitted' AND rp.sentinel_assessment IS NULL
      ORDER BY rp.created_at ASC
      LIMIT $1`,
    [lim],
  );
  const now = Date.now();
  const out: PendingSubmissionContext[] = [];
  for (const r of rows.rows) {
    const nodesR = await db().query(
      "SELECT node_pk, height, peers, app, app_version, last_heartbeat FROM nodes WHERE tester_id=$1 ORDER BY last_heartbeat DESC LIMIT 20",
      [r.tester_id],
    );
    const nodes: PendingNode[] = nodesR.rows.map((n) => ({
      nodePk: n.node_pk as string,
      height: n.height == null ? null : Number(n.height),
      lastHeartbeat: Number(n.last_heartbeat),
      app: (n.app ?? null) as string | null,
      appVersion: (n.app_version ?? null) as string | null,
      online: now - Number(n.last_heartbeat) < ONLINE_MS,
    }));
    const [dupProof, decidedCount, autoAwardsThisWeek] = await Promise.all([
      duplicateProofHashes(r.id),
      testerDecidedSubmissionCount(r.tester_id),
      testerAutoAwardsThisWeek(r.tester_id, now),
    ]);
    out.push({
      submissionId: r.id,
      testSlug: (r.test_slug ?? null) as string | null,
      testTitle: (r.test_title ?? "") as string,
      track: (r.test_track ?? "") as string,
      steps: (r.test_steps ?? []) as any[],
      results: (r.results ?? []) as any[],
      logs: (r.logs ?? null) as string | null,
      attachments: (r.attachments ?? []) as any[],
      tester: {
        id: r.tester_id as string,
        handle: (r.tester_handle ?? "") as string,
        displayName: (r.tester_name ?? "") as string,
        payoutWallet: (r.payout_wallet ?? null) as string | null,
        rewardEligible: !!r.reward_eligible,
        decidedCount,
        autoAwardsThisWeek,
      },
      nodes,
      dupProof,
      createdAt: Number(r.created_at ?? 0),
    });
  }
  return out;
}
