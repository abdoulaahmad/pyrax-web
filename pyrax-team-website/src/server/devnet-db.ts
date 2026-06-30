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
    pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false }, max: 4, idleTimeoutMillis: 30_000 });
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
      await db().query("INSERT INTO earnings_ledger (id,tester_id,reason,pyrx,note,ref,created_at) VALUES ($1,$2,'bug',$3,$4,$5,$6)", [id("l"), reporter, award, cur.rows[0].title, `bug:${bugId}`, Date.now()]);
      await addDevnetNotification(reporter, "bug", "Your bug was accepted 🎉", `"${cur.rows[0].title}" earned ${award.toLocaleString("en-US")} PYRX.`, "/app");
      awarded = { email: t.rows[0].email, amount: award, title: cur.rows[0].title };
    }
  }
  return { ok: true, awarded };
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
