// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Brevo integration for the notify list. People subscribe to the "PYRAX Nodes — Notify" contact list
// with two boolean opt-ins (NOTIFY_PORTAL, NOTIFY_UPDATES). Broadcasts (portal opened / app updated)
// are sent via the stored template using the existing premium email design.
const API_KEY = process.env.BREVO_API_KEY || "";
const LIST_ID = Number(process.env.BREVO_NODES_LIST_ID || 0);
const NOTIFY_TPL = Number(process.env.BREVO_NODES_NOTIFY_TEMPLATE_ID || 0);
const SENDER_EMAIL = process.env.BREVO_SENDER || "no-reply@pyraxchain.com";
const H = { "api-key": API_KEY, "content-type": "application/json", accept: "application/json" };

export const brevoConfigured = () => !!API_KEY && !!LIST_ID;

/** Add or update a subscriber on the notify list with their opt-in preferences. */
export async function upsertNotifyContact(email: string, prefs: { portal?: boolean; updates?: boolean; downloads?: boolean }): Promise<{ ok: boolean; error?: string }> {
  if (!API_KEY || !LIST_ID) return { ok: false, error: "Email notifications aren't configured yet." };
  try {
    const attributes: Record<string, boolean> = {};
    if (prefs.portal !== undefined) attributes.NOTIFY_PORTAL = prefs.portal;
    if (prefs.updates !== undefined) attributes.NOTIFY_UPDATES = prefs.updates;
    if (prefs.downloads !== undefined) attributes.NOTIFY_DOWNLOADS = prefs.downloads;
    const r = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST", headers: H,
      body: JSON.stringify({ email, attributes, listIds: [LIST_ID], updateEnabled: true }),
    });
    if (r.ok || r.status === 204) return { ok: true };
    const b = await r.json().catch(() => ({}));
    return { ok: false, error: b.message || `Brevo error ${r.status}` };
  } catch (e: any) {
    return { ok: false, error: "Couldn't reach the mail service." };
  }
}

/** Send the notify template to one address (transactional). Used to broadcast to subscribers. */
export async function sendNotifyEmail(to: string, params: { title: string; body: string; link?: string; button?: string }): Promise<boolean> {
  if (!API_KEY || !NOTIFY_TPL) return false;
  try {
    const r = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST", headers: H,
      body: JSON.stringify({ templateId: NOTIFY_TPL, to: [{ email: to }], subject: params.title, params: { title: params.title, body: params.body, link: params.link || "", button: params.button || "Open PYRAX Nodes" } }),
    });
    return r.ok;
  } catch { return false; }
}

/** Fetch the notify-list subscribers (paged) filtered by an opt-in attribute, for broadcasts. */
export async function listNotifyContacts(optIn: "NOTIFY_PORTAL" | "NOTIFY_UPDATES" | "NOTIFY_DOWNLOADS"): Promise<string[]> {
  if (!API_KEY || !LIST_ID) return [];
  const out: string[] = [];
  let offset = 0;
  try {
    for (let i = 0; i < 50; i++) {
      const r = await fetch(`https://api.brevo.com/v3/contacts/lists/${LIST_ID}/contacts?limit=500&offset=${offset}`, { headers: H });
      const b = await r.json().catch(() => ({}));
      const contacts = b.contacts || [];
      for (const c of contacts) if (!c.emailBlacklisted && c.attributes?.[optIn]) out.push(c.email);
      if (contacts.length < 500) break;
      offset += 500;
    }
  } catch { /* return what we have */ }
  return out;
}
