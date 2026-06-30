// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Site settings shared with the team portal's "Network & App Management" controls: the open/closed
// gate, the public downloads list, and the DEFAULT NETWORK shown across marketing sites. Persisted in
// Postgres (`pyrax_nodes` DB on the shared cluster) so the team portal writes and this site reads the
// same values. Reads fall back to safe defaults if the DB isn't reachable yet, so the site still runs.
import pg from "pg";
import type { NetLabel } from "../lib/networks";

export interface DownloadItem { product: string; platform: string; arch?: string; url: string; version?: string; note?: string }
export interface SiteSettings {
  open: boolean;                 // false = public site is "closed" (maintenance/coming-soon) by the team
  closedMessage: string;
  defaultNetwork: NetLabel;      // default network shown across all marketing sites
  downloads: DownloadItem[];
  downloadsOpen: boolean;        // false = Downloads page disabled (link stays, shows a notice + signup)
  downloadsMessage: string;
  updatedAt: number;
  updatedBy: string | null;
}

export const DEFAULT_SETTINGS: SiteSettings = {
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
function db(): pg.Pool {
  if (!pool) pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false }, max: 4, idleTimeoutMillis: 30_000 });
  return pool;
}
function init(): Promise<void> {
  if (!ready) ready = (async () => {
    await db().query(`CREATE TABLE IF NOT EXISTS site_settings ( id INT PRIMARY KEY DEFAULT 1, data JSONB NOT NULL, updated_at BIGINT NOT NULL, updated_by TEXT, CONSTRAINT site_settings_one CHECK (id = 1) );`);
  })();
  return ready;
}
export const settingsConfigured = () => !!connectionString;

export async function getSiteSettings(): Promise<SiteSettings> {
  if (!connectionString) return DEFAULT_SETTINGS;
  try {
    await init();
    const r = await db().query("SELECT data, updated_at, updated_by FROM site_settings WHERE id=1");
    if (!r.rows[0]) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...r.rows[0].data, updatedAt: Number(r.rows[0].updated_at) || 0, updatedBy: r.rows[0].updated_by || null };
  } catch {
    return DEFAULT_SETTINGS; // DB not provisioned yet — degrade gracefully
  }
}

export async function setSiteSettings(patch: Partial<SiteSettings>, by: string | null): Promise<SiteSettings> {
  await init();
  const cur = await getSiteSettings();
  const next: SiteSettings = { ...cur, ...patch, updatedAt: Date.now(), updatedBy: by };
  const { updatedAt, updatedBy, ...data } = next;
  await db().query(
    `INSERT INTO site_settings (id, data, updated_at, updated_by) VALUES (1, $1::jsonb, $2, $3)
     ON CONFLICT (id) DO UPDATE SET data = $1::jsonb, updated_at = $2, updated_by = $3`,
    [JSON.stringify(data), updatedAt, by],
  );
  return next;
}
