// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Team-site access to the shared `devnet_tester` database (the Devnet Tester Portal owns the schema;
// this only reads/writes the tables the team's Devnet Management surface needs). Connects from
// DATABASE_URL_DEVNET. The portal initializes the schema on boot — we don't recreate it here.
import pg from "pg";
import crypto from "node:crypto";

const URL_RAW = process.env.DATABASE_URL_DEVNET || "";
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
