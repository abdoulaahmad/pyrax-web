// SPDX-License-Identifier: LicenseRef-Proprietary
// Web Push (VAPID) sender. Inert if VAPID keys aren't configured. Stale subscriptions (404/410)
// are reported back so the caller can prune them.
import webpush from "web-push";

const PUB = process.env.VAPID_PUBLIC_KEY || "";
const PRIV = process.env.VAPID_PRIVATE_KEY || "";
const SUB = process.env.VAPID_SUBJECT || "mailto:noreply@pyraxchain.com";
let configured = false;
function ensure(): boolean { if (!configured && PUB && PRIV) { try { webpush.setVapidDetails(SUB, PUB, PRIV); configured = true; } catch { return false; } } return configured; }

export const pushConfigured = () => !!(PUB && PRIV);
export const VAPID_PUBLIC = PUB;

/** Send a push to every subscription. Returns the endpoints that are gone (to be deleted). */
export async function sendPushToAll(subs: { endpoint: string; keys: any }[], payload: object): Promise<string[]> {
  if (!ensure() || !subs.length) return [];
  const gone: string[] = [];
  await Promise.allSettled(subs.map((s) =>
    webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify(payload))
      .catch((e: any) => { if (e?.statusCode === 404 || e?.statusCode === 410) gone.push(s.endpoint); })
  ));
  return gone;
}
