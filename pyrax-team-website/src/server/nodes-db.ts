// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Team-site access to the public nodes site's settings (`pyrax_nodes` DB on the shared cluster). The
// "Network & App Management" controls read/write site_settings here; nodes.pyraxchain.com reads the
// same row. Same JSON shape as the nodes app's settings.ts.
import pg from "pg";

export interface DownloadItem { product: string; platform: string; arch?: string; url: string; version?: string; note?: string }
export interface NodesSettings { open: boolean; closedMessage: string; defaultNetwork: string; downloads: DownloadItem[]; downloadsOpen: boolean; downloadsMessage: string; updatedAt: number; updatedBy: string | null }

const DEFAULTS: NodesSettings = {
  open: true,
  closedMessage: "The PYRAX Nodes portal is opening soon. Leave your email below and we'll notify you the moment it's live.",
  defaultNetwork: "forge",
  downloads: [],
  downloadsOpen: true,
  downloadsMessage: "Public node downloads open when the PYRAX testnet goes live. Join the list and we'll email you the moment official downloads are available.",
  updatedAt: 0,
  updatedBy: null,
};

const URL_RAW = process.env.DATABASE_URL_NODES
  || (process.env.DATABASE_URL || process.env.DATABASE_URL_TEAM_PYRAX || "").replace(/\/team_pyrax(\?|$)/, "/pyrax_nodes$1");
const connectionString = URL_RAW.replace(/[?&]sslmode=[^&]*/, "");
let pool: pg.Pool | null = null;
let ready: Promise<void> | null = null;
function db(): pg.Pool { if (!pool) pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false }, max: 3, idleTimeoutMillis: 30_000 }); return pool; }
function init(): Promise<void> {
  if (!ready) ready = (async () => {
    await db().query(`CREATE TABLE IF NOT EXISTS site_settings ( id INT PRIMARY KEY DEFAULT 1, data JSONB NOT NULL, updated_at BIGINT NOT NULL, updated_by TEXT, CONSTRAINT site_settings_one CHECK (id = 1) );`);
  })();
  return ready;
}
export const nodesConfigured = () => !!connectionString;

export async function getNodesSettings(): Promise<NodesSettings> {
  if (!connectionString) return DEFAULTS;
  try {
    await init();
    const r = await db().query("SELECT data, updated_at, updated_by FROM site_settings WHERE id=1");
    if (!r.rows[0]) return DEFAULTS;
    return { ...DEFAULTS, ...r.rows[0].data, updatedAt: Number(r.rows[0].updated_at) || 0, updatedBy: r.rows[0].updated_by || null };
  } catch { return DEFAULTS; }
}

export async function setNodesSettings(patch: Partial<NodesSettings>, by: string | null): Promise<NodesSettings> {
  await init();
  const cur = await getNodesSettings();
  const next: NodesSettings = { ...cur, ...patch, updatedAt: Date.now(), updatedBy: by };
  const { updatedAt, updatedBy, ...data } = next;
  await db().query(
    `INSERT INTO site_settings (id, data, updated_at, updated_by) VALUES (1, $1::jsonb, $2, $3)
     ON CONFLICT (id) DO UPDATE SET data = $1::jsonb, updated_at = $2, updated_by = $3`,
    [JSON.stringify(data), next.updatedAt, by],
  );
  return next;
}
