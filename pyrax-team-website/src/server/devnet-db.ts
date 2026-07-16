// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Team-site access to the shared `devnet_tester` database (the Devnet Tester Portal owns the schema;
// this only reads/writes the tables the team's Devnet Management surface needs). Connects from
// DATABASE_URL_DEVNET. The portal initializes the schema on boot — we don't recreate it here.
import pg from "pg";
import crypto from "node:crypto";

// Prefer an explicit DATABASE_URL_DEVNET; otherwise derive it from the team DB URL by swapping the
// database name (team_pyrax → devnet_tester) — both live on the same DO Managed PG cluster.
const URL_RAW = process.env.DATABASE_URL_DEVNET
  || (process.env.DATABASE_URL || process.env.DATABASE_URL_TEAM_PYRAX || "").replace(/\/team_pyrax(\?|$)/, "/devnet_tester$1");
const connectionString = URL_RAW.replace(/[?&]sslmode=[^&]*/, "");
let pool: pg.Pool | null = null;
function db(): pg.Pool {
  if (!pool) {
    if (!connectionString) throw new Error("DATABASE_URL_DEVNET is not configured.");
    pool = new pg.Pool({ connectionString, ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }, max: 4, idleTimeoutMillis: 30_000 });
  }
  return pool;
}
const id = (p: string) => `${p}_${crypto.randomBytes(8).toString("base64url")}`;

export const devnetConfigured = () => !!connectionString;

// Mirror of the portal's devnet-status defaults (used when no admin settings row exists yet).
const DEFAULT_SETTINGS = {
  devnetName: "PYRAX Forge Network", version: "v0.1.0", chainId: 710823, rpc: "https://pyrax-forge.rpc.pyraxchain.com",
  whatToTest: "Spin up a Forge node, keep it online, and report anything that breaks.", telemetryUrl: "",
  downloadsOpen: true,
  downloadsClosedMessage: "Downloads are temporarily closed by the admin team. You'll be notified the moment they reopen.",
  downloads: [
    { name: "Inferno", platform: "Windows", url: "https://updates.pyraxchain.com/inferno/latest/win", note: "Desktop node app" },
    { name: "Inferno", platform: "macOS", url: "https://updates.pyraxchain.com/inferno/latest/mac", note: "Desktop node app" },
    { name: "Inferno", platform: "Linux", url: "https://updates.pyraxchain.com/inferno/latest/linux", note: "Desktop node app" },
    { name: "PYRAX CLI", platform: "All platforms", url: "https://updates.pyraxchain.com/cli/latest", note: "Command-line node tool" },
  ],
  legalRequired: true,
};

/** Whitelist a tester: create an invite carrying their Telegram @handle (their future chat name). */
export async function createDevnetInvite(email: string, telegramHandle: string, invitedBy: string): Promise<{ ok: true; token: string } | { ok: false; reason: "exists" }> {
  const e = email.trim().toLowerCase();
  const existing = await db().query("SELECT 1 FROM testers WHERE lower(email)=lower($1)", [e]);
  if ((existing.rowCount ?? 0) > 0) return { ok: false, reason: "exists" };
  const pending = await db().query("SELECT 1 FROM invites WHERE lower(email)=lower($1) AND accepted_at IS NULL AND expires_at > $2", [e, Date.now()]);
  if ((pending.rowCount ?? 0) > 0) return { ok: false, reason: "exists" };
  const token = crypto.randomBytes(24).toString("base64url");
  const now = Date.now();
  await db().query("INSERT INTO invites (token,email,telegram_handle,created_at,expires_at,invited_by) VALUES ($1,$2,$3,$4,$5,$6)", [token, e, telegramHandle.replace(/^@/, ""), now, now + 14 * 864e5, invitedBy]);
  return { ok: true, token };
}
export async function listDevnetInvitesAndTesters(): Promise<any[]> {
  const r = await db().query(
    `SELECT t.email, t.handle, t.display_name, t.status, t.reward_eligible, t.founding_rank, t.joined_at,
            (SELECT COUNT(*) FROM nodes n WHERE n.tester_id=t.id) AS nodes,
            (SELECT COALESCE(SUM(l.pyrx),0) FROM earnings_ledger l WHERE l.tester_id=t.id) AS pyrx
     FROM testers t WHERE t.is_staff=FALSE ORDER BY t.created_at DESC LIMIT 500`);
  const pending = await db().query("SELECT email, telegram_handle, created_at FROM invites WHERE accepted_at IS NULL AND expires_at > $1 ORDER BY created_at DESC LIMIT 200", [Date.now()]);
  return [
    ...r.rows.map((x) => ({ ...x, kind: "tester", nodes: Number(x.nodes), pyrx: Number(x.pyrx) })),
    ...pending.rows.filter((p) => !r.rows.find((t) => t.email === p.email)).map((p) => ({ email: p.email, handle: p.telegram_handle, status: "invited", kind: "pending" })),
  ];
}
/** Resend the pending invite ("welcome") email for `email`, refreshing its 14-day expiry. Returns the
 *  invite token to email, or null if there is no pending invite (e.g. the tester is already active). */
export async function resendDevnetInvite(email: string): Promise<string | null> {
  const e = email.trim().toLowerCase();
  const r = await db().query("SELECT token FROM invites WHERE lower(email)=lower($1) AND accepted_at IS NULL ORDER BY created_at DESC LIMIT 1", [e]);
  if (!r.rows[0]) return null;
  const token = r.rows[0].token as string;
  await db().query("UPDATE invites SET expires_at=$2 WHERE token=$1", [token, Date.now() + 14 * 864e5]);
  return token;
}

/** Kick/ban (status='suspended') or restore (status='active') a tester by email. Suspending also wipes
 *  their live sessions so they are kicked off the devnet site immediately. Returns rows affected. */
export async function setDevnetTesterStatus(email: string, status: "active" | "suspended"): Promise<number> {
  const e = email.trim().toLowerCase();
  const r = await db().query("UPDATE testers SET status=$2 WHERE lower(email)=lower($1) AND is_staff=FALSE RETURNING id", [e, status]);
  if (status === "suspended" && r.rows[0]) {
    await db().query("DELETE FROM sessions WHERE tester_id=$1", [r.rows[0].id]).catch(() => {});
  }
  return r.rowCount ?? 0;
}

/** Aggregate the anonymous app-telemetry table into the team Statistics dashboard. Read-only; every
 *  row is anonymous (a random install id + server-derived country) — no tester/node identity. */
export async function telemetryStats(windowMs = 7 * 864e5): Promise<any> {
  const since = Date.now() - windowMs;
  const q = (sql: string) => db().query(sql, [since]);
  const [active, byApp, byVersion, byOs, byCountry, daily, fleet, features] = await Promise.all([
    q("SELECT COUNT(DISTINCT install_id)::int AS installs, COUNT(*)::int AS snapshots FROM telemetry WHERE ts >= $1"),
    q("SELECT COALESCE(app,'unknown') AS app, COUNT(DISTINCT install_id)::int AS installs FROM telemetry WHERE ts >= $1 GROUP BY app ORDER BY installs DESC"),
    q("SELECT COALESCE(app_version,'?') AS version, COUNT(DISTINCT install_id)::int AS installs FROM telemetry WHERE ts >= $1 GROUP BY app_version ORDER BY installs DESC LIMIT 12"),
    q("SELECT COALESCE(os,'?') AS os, COUNT(DISTINCT install_id)::int AS installs FROM telemetry WHERE ts >= $1 GROUP BY os ORDER BY installs DESC"),
    q("SELECT COALESCE(country,'?') AS country, COUNT(DISTINCT install_id)::int AS installs FROM telemetry WHERE ts >= $1 GROUP BY country ORDER BY installs DESC LIMIT 20"),
    q("SELECT (ts/86400000)*86400000 AS day, COUNT(DISTINCT install_id)::int AS installs FROM telemetry WHERE ts >= $1 GROUP BY day ORDER BY day"),
    q(`WITH latest AS (SELECT DISTINCT ON (install_id) install_id, data FROM telemetry WHERE ts >= $1 ORDER BY install_id, ts DESC)
       SELECT COALESCE(SUM((data->'node'->>'total')::int),0)::int AS nodes,
              COALESCE(SUM((data->'node'->>'running')::int),0)::int AS running,
              COALESCE(ROUND(AVG(NULLIF((data->'node'->>'peers')::int,0))),0)::int AS avg_peers
       FROM latest WHERE jsonb_typeof(data->'node') = 'object'`),
    q(`WITH latest AS (SELECT DISTINCT ON (install_id) install_id, data FROM telemetry WHERE ts >= $1 ORDER BY install_id, ts DESC)
       SELECT e.key AS name, SUM((e.value)::int)::int AS count
       FROM latest, jsonb_each_text(COALESCE(data->'usage'->'events','{}'::jsonb)) AS e
       WHERE e.value ~ '^[0-9]+$' GROUP BY e.key ORDER BY count DESC LIMIT 15`),
  ]);
  return {
    windowDays: Math.round(windowMs / 864e5),
    activeInstalls: active.rows[0]?.installs ?? 0,
    totalSnapshots: active.rows[0]?.snapshots ?? 0,
    byApp: byApp.rows,
    byVersion: byVersion.rows,
    byOs: byOs.rows,
    byCountry: byCountry.rows,
    daily: daily.rows.map((r: any) => ({ day: Number(r.day), installs: r.installs })),
    fleet: fleet.rows[0] ?? { nodes: 0, running: 0, avg_peers: 0 },
    topFeatures: features.rows,
  };
}

// The error_reports table is owned by the devnet portal (created on first ingest). The team portal
// reads the same shared DB, so ensure it exists here too — otherwise the page 500s before the first
// report ever lands. Idempotent + cached so it costs nothing after the first call.
let erEnsured = false;
async function ensureErrorReports(): Promise<void> {
  if (erEnsured) return;
  await db().query(
    `CREATE TABLE IF NOT EXISTS error_reports (
       id TEXT PRIMARY KEY, source TEXT, app TEXT, app_version TEXT, os TEXT, level TEXT,
       title TEXT NOT NULL, detail TEXT, count INT NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'new',
       first_ts BIGINT NOT NULL, last_ts BIGINT NOT NULL, sig TEXT
     )`,
  );
  erEnsured = true;
}

/** Paginated crash/error reports (from the apps + CLI) for the team Error Reports page. */
export async function listErrorReports(opts: { status?: string; level?: string; app?: string; limit?: number; offset?: number } = {}): Promise<{ rows: any[]; total: number }> {
  await ensureErrorReports();
  const where: string[] = [];
  const params: any[] = [];
  if (opts.status && ["new", "ack", "resolved"].includes(opts.status)) { params.push(opts.status); where.push(`status=$${params.length}`); }
  if (opts.level && ["error", "warn", "info"].includes(opts.level)) { params.push(opts.level); where.push(`level=$${params.length}`); }
  if (opts.app) { params.push(opts.app); where.push(`app=$${params.length}`); }
  const w = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const limit = Math.min(100, Math.max(1, opts.limit ?? 25));
  const offset = Math.max(0, opts.offset ?? 0);
  const total = await db().query(`SELECT COUNT(*)::int AS n FROM error_reports ${w}`, params);
  const rows = await db().query(
    `SELECT id,source,app,app_version,os,level,title,detail,count,status,first_ts,last_ts FROM error_reports ${w} ORDER BY last_ts DESC LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  return { rows: rows.rows, total: total.rows[0]?.n ?? 0 };
}

/** Set a report's triage status (new | ack | resolved). Returns rows affected. */
export async function setErrorReportStatus(reportId: string, status: "new" | "ack" | "resolved"): Promise<number> {
  await ensureErrorReports();
  const r = await db().query("UPDATE error_reports SET status=$2 WHERE id=$1", [reportId, status]);
  return r.rowCount ?? 0;
}

// --- Support tickets ----------------------------------------------------------------------------
// Tickets live in the shared devnet_tester DB (created by the devnet portal on first ingest). The
// team portal owns triage: reply, internal notes, assignment, lifecycle, watchers, escalate. Ensure
// the tables exist here too so the page works before the first app/CLI ticket lands.
export const TK_STATUS = ["open", "pending", "resolved", "closed"];
export const TK_PRIORITY = ["low", "normal", "high", "urgent"];
export const TK_CATEGORY = ["general", "node", "mining", "wallet", "account", "bug", "other"];
let tkEnsured = false;
async function ensureTickets(): Promise<void> {
  if (tkEnsured) return;
  await db().query("CREATE TABLE IF NOT EXISTS ticket_counter ( id INT PRIMARY KEY, n INT NOT NULL )");
  await db().query(`CREATE TABLE IF NOT EXISTS support_tickets (
    id TEXT PRIMARY KEY, code INT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'general', priority TEXT NOT NULL DEFAULT 'normal', status TEXT NOT NULL DEFAULT 'open',
    source TEXT NOT NULL DEFAULT 'web', reporter_email TEXT, reporter_name TEXT, reporter_id TEXT,
    assignee_id TEXT, assignee_name TEXT, app_version TEXT, os TEXT, snapshot JSONB,
    last_actor TEXT NOT NULL DEFAULT 'reporter', created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL )`);
  await db().query("CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_code ON support_tickets(code)");
  await db().query("CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status, updated_at DESC)");
  await db().query(`CREATE TABLE IF NOT EXISTS ticket_messages (
    id TEXT PRIMARY KEY, ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    author_id TEXT, author_name TEXT NOT NULL DEFAULT '', author_kind TEXT NOT NULL DEFAULT 'staff',
    body TEXT NOT NULL DEFAULT '', internal BOOLEAN NOT NULL DEFAULT FALSE, attachments JSONB, created_at BIGINT NOT NULL )`);
  await db().query("CREATE INDEX IF NOT EXISTS idx_ticket_messages ON ticket_messages(ticket_id, created_at)");
  await db().query(`CREATE TABLE IF NOT EXISTS ticket_events (
    id TEXT PRIMARY KEY, ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    actor_id TEXT, actor_name TEXT, kind TEXT NOT NULL, detail JSONB, created_at BIGINT NOT NULL )`);
  await db().query("CREATE INDEX IF NOT EXISTS idx_ticket_events ON ticket_events(ticket_id, created_at)");
  await db().query(`CREATE TABLE IF NOT EXISTS ticket_watchers (
    ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    member_id TEXT NOT NULL, member_name TEXT, created_at BIGINT NOT NULL, PRIMARY KEY (ticket_id, member_id) )`);
  tkEnsured = true;
}

/** Paginated ticket queue with filters + per-status counts (open/pending float to the top). */
export async function listTickets(opts: { status?: string; priority?: string; category?: string; assignee?: string; source?: string; q?: string; limit?: number; offset?: number } = {}): Promise<{ rows: any[]; total: number; counts: Record<string, number> }> {
  await ensureTickets();
  const where: string[] = [];
  const params: any[] = [];
  if (opts.status && TK_STATUS.includes(opts.status)) { params.push(opts.status); where.push(`status=$${params.length}`); }
  if (opts.priority && TK_PRIORITY.includes(opts.priority)) { params.push(opts.priority); where.push(`priority=$${params.length}`); }
  if (opts.category && TK_CATEGORY.includes(opts.category)) { params.push(opts.category); where.push(`category=$${params.length}`); }
  if (opts.assignee) { params.push(opts.assignee); where.push(`assignee_id=$${params.length}`); }
  if (opts.source) { params.push(opts.source); where.push(`source=$${params.length}`); }
  if (opts.q && opts.q.trim()) { params.push(`%${opts.q.trim().toLowerCase()}%`); where.push(`(LOWER(subject) LIKE $${params.length} OR LOWER(body) LIKE $${params.length} OR LOWER(COALESCE(reporter_email,'')) LIKE $${params.length} OR CAST(code AS TEXT) LIKE $${params.length})`); }
  const w = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  const offset = Math.max(0, opts.offset ?? 0);
  const total = await db().query(`SELECT COUNT(*)::int AS n FROM support_tickets ${w}`, params);
  const rows = await db().query(
    `SELECT t.*, (SELECT COUNT(*)::int FROM ticket_messages m WHERE m.ticket_id=t.id AND m.internal=FALSE) AS msg_count
     FROM support_tickets t ${w} ORDER BY (t.status IN ('open','pending')) DESC, t.updated_at DESC LIMIT ${limit} OFFSET ${offset}`, params);
  const cs = await db().query("SELECT status, COUNT(*)::int AS n FROM support_tickets GROUP BY status");
  const counts: Record<string, number> = {};
  for (const r of cs.rows) counts[r.status] = r.n;
  return { rows: rows.rows, total: total.rows[0]?.n ?? 0, counts };
}

export async function getTicket(ticketId: string): Promise<any | null> {
  await ensureTickets();
  const r = await db().query("SELECT * FROM support_tickets WHERE id=$1", [ticketId]);
  return r.rows[0] || null;
}

/** Full ticket thread: public + internal messages, the lifecycle event timeline, and watchers. */
export async function getTicketThread(ticketId: string): Promise<{ messages: any[]; events: any[]; watchers: any[] }> {
  await ensureTickets();
  const [m, e, w] = await Promise.all([
    db().query("SELECT * FROM ticket_messages WHERE ticket_id=$1 ORDER BY created_at ASC", [ticketId]),
    db().query("SELECT * FROM ticket_events WHERE ticket_id=$1 ORDER BY created_at ASC", [ticketId]),
    db().query("SELECT * FROM ticket_watchers WHERE ticket_id=$1 ORDER BY created_at ASC", [ticketId]),
  ]);
  return { messages: m.rows, events: e.rows, watchers: w.rows };
}

/** Append a message. A public staff/sentinel reply bumps activity + last_actor; internal notes don't. */
export async function addTicketMessage(ticketId: string, msg: { authorId?: string; authorName: string; authorKind?: string; body: string; internal?: boolean; attachments?: any[] }): Promise<any> {
  await ensureTickets();
  const now = Date.now();
  const mid = id("tm");
  const atts = Array.isArray(msg.attachments) && msg.attachments.length ? JSON.stringify(msg.attachments.slice(0, 12)) : null;
  await db().query(
    `INSERT INTO ticket_messages (id,ticket_id,author_id,author_name,author_kind,body,internal,attachments,created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [mid, ticketId, msg.authorId || null, msg.authorName, msg.authorKind || "staff", (msg.body || "").slice(0, 8000), !!msg.internal, atts, now]);
  if (!msg.internal) {
    const lastActor = msg.authorKind === "reporter" ? "reporter" : msg.authorKind === "sentinel" ? "sentinel" : "staff";
    await db().query("UPDATE support_tickets SET updated_at=$2, last_actor=$3 WHERE id=$1", [ticketId, now, lastActor]);
  }
  return { id: mid, created_at: now };
}

export async function addTicketEvent(ticketId: string, ev: { actorId?: string; actorName?: string; kind: string; detail?: any }): Promise<void> {
  await ensureTickets();
  await db().query("INSERT INTO ticket_events (id,ticket_id,actor_id,actor_name,kind,detail,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)",
    [id("te"), ticketId, ev.actorId || null, ev.actorName || null, ev.kind, ev.detail ? JSON.stringify(ev.detail) : null, Date.now()]);
}

/** Change status/priority/category/assignee; each real change records a lifecycle event. */
export async function updateTicketFields(ticketId: string, fields: { status?: string; priority?: string; category?: string; assigneeId?: string | null; assigneeName?: string | null }, actor: { id?: string; name?: string }): Promise<any | null> {
  await ensureTickets();
  const cur = await getTicket(ticketId);
  if (!cur) return null;
  const sets: string[] = [];
  const params: any[] = [];
  const events: Array<{ kind: string; detail: any }> = [];
  if (fields.status && TK_STATUS.includes(fields.status) && fields.status !== cur.status) { params.push(fields.status); sets.push(`status=$${params.length}`); events.push({ kind: (cur.status === "closed" || cur.status === "resolved") ? "reopen" : "status", detail: { from: cur.status, to: fields.status } }); }
  if (fields.priority && TK_PRIORITY.includes(fields.priority) && fields.priority !== cur.priority) { params.push(fields.priority); sets.push(`priority=$${params.length}`); events.push({ kind: "priority", detail: { from: cur.priority, to: fields.priority } }); }
  if (fields.category && TK_CATEGORY.includes(fields.category) && fields.category !== cur.category) { params.push(fields.category); sets.push(`category=$${params.length}`); events.push({ kind: "category", detail: { from: cur.category, to: fields.category } }); }
  if (fields.assigneeId !== undefined && (fields.assigneeId || null) !== (cur.assignee_id || null)) {
    params.push(fields.assigneeId || null); sets.push(`assignee_id=$${params.length}`);
    params.push(fields.assigneeName || null); sets.push(`assignee_name=$${params.length}`);
    events.push({ kind: "assign", detail: { to: fields.assigneeName || null } });
  }
  if (!sets.length) return cur;
  const now = Date.now();
  params.push(now); sets.push(`updated_at=$${params.length}`);
  params.push(ticketId);
  await db().query(`UPDATE support_tickets SET ${sets.join(", ")} WHERE id=$${params.length}`, params);
  for (const e of events) await addTicketEvent(ticketId, { actorId: actor.id, actorName: actor.name, kind: e.kind, detail: e.detail });
  return getTicket(ticketId);
}

export async function addTicketWatcher(ticketId: string, memberId: string, memberName?: string): Promise<void> {
  await ensureTickets();
  await db().query("INSERT INTO ticket_watchers (ticket_id,member_id,member_name,created_at) VALUES ($1,$2,$3,$4) ON CONFLICT (ticket_id,member_id) DO NOTHING",
    [ticketId, memberId, memberName || null, Date.now()]);
}
export async function removeTicketWatcher(ticketId: string, memberId: string): Promise<void> {
  await ensureTickets();
  await db().query("DELETE FROM ticket_watchers WHERE ticket_id=$1 AND member_id=$2", [ticketId, memberId]);
}

/** Staff-opened ticket (manual intake from the team portal). */
export async function openTicket(t: { subject: string; body?: string; category?: string; priority?: string; source?: string; reporterEmail?: string; reporterName?: string; assigneeId?: string; assigneeName?: string; actorId?: string; actorName?: string }): Promise<{ id: string; code: number }> {
  await ensureTickets();
  const now = Date.now();
  const c = await db().query("INSERT INTO ticket_counter (id, n) VALUES (1, 1001) ON CONFLICT (id) DO UPDATE SET n = ticket_counter.n + 1 RETURNING n");
  const code = c.rows[0].n as number;
  const tid = id("tkt");
  const body = (t.body || "").slice(0, 8000);
  await db().query(
    `INSERT INTO support_tickets (id,code,subject,body,category,priority,status,source,reporter_email,reporter_name,assignee_id,assignee_name,last_actor,created_at,updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,'open',$7,$8,$9,$10,$11,'staff',$12,$12)`,
    [tid, code, t.subject.slice(0, 200), body, t.category || "general", t.priority || "normal", t.source || "manual",
     t.reporterEmail || null, t.reporterName || null, t.assigneeId || null, t.assigneeName || null, now]);
  if (body) await db().query(
    "INSERT INTO ticket_messages (id,ticket_id,author_id,author_name,author_kind,body,internal,created_at) VALUES ($1,$2,$3,$4,'staff',$5,FALSE,$6)",
    [id("tm"), tid, t.actorId || null, t.actorName || "Staff", body, now]);
  await addTicketEvent(tid, { actorId: t.actorId, actorName: t.actorName, kind: "created", detail: { source: t.source || "manual" } });
  return { id: tid, code };
}

export async function ticketStats(): Promise<{ open: number; pending: number; resolved: number; closed: number; total: number; urgent: number }> {
  await ensureTickets();
  const r = await db().query("SELECT status, priority, COUNT(*)::int AS n FROM support_tickets GROUP BY status, priority");
  const out = { open: 0, pending: 0, resolved: 0, closed: 0, total: 0, urgent: 0 };
  for (const row of r.rows) {
    out.total += row.n;
    if (row.status in out) (out as any)[row.status] += row.n;
    if (row.priority === "urgent" && (row.status === "open" || row.status === "pending")) out.urgent += row.n;
  }
  return out;
}

export async function getDevnetSettings(): Promise<Record<string, any>> {
  const r = await db().query("SELECT data FROM app_settings WHERE id=1");
  return { ...DEFAULT_SETTINGS, ...(r.rows[0]?.data || {}) };
}
export async function setDevnetSettings(data: Record<string, any>): Promise<void> {
  await db().query("INSERT INTO app_settings (id,data,updated_at) VALUES (1,$1::jsonb,$2) ON CONFLICT (id) DO UPDATE SET data=$1::jsonb, updated_at=$2", [JSON.stringify(data), Date.now()]);
}

// ---- Issue Council (devs triage from the team site) ----
const BUG_STATUSES = ["new", "confirmed", "in_progress", "fixed", "verified", "closed", "duplicate", "wont_fix"];
const BUG_SEVS = ["low", "medium", "high", "critical"];
const BUG_BOUNTY: Record<string, number> = { critical: 48_000, high: 20_000, medium: 8_000, low: 2_400 };
const VALID = ["confirmed", "in_progress", "fixed", "verified"];

export async function listDevnetBugs(status?: string, sort?: string): Promise<any[]> {
  const where = status && BUG_STATUSES.includes(status) ? "WHERE b.status=$1" : "";
  const order = sort === "votes" ? "b.votes DESC, b.created_at DESC" : sort === "severity" ? "CASE b.severity WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END DESC, b.created_at DESC" : "b.created_at DESC";
  const r = await db().query(`SELECT b.id,b.title,b.severity,b.assigned_severity,b.component,b.status,b.votes,b.confirms,b.bounty_pyrx,b.created_at,b.attachments,t.display_name AS reporter_name,t.handle AS reporter_handle FROM bugs b JOIN testers t ON t.id=b.tester_id ${where} ORDER BY ${order} LIMIT 200`, where ? [status] : []);
  return r.rows;
}
export async function getDevnetBug(bugId: string): Promise<any | null> {
  const r = await db().query("SELECT b.*, t.display_name AS reporter_name, t.handle AS reporter_handle FROM bugs b JOIN testers t ON t.id=b.tester_id WHERE b.id=$1", [bugId]);
  if (!r.rows[0]) return null;
  const cm = await db().query("SELECT id,body,created_at,author_name AS display_name,author_user AS handle,author_admin AS is_staff FROM bug_comments WHERE bug_id=$1 ORDER BY created_at ASC", [bugId]);
  return { ...r.rows[0], comments: cm.rows };
}
export async function addDevnetBugComment(bugId: string, author: { id: string; name: string; user: string }, body: string): Promise<void> {
  const cid = id("c");
  await db().query("INSERT INTO bug_comments (id,bug_id,author_id,author_name,author_user,author_admin,body,created_at) VALUES ($1,$2,$3,$4,$5,TRUE,$6,$7)", [cid, bugId, author.id, author.name, author.user, body.slice(0, 4000), Date.now()]);
  // notify the reporter (in-app)
  const rep = await db().query("SELECT tester_id, title FROM bugs WHERE id=$1", [bugId]);
  if (rep.rows[0]) await addDevnetNotification(rep.rows[0].tester_id, "reply", "PYRAX team replied to your bug", `On "${rep.rows[0].title}".`, "/app");
}
export async function addDevnetNotification(testerId: string, kind: string, title: string, body: string, link: string): Promise<void> {
  await db().query("INSERT INTO notifications (id,tester_id,kind,title,body,link,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)", [id("n"), testerId, kind, title.slice(0, 160), body.slice(0, 400), link, Date.now()]);
}
/** Triage from the team site: status/criticality + auto-award the bounty once; notify the reporter. */
export async function triageDevnetBug(bugId: string, f: { status?: string; assignedSeverity?: string; bountyPyrx?: number }): Promise<{ ok: boolean; awarded?: { email: string; amount: number; title: string } }> {
  const cur = await db().query("SELECT tester_id, title, severity, assigned_severity FROM bugs WHERE id=$1", [bugId]);
  if (!cur.rows[0]) return { ok: false };
  const status = f.status && BUG_STATUSES.includes(f.status) ? f.status : undefined;
  const sev = f.assignedSeverity && BUG_SEVS.includes(f.assignedSeverity) ? f.assignedSeverity : undefined;
  const explicit = typeof f.bountyPyrx === "number" && f.bountyPyrx > 0 ? Math.round(f.bountyPyrx) : undefined;
  const effSev = (sev || cur.rows[0].assigned_severity || cur.rows[0].severity) as string;
  const paid = ((await db().query("SELECT 1 FROM earnings_ledger WHERE ref=$1", [`bug:${bugId}`])).rowCount ?? 0) > 0;
  let award = 0;
  if (!paid) { if (explicit) award = explicit; else if (status && VALID.includes(status)) award = BUG_BOUNTY[effSev] || 0; }
  await db().query("UPDATE bugs SET status=COALESCE($2,status), assigned_severity=COALESCE($3,assigned_severity), bounty_pyrx=COALESCE($4,bounty_pyrx), updated_at=$5 WHERE id=$1",
    [bugId, status ?? null, sev ?? null, award > 0 ? award : (explicit ?? null), Date.now()]);
  let awarded;
  if (award > 0) {
    const reporter = cur.rows[0].tester_id;
    const t = await db().query("SELECT email, reward_eligible FROM testers WHERE id=$1", [reporter]);
    if (t.rows[0]?.reward_eligible) {
      // Idempotent bounty: the shared earnings_ledger has a UNIQUE(ref) index, so a concurrent/replayed
      // triage collapses to ONE payment. Notify + echo only when this insert actually wrote the row.
      const ins = await db().query("INSERT INTO earnings_ledger (id,tester_id,reason,pyrx,note,ref,created_at) VALUES ($1,$2,'bug',$3,$4,$5,$6) ON CONFLICT (ref) WHERE ref IS NOT NULL DO NOTHING", [id("l"), reporter, award, cur.rows[0].title, `bug:${bugId}`, Date.now()]);
      if ((ins.rowCount ?? 0) > 0) {
        await addDevnetNotification(reporter, "bug", "Your bug was accepted 🎉", `"${cur.rows[0].title}" earned ${award.toLocaleString("en-US")} PYRX.`, "/app");
        awarded = { email: t.rows[0].email, amount: award, title: cur.rows[0].title };
      }
    }
  }
  return { ok: true, awarded };
}

// ---- Product-Test Reviews (staff review the tester-submitted test proofs from the team site) ----
//
// The devnet-portal owns the `campaigns` (= TESTS) / `reports` (= SUBMISSIONS) / `report_comments`
// tables and the review_status state machine (see pyrax-devnet-portal/docs/PRODUCT-TESTS-CONTRACT.md).
// This mirrors the Issue-Council flow: assign → review (accept/reject/needs_more) → comment, with an
// idempotent PYRX award on accept (ledger ref `test:{submissionId}`) and a tester notification — the
// exact same auto-award + notify shape as triageDevnetBug, just for the tests economy.
const REVIEW_STATUSES = ["submitted", "ai_screening", "in_review", "needs_more", "accepted", "rejected"] as const;
const REVIEW_VERDICTS = ["accept", "reject", "needs_more"] as const;
type TestVerdict = (typeof REVIEW_VERDICTS)[number];
// Fixed on-time bonus + guardrail mirror of the devnet-portal economics (rewards.ts). Kept in sync via
// the shared contract; the per-test weight itself lives on the campaign row (`weight_pyrx`).
const ON_TIME_TEST_BONUS_PYRX = 800;

/** PYRX for accepting ONE submission: the test's weight + the on-time bonus (submitted at/before the
 *  test's closes_at; unset ⇒ always on time). Mirrors devnet-portal rewards.perTestReward. */
function perTestReward(weightPyrx: number, onTime: boolean): number {
  const weight = Math.max(0, Math.round(Number(weightPyrx) || 0));
  return weight + (onTime ? ON_TIME_TEST_BONUS_PYRX : 0);
}

// Mirror of devnet-portal rewards.boundedAward — kept in sync via the contract. Bounds a manual staff
// `awardPyrx` override so a single rogue/compromised reviewer can't mint unbounded PYRX: an override may
// exceed the computed reward but never beyond MAX_OVERRIDE_FACTOR × weight, and never above the absolute
// MAX_MANUAL_AWARD_PYRX. Anything larger is a tokenomics decision, not a single review click.
const MAX_OVERRIDE_FACTOR = 4;
const MAX_MANUAL_AWARD_PYRX = 50_000;
function boundedAward(override: number | undefined, computed: number, weightPyrx: number): number {
  if (typeof override !== "number" || !Number.isFinite(override) || override < 0) return Math.max(0, Math.round(computed));
  const weight = Math.max(0, Math.round(Number(weightPyrx) || 0));
  const ceiling = Math.min(MAX_MANUAL_AWARD_PYRX, Math.max(Math.round(computed), weight * MAX_OVERRIDE_FACTOR));
  return Math.max(0, Math.min(Math.round(override), ceiling));
}

// Join reports → their test (campaign) + the submitting tester. Column aliases match the contract's
// Submission shape so the API/UI read the same field names the portal exposes.
const SUB_SELECT = `
  SELECT rp.id, rp.campaign_id, rp.tester_id, rp.results, rp.attachments, rp.notes, rp.logs,
         rp.review_status, rp.reviewer_verdict, rp.reviewer_notes, rp.sentinel_assessment,
         rp.assigned_to, rp.assigned_by, rp.assigned_at, rp.awarded_pyrx, rp.accepted_at,
         rp.created_at, rp.updated_at,
         c.slug AS test_slug, c.title AS test_title, c.track AS test_track,
         c.weight_pyrx AS test_weight, c.app_version AS test_app_version, c.closes_at AS test_closes_at,
         t.display_name AS tester_name, t.handle AS tester_handle, t.email AS tester_email,
         t.payout_wallet AS tester_wallet, t.reward_eligible AS tester_reward_eligible
    FROM reports rp
    JOIN campaigns c ON c.id = rp.campaign_id
    JOIN testers t ON t.id = rp.tester_id`;

function subRow(r: any) {
  return {
    id: r.id as string,
    testId: r.campaign_id as string,
    testSlug: (r.test_slug ?? null) as string | null,
    testTitle: (r.test_title ?? "") as string,
    track: (r.test_track ?? "") as string,
    weightPyrx: Number(r.test_weight ?? 0),
    appVersion: (r.test_app_version ?? "") as string,
    testerId: r.tester_id as string,
    testerName: (r.tester_name ?? "") as string,
    testerHandle: (r.tester_handle ?? "") as string,
    testerWallet: (r.tester_wallet ?? null) as string | null,
    testerRewardEligible: !!r.tester_reward_eligible,
    results: (r.results ?? []) as any[],
    attachments: (r.attachments ?? []) as any[],
    notes: (r.notes ?? "") as string,
    logs: (r.logs ?? null) as string | null,
    reviewStatus: (r.review_status ?? "submitted") as string,
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
export type TestSubmission = ReturnType<typeof subRow>;

/** Resolve reviewer team-user ids → display names (assignee/assigner are TEAM users, not testers, so
 *  they live in the team DB — passed in from the API layer to avoid a cross-pool import cycle). */
function attachReviewerNames<T extends { assignedTo: string | null; assignedBy: string | null }>(
  rows: T[],
  names: Map<string, string>,
): (T & { assignedToName: string | null; assignedByName: string | null })[] {
  return rows.map((s) => ({
    ...s,
    assignedToName: s.assignedTo ? names.get(s.assignedTo) ?? null : null,
    assignedByName: s.assignedBy ? names.get(s.assignedBy) ?? null : null,
  }));
}

/** The review queue. Filters mirror the contract (status/assignee/track/tester/limit). */
export async function listTestSubmissions(filter: { status?: string; assignee?: string; track?: string; tester?: string; limit?: number } = {}): Promise<TestSubmission[]> {
  const where: string[] = [];
  const vals: any[] = [];
  if (filter.status && (REVIEW_STATUSES as readonly string[]).includes(filter.status)) { vals.push(filter.status); where.push(`rp.review_status = $${vals.length}`); }
  if (filter.assignee) { vals.push(filter.assignee); where.push(`rp.assigned_to = $${vals.length}`); }
  if (filter.track === "cli" || filter.track === "inferno") { vals.push(filter.track); where.push(`c.track = $${vals.length}`); }
  if (filter.tester) { vals.push(filter.tester); where.push(`rp.tester_id = $${vals.length}`); }
  vals.push(Math.min(500, Math.max(1, Math.floor(Number.isFinite(filter.limit as number) ? (filter.limit as number) : 200))));
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const r = await db().query(`${SUB_SELECT} ${clause} ORDER BY rp.created_at DESC LIMIT $${vals.length}`, vals);
  return r.rows.map(subRow);
}

/** One submission by id (with its test + tester), or null. */
export async function getTestSubmission(submissionId: string): Promise<TestSubmission | null> {
  const r = await db().query(`${SUB_SELECT} WHERE rp.id=$1`, [submissionId]);
  return r.rows[0] ? subRow(r.rows[0]) : null;
}

/** The review thread for a submission (report_comments), oldest first. */
export async function listTestComments(reportId: string): Promise<any[]> {
  const r = await db().query(
    "SELECT id, body, created_at, author_name AS display_name, author_user AS handle, author_admin AS is_staff FROM report_comments WHERE report_id=$1 ORDER BY created_at ASC",
    [reportId],
  );
  return r.rows;
}

/** Assign a submission to a reviewer (a TEAM user id). Moves submitted/ai_screening → in_review. */
export async function assignTestSubmission(submissionId: string, assigneeId: string, assignedBy: string): Promise<TestSubmission | null> {
  const now = Date.now();
  const upd = await db().query(
    `UPDATE reports SET assigned_to=$2, assigned_by=$3, assigned_at=$4,
       review_status = CASE WHEN review_status IN ('submitted','ai_screening') THEN 'in_review' ELSE review_status END,
       updated_at=$4 WHERE id=$1 AND review_status NOT IN ('accepted','rejected')`,
    [submissionId, assigneeId, assignedBy, now],
  );
  if ((upd.rowCount ?? 0) === 0) return null; // not found OR already terminal (can't reassign a decided submission)
  return getTestSubmission(submissionId);
}

/** Post a staff comment on the review thread (author_admin=TRUE) + notify the tester (in-app). */
export async function addTestComment(reportId: string, author: { id: string; name: string; user: string }, body: string): Promise<any[]> {
  const cid = id("rc");
  await db().query(
    "INSERT INTO report_comments (id,report_id,author_id,author_name,author_user,author_admin,body,created_at) VALUES ($1,$2,$3,$4,$5,TRUE,$6,$7)",
    [cid, reportId, author.id, author.name, author.user, body.slice(0, 4000), Date.now()],
  );
  const rep = await db().query(
    "SELECT rp.tester_id, c.title FROM reports rp JOIN campaigns c ON c.id=rp.campaign_id WHERE rp.id=$1",
    [reportId],
  );
  if (rep.rows[0]) await addDevnetNotification(rep.rows[0].tester_id, "reply", "PYRAX team replied to your test submission", `On "${rep.rows[0].title}".`, "/app");
  return listTestComments(reportId);
}

/** Human review of a submission from the team site. Sets the terminal status + verdict + notes, and on
 *  ACCEPT pays the test's weight (or the staff `awardPyrx` override) ONCE via the idempotent ledger ref
 *  `test:{submissionId}` + notifies the tester — mirroring triageDevnetBug's bounty auto-award. Verdict
 *  maps: accept→accepted, reject→rejected, needs_more→needs_more. Reward-ineligible testers (staff)
 *  never get a ledger row; a re-accept can never double-pay (the ref guards it). */
export async function reviewTestSubmission(
  submissionId: string,
  f: { verdict: string; notes?: string; awardPyrx?: number },
  reviewer: { id: string; email: string },
): Promise<{ ok: true; submission?: TestSubmission; awarded?: { email: string; amount: number; title: string } } | { ok: false; reason: "verdict" | "not_found" | "self_review" | "already_decided" }> {
  const verdict = (REVIEW_VERDICTS as readonly string[]).includes(f.verdict) ? (f.verdict as TestVerdict) : null;
  if (!verdict) return { ok: false, reason: "verdict" };
  const cur = await getTestSubmission(submissionId);
  if (!cur) return { ok: false, reason: "not_found" };

  // Self-dealing guard: a reviewer must never ACCEPT a submission from their own reward-eligible tester
  // account. Team users and testers live in different id-spaces, so we compare the verified emails.
  const testerEmail = (await db().query("SELECT email FROM testers WHERE id=$1", [cur.testerId])).rows[0]?.email as string | undefined;
  if (verdict === "accept" && testerEmail && reviewer.email && testerEmail.toLowerCase() === reviewer.email.trim().toLowerCase()) {
    return { ok: false, reason: "self_review" };
  }

  const now = Date.now();
  const status = verdict === "accept" ? "accepted" : verdict === "reject" ? "rejected" : "needs_more";

  // Atomically CLAIM the transition from a NON-terminal state. This blocks resurrecting a rejected row
  // into a fresh 'accepted' (which would pay), overwriting a terminal decision, and two concurrent
  // reviews both proceeding (the loser matches 0 rows → 'already_decided').
  const claim = await db().query(
    `UPDATE reports SET review_status=$2, reviewer_verdict=$3, reviewer_notes=$4, accepted=$5,
       accepted_at = CASE WHEN $2='accepted' THEN $6 ELSE accepted_at END,
       assigned_to = COALESCE(assigned_to, $7), updated_at=$6
     WHERE id=$1 AND review_status IN ('submitted','ai_screening','in_review','needs_more')`,
    [submissionId, status, verdict, (f.notes || "").slice(0, 8000), verdict === "accept", now, reviewer.id],
  );
  if ((claim.rowCount ?? 0) === 0) return { ok: false, reason: "already_decided" };

  let awardedInfo: { email: string; amount: number; title: string } | undefined;
  if (verdict === "accept" && cur.testerRewardEligible) {
    const ref = `test:${submissionId}`;
    const onTime = isOnTime(cur.createdAt, await testCloseAt(cur.testId));
    const computed = perTestReward(cur.weightPyrx, onTime);
    const amount = boundedAward(f.awardPyrx, computed, cur.weightPyrx); // cap the manual override
    if (amount > 0) {
      // Idempotent award: the shared earnings_ledger has a UNIQUE(ref) index (owned by the devnet-portal
      // schema), so a concurrent team-accept + observer-accept collapse to ONE payment. Notify + echo only
      // when THIS insert actually wrote the row.
      const ins = await db().query(
        "INSERT INTO earnings_ledger (id,tester_id,reason,pyrx,note,ref,created_at) VALUES ($1,$2,'test',$3,$4,$5,$6) ON CONFLICT (ref) WHERE ref IS NOT NULL DO NOTHING",
        [id("l"), cur.testerId, amount, cur.testTitle, ref, now],
      );
      if ((ins.rowCount ?? 0) > 0) {
        await addDevnetNotification(cur.testerId, "test", "Your test was accepted 🎉", `"${cur.testTitle}" earned ${amount.toLocaleString("en-US")} PYRX.`, "/app");
        awardedInfo = { email: testerEmail ?? "", amount, title: cur.testTitle };
        await db().query("UPDATE reports SET awarded_pyrx=$2, updated_at=$3 WHERE id=$1", [submissionId, amount, now]);
      }
    }
  } else if (verdict === "needs_more") {
    await addDevnetNotification(cur.testerId, "test", "More info requested on your test", `Reviewer asked for more on "${cur.testTitle}". Address it and resubmit.`, "/app");
  } else if (verdict === "reject") {
    await addDevnetNotification(cur.testerId, "test", "Your test submission was reviewed", `"${cur.testTitle}" was not accepted this time.`, "/app");
  }

  const updated = await getTestSubmission(submissionId);
  return { ok: true, submission: updated ?? undefined, awarded: awardedInfo };
}

/** The test's on-time window boundary (ms) — unset ⇒ always on time. */
async function testCloseAt(testId: string): Promise<number | null> {
  const r = await db().query("SELECT closes_at FROM campaigns WHERE id=$1", [testId]);
  return r.rows[0]?.closes_at == null ? null : Number(r.rows[0].closes_at);
}
const isOnTime = (submittedAt: number, closesAt: number | null): boolean => closesAt == null || submittedAt <= closesAt;

/** Release-readiness data: every submission + every test, so the module can compute per-app-version
 *  coverage % and the test×track pass/fail heatmap without extra round-trips. */
export async function testReleaseReadiness(): Promise<{ tests: any[]; submissions: any[] }> {
  const tests = await db().query(
    "SELECT id, slug, title, track, app_version, order_idx, weight_pyrx FROM campaigns ORDER BY track ASC, order_idx ASC, created_at ASC",
  );
  const subs = await db().query(
    `SELECT rp.campaign_id, rp.tester_id, rp.review_status, rp.created_at,
            c.track AS test_track, c.app_version AS test_app_version
       FROM reports rp JOIN campaigns c ON c.id=rp.campaign_id`,
  );
  return {
    tests: tests.rows.map((t) => ({ id: t.id, slug: t.slug, title: t.title, track: t.track, appVersion: t.app_version || "", orderIdx: Number(t.order_idx ?? 0), weightPyrx: Number(t.weight_pyrx ?? 0) })),
    submissions: subs.rows.map((s) => ({ testId: s.campaign_id, testerId: s.tester_id, reviewStatus: s.review_status, track: s.test_track, appVersion: s.test_app_version || "", createdAt: Number(s.created_at ?? 0) })),
  };
}

/** Attach reviewer (team-user) display names to a set of submissions. The API layer supplies the
 *  id→name map (from the team `users` table) so this module stays on the devnet pool only. */
export function withReviewerNames<T extends { assignedTo: string | null; assignedBy: string | null }>(rows: T[], names: Map<string, string>) {
  return attachReviewerNames(rows, names);
}

// ---- Airdrop accounting (per-tester accrued PYRX; paid at the mainnet airdrop) ----
//
// Rewards accrue in earnings_ledger NOW and are paid as a mainnet airdrop LATER. This is the team's
// single source of truth for what each tester is owed: their lifetime accrued PYRX, a breakdown by
// reason, and their payout wallet. USD is the fixed $0.0025/PYRX genesis reference. Only reward-eligible
// (non-staff) testers accrue; the grand total is the airdrop liability. Read-only — this view never
// mutates the ledger.
export const PYX_USD = 0.0025;

export interface TesterRewardAccount {
  testerId: string; email: string; handle: string; displayName: string;
  payoutWallet: string | null; rewardEligible: boolean; foundingRank: number | null; status: string;
  totalPyrx: number; usd: number;
  byReason: { test: number; bug: number; consistency: number; uptime: number; founding: number; other: number };
  testCount: number; bugCount: number; ledgerCount: number; lastEarnedAt: number | null;
}

/** Every non-staff tester with their lifetime accrued PYRX, split by ledger reason + their payout
 *  wallet, plus grand totals (the airdrop liability). Ordered by total accrued, descending. */
export async function testerRewardAccounting(): Promise<{
  accounts: TesterRewardAccount[];
  totals: { testers: number; withWallet: number; totalPyrx: number; eligiblePyrx: number; usd: number;
    byReason: { test: number; bug: number; consistency: number; uptime: number; founding: number; other: number } };
  priceUsd: number;
}> {
  const r = await db().query(
    `SELECT t.id, t.email, t.handle, t.display_name, t.payout_wallet, t.reward_eligible, t.founding_rank, t.status,
            COALESCE(SUM(l.pyrx), 0)                                                        AS total_pyrx,
            COALESCE(SUM(l.pyrx) FILTER (WHERE l.reason = 'test'), 0)                        AS test_pyrx,
            COALESCE(SUM(l.pyrx) FILTER (WHERE l.reason = 'bug'), 0)                         AS bug_pyrx,
            COALESCE(SUM(l.pyrx) FILTER (WHERE l.reason = 'consistency'), 0)                 AS consistency_pyrx,
            COALESCE(SUM(l.pyrx) FILTER (WHERE l.reason = 'uptime'), 0)                      AS uptime_pyrx,
            COALESCE(SUM(l.pyrx) FILTER (WHERE l.reason = 'founding'), 0)                    AS founding_pyrx,
            COALESCE(SUM(l.pyrx) FILTER (WHERE l.reason NOT IN ('test','bug','consistency','uptime','founding')), 0) AS other_pyrx,
            COUNT(l.id) FILTER (WHERE l.reason = 'test')                                     AS test_count,
            COUNT(l.id) FILTER (WHERE l.reason = 'bug')                                      AS bug_count,
            COUNT(l.id)                                                                      AS ledger_count,
            MAX(l.created_at)                                                                AS last_earned_at
       FROM testers t
       LEFT JOIN earnings_ledger l ON l.tester_id = t.id
      WHERE t.is_staff = FALSE
      GROUP BY t.id
      ORDER BY total_pyrx DESC, t.created_at ASC
      LIMIT 2000`,
  );
  const accounts: TesterRewardAccount[] = r.rows.map((x) => {
    const totalPyrx = Number(x.total_pyrx) || 0;
    return {
      testerId: x.id, email: x.email, handle: x.handle || "", displayName: x.display_name || "",
      payoutWallet: x.payout_wallet ?? null, rewardEligible: !!x.reward_eligible,
      foundingRank: x.founding_rank == null ? null : Number(x.founding_rank), status: x.status || "",
      totalPyrx, usd: Math.round(totalPyrx * PYX_USD * 100) / 100,
      byReason: {
        test: Number(x.test_pyrx) || 0, bug: Number(x.bug_pyrx) || 0, consistency: Number(x.consistency_pyrx) || 0,
        uptime: Number(x.uptime_pyrx) || 0, founding: Number(x.founding_pyrx) || 0, other: Number(x.other_pyrx) || 0,
      },
      testCount: Number(x.test_count) || 0, bugCount: Number(x.bug_count) || 0, ledgerCount: Number(x.ledger_count) || 0,
      lastEarnedAt: x.last_earned_at == null ? null : Number(x.last_earned_at),
    };
  });
  const totals = accounts.reduce(
    (a, t) => {
      a.testers += 1;
      if (t.payoutWallet) a.withWallet += 1;
      a.totalPyrx += t.totalPyrx;
      if (t.rewardEligible) a.eligiblePyrx += t.totalPyrx;
      a.byReason.test += t.byReason.test; a.byReason.bug += t.byReason.bug; a.byReason.consistency += t.byReason.consistency;
      a.byReason.uptime += t.byReason.uptime; a.byReason.founding += t.byReason.founding; a.byReason.other += t.byReason.other;
      return a;
    },
    { testers: 0, withWallet: 0, totalPyrx: 0, eligiblePyrx: 0, usd: 0, byReason: { test: 0, bug: 0, consistency: 0, uptime: 0, founding: 0, other: 0 } },
  );
  totals.usd = Math.round(totals.totalPyrx * PYX_USD * 100) / 100;
  return { accounts, totals, priceUsd: PYX_USD };
}

/** CSV export of the airdrop accounting (one row per tester). Values are quoted/escaped so a handle or
 *  wallet can't break the CSV. UTF-8, CRLF line endings (spreadsheet-friendly). */
export function rewardAccountingCsv(accounts: TesterRewardAccount[]): string {
  const cols = [
    "email", "handle", "display_name", "status", "reward_eligible", "founding_rank", "payout_wallet",
    "total_pyrx", "usd_at_0.0025", "test_pyrx", "bug_pyrx", "consistency_pyrx", "uptime_pyrx", "founding_pyrx", "other_pyrx",
    "test_count", "bug_count", "ledger_entries", "last_earned_iso",
  ];
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const iso = (ms: number | null) => (ms == null ? "" : new Date(ms).toISOString());
  const lines = [cols.join(",")];
  for (const a of accounts) {
    lines.push([
      a.email, a.handle, a.displayName, a.status, a.rewardEligible ? "yes" : "no", a.foundingRank ?? "", a.payoutWallet ?? "",
      a.totalPyrx, a.usd, a.byReason.test, a.byReason.bug, a.byReason.consistency, a.byReason.uptime, a.byReason.founding, a.byReason.other,
      a.testCount, a.bugCount, a.ledgerCount, iso(a.lastEarnedAt),
    ].map(esc).join(","));
  }
  return lines.join("\r\n") + "\r\n";
}

// ---- chat (conversations + roster) for the team Devnet Chat page ----
export interface ConvMember { id: string; user: string; name: string; admin: boolean }
export async function devnetTesterByHandle(handle: string): Promise<any | null> {
  const r = await db().query("SELECT id, handle, display_name, is_staff FROM testers WHERE lower(handle)=lower($1) AND handle<>''", [handle]);
  return r.rows[0] || null;
}
async function findDevnetDm(a: string, b: string): Promise<string | null> {
  const r = await db().query(`SELECT c.id FROM conversations c JOIN conversation_members m1 ON m1.conversation_id=c.id AND m1.member_id=$1 JOIN conversation_members m2 ON m2.conversation_id=c.id AND m2.member_id=$2 WHERE c.type='dm' LIMIT 1`, [a, b]);
  return r.rows[0]?.id || null;
}
export async function createDevnetConversation(type: "dm" | "group", name: string, creator: ConvMember, members: ConvMember[]): Promise<string> {
  const all = [creator, ...members].filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i);
  if (type === "dm" && all.length === 2) { const ex = await findDevnetDm(all[0].id, all[1].id); if (ex) return ex; }
  const cid = "c_" + crypto.randomBytes(10).toString("base64url");
  await db().query("INSERT INTO conversations (id,type,name,created_by,created_at) VALUES ($1,$2,$3,$4,$5)", [cid, type, name.slice(0, 80), creator.id, Date.now()]);
  for (const m of all) await db().query("INSERT INTO conversation_members (conversation_id,member_id,member_user,member_name,member_admin) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING", [cid, m.id, m.user, m.name, m.admin]);
  return cid;
}
export async function listDevnetConversations(uid: string): Promise<any[]> {
  const r = await db().query(
    `SELECT c.id, c.type, c.name, c.created_at,
       (SELECT json_agg(json_build_object('id',cm.member_id,'user',cm.member_user,'name',cm.member_name,'admin',cm.member_admin)) FROM conversation_members cm WHERE cm.conversation_id=c.id) AS members,
       (SELECT body FROM chat_messages msg WHERE msg.channel=c.id AND msg.deleted=FALSE ORDER BY msg.created_at DESC LIMIT 1) AS last_body
     FROM conversations c JOIN conversation_members m ON m.conversation_id=c.id AND m.member_id=$1
     ORDER BY COALESCE((SELECT MAX(msg.created_at) FROM chat_messages msg WHERE msg.channel=c.id), c.created_at) DESC LIMIT 50`, [uid]);
  return r.rows;
}
export async function searchDevnetTesters(q: string, excludeId: string): Promise<any[]> {
  const s = `%${q.toLowerCase()}%`;
  const r = await db().query("SELECT id, handle, display_name FROM testers WHERE status='active' AND id<>$1 AND handle<>'' AND (lower(handle) LIKE $2 OR lower(display_name) LIKE $2) ORDER BY handle LIMIT 8", [excludeId, s]);
  return r.rows;
}
// Signed legal agreements (NDA + Alpha T&C) for the team's compliance view — name, typed signature,
// IP, and timestamp captured at signing. Read-only here; the portal owns the table.
export async function listDevnetLegalAcceptances(): Promise<any[]> {
  const r = await db().query(
    `SELECT la.id, la.doc_type, la.doc_version, la.recipient_name, la.signature, la.ip, la.user_agent, la.accepted_at,
            t.email, t.handle, t.display_name
       FROM legal_acceptances la JOIN testers t ON t.id = la.tester_id
      ORDER BY la.accepted_at DESC LIMIT 1000`,
  );
  return r.rows;
}

export async function devnetChatRoster(): Promise<any[]> {
  const r = await db().query("SELECT id, handle AS user, display_name AS name, is_staff, permissions FROM testers WHERE status='active' AND handle<>'' ORDER BY is_staff DESC, lower(handle) ASC LIMIT 300");
  return r.rows.map((x: any) => ({ id: x.id, user: x.user, name: x.name, admin: !!x.is_staff, role: x.is_staff ? "admin" : ((x.permissions || []).includes("community.support") ? "support" : "tester") }));
}

// ---- Training & Quiz Management ----------------------------------------------------------------

export async function listDevnetTrainingLessons(): Promise<any[]> {
  const r = await db().query("SELECT * FROM training_lessons ORDER BY lesson_order ASC");
  return r.rows;
}

export async function saveDevnetTrainingLesson(lesson: any): Promise<void> {
  const lid = lesson.id || id("tl");
  await db().query(
    `INSERT INTO training_lessons (id, title, content, lesson_order, required_for_cert, created_at)
     VALUES ($1, $2, $3::jsonb, $4, $5, $6)
     ON CONFLICT (id) DO UPDATE SET title=$2, content=$3::jsonb, lesson_order=$4, required_for_cert=$5`,
    [lid, lesson.title || "New Lesson", JSON.stringify(lesson.content || {}), Number(lesson.lesson_order) || 0, typeof lesson.required_for_cert === "boolean" ? lesson.required_for_cert : true, Date.now()]
  );
}

export async function deleteDevnetTrainingLesson(idToRemove: string): Promise<void> {
  await db().query("DELETE FROM training_lessons WHERE id=$1", [idToRemove]);
}

export async function listDevnetQuizQuestions(): Promise<any[]> {
  const r = await db().query("SELECT * FROM quiz_questions");
  return r.rows;
}

export async function saveDevnetQuizQuestion(q: any): Promise<void> {
  const qid = q.id || id("qq");
  await db().query(
    `INSERT INTO quiz_questions (id, question, options, correct_answer, explanation, created_at)
     VALUES ($1, $2, $3::jsonb, $4, $5, $6)
     ON CONFLICT (id) DO UPDATE SET question=$2, options=$3::jsonb, correct_answer=$4, explanation=$5`,
    [qid, q.question || "New Question", JSON.stringify(q.options || []), Number(q.correct_answer) || 0, q.explanation || "", Date.now()]
  );
}

export async function deleteDevnetQuizQuestion(idToRemove: string): Promise<void> {
  await db().query("DELETE FROM quiz_questions WHERE id=$1", [idToRemove]);
}
