// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Self-hosted Web Push. The service worker (public/sw.js) is served from our own domain and the push
// payloads are signed + sent by OUR server with VAPID — no third-party push relay. (Delivery still
// transits the browser vendor's push endpoint, as the Web Push standard requires.) Subscriptions live
// in the pyrax_nodes DB; sends prune expired (404/410) endpoints.
import webpush from "web-push";
import pg from "pg";

const PUB = process.env.VAPID_PUBLIC_KEY || "";
const PRIV = process.env.VAPID_PRIVATE_KEY || "";
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:no-reply@pyraxchain.com";
let vapidOk = false;
if (PUB && PRIV) { try { webpush.setVapidDetails(SUBJECT, PUB, PRIV); vapidOk = true; } catch { vapidOk = false; } }
export const pushPublicKey = () => PUB;
export const pushConfigured = () => vapidOk;

const URL_RAW = process.env.DATABASE_URL_NODES
  || (process.env.DATABASE_URL || process.env.DATABASE_URL_TEAM_PYRAX || "").replace(/\/team_pyrax(\?|$)/, "/pyrax_nodes$1");
const connectionString = URL_RAW.replace(/[?&]sslmode=[^&]*/, "");
let pool: pg.Pool | null = null;
let ready: Promise<void> | null = null;
function db(): pg.Pool { if (!pool) pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false }, max: 4, idleTimeoutMillis: 30_000 }); return pool; }
function init(): Promise<void> {
  if (!ready) ready = (async () => {
    await db().query(`CREATE TABLE IF NOT EXISTS push_subscriptions (
      endpoint TEXT PRIMARY KEY, keys JSONB NOT NULL, email TEXT,
      portal BOOLEAN NOT NULL DEFAULT TRUE, updates BOOLEAN NOT NULL DEFAULT TRUE, downloads BOOLEAN NOT NULL DEFAULT TRUE, created_at BIGINT NOT NULL );`);
    await db().query(`ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS downloads BOOLEAN NOT NULL DEFAULT TRUE;`);
  })();
  return ready;
}

export async function savePushSub(sub: { endpoint: string; keys: any }, prefs: { email?: string; portal: boolean; updates: boolean; downloads?: boolean }): Promise<boolean> {
  if (!connectionString || !sub?.endpoint || !sub?.keys) return false;
  try {
    await init();
    await db().query(
      `INSERT INTO push_subscriptions (endpoint, keys, email, portal, updates, downloads, created_at) VALUES ($1,$2::jsonb,$3,$4,$5,$6,$7)
       ON CONFLICT (endpoint) DO UPDATE SET keys=$2::jsonb, email=COALESCE($3,push_subscriptions.email), portal=$4, updates=$5, downloads=$6`,
      [sub.endpoint, JSON.stringify(sub.keys), prefs.email || null, prefs.portal, prefs.updates, prefs.downloads ?? true, Date.now()],
    );
    return true;
  } catch { return false; }
}

export async function deletePushSub(endpoint: string): Promise<void> {
  if (!connectionString) return;
  try { await init(); await db().query("DELETE FROM push_subscriptions WHERE endpoint=$1", [endpoint]); } catch {}
}

/** Broadcast a push to subscribers opted into `kind`. Returns how many were delivered. Prunes dead subs. */
export async function sendPushToAll(payload: { title: string; body: string; url?: string }, kind: "portal" | "updates" | "downloads"): Promise<number> {
  if (!vapidOk || !connectionString) return 0;
  try {
    await init();
    const col = kind === "portal" ? "portal" : kind === "downloads" ? "downloads" : "updates";
    const r = await db().query(`SELECT endpoint, keys FROM push_subscriptions WHERE ${col} = TRUE`);
    let sent = 0;
    const data = JSON.stringify({ title: payload.title, body: payload.body, url: payload.url || "https://nodes.pyraxchain.com" });
    await Promise.all(r.rows.map(async (row: any) => {
      try { await webpush.sendNotification({ endpoint: row.endpoint, keys: row.keys }, data); sent++; }
      catch (e: any) { if (e?.statusCode === 404 || e?.statusCode === 410) await deletePushSub(row.endpoint); }
    }));
    return sent;
  } catch { return 0; }
}
