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
  // connectionTimeoutMillis bounds a connect attempt to an unreachable host (pg default is 0 = wait
  // indefinitely, which would hang /healthz, the HEALTHCHECK, and every page render that reads settings).
  if (!pool) pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false }, max: 4, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 4_000 });
  return pool;
}

/** Resolve `p`, or `fallback` if it doesn't settle within `ms`. The slow promise is left to settle on
 *  its own (its rejection is swallowed) so a hung DB connect can never stall the caller. */
function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    const t = setTimeout(() => resolve(fallback), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, () => { clearTimeout(t); resolve(fallback); });
  });
}
function init(): Promise<void> {
  if (!ready) ready = (async () => {
    await db().query(`CREATE TABLE IF NOT EXISTS site_settings ( id INT PRIMARY KEY DEFAULT 1, data JSONB NOT NULL, updated_at BIGINT NOT NULL, updated_by TEXT, CONSTRAINT site_settings_one CHECK (id = 1) );`);
  })();
  return ready;
}
export const settingsConfigured = () => !!connectionString;

/** Lightweight DB reachability probe for /healthz. Never throws or hangs — reports a status string,
 *  treating a slow/unreachable DB as "down" within a bounded time so the health check stays responsive. */
export async function pingDb(): Promise<"up" | "down" | "unconfigured"> {
  if (!connectionString) return "unconfigured";
  return withTimeout(db().query("SELECT 1").then(() => "up" as const, () => "down" as const), 4_500, "down");
}

export async function getSiteSettings(): Promise<SiteSettings> {
  if (!connectionString) return DEFAULT_SETTINGS;
  // Bounded read: this runs on EVERY page render (Base layout), so a slow/unreachable DB must fall back
  // to safe defaults promptly rather than stalling the whole site.
  return withTimeout((async () => {
    try {
      await init();
      const r = await db().query("SELECT data, updated_at, updated_by FROM site_settings WHERE id=1");
      if (!r.rows[0]) return DEFAULT_SETTINGS;
      return { ...DEFAULT_SETTINGS, ...r.rows[0].data, updatedAt: Number(r.rows[0].updated_at) || 0, updatedBy: r.rows[0].updated_by || null };
    } catch {
      return DEFAULT_SETTINGS; // DB not provisioned yet — degrade gracefully
    }
  })(), 4_500, DEFAULT_SETTINGS);
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
