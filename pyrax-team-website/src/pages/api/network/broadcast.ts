// SPDX-License-Identifier: LicenseRef-Proprietary
// Trigger a notify broadcast (email + browser push) on the nodes site. Proxies to the nodes app's
// admin endpoint with the shared NODES_ADMIN_SECRET.
import type { APIRoute } from "astro";
import { requireUser, subjectOf } from "../../../server/guard";
import { json } from "../../../server/http";
import { can } from "../../../lib/permissions";

export const prerender = false;
const NODES_URL = process.env.NODES_SITE_URL || "https://nodes.pyraxchain.com";
const SECRET = process.env.NODES_ADMIN_SECRET || "";

export const POST: APIRoute = async ({ request, cookies }) => {
  const me = await requireUser(cookies);
  if (!me || !can(subjectOf(me), "network.broadcast")) return json({ ok: false, error: "Forbidden." }, 403);
  if (!SECRET) return json({ ok: false, error: "Broadcasts aren't configured (missing NODES_ADMIN_SECRET)." }, 500);
  const b = await request.json().catch(() => ({}));
  try {
    const r = await fetch(`${NODES_URL}/api/admin/broadcast`, {
      method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${SECRET}` },
      body: JSON.stringify({ kind: b?.kind === "updates" ? "updates" : "portal", title: b?.title, body: b?.body, link: b?.link, button: b?.button }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.ok) return json({ ok: false, error: data.error || `Nodes site returned ${r.status}` }, 502);
    return json({ ok: true, emailed: data.emailed, pushed: data.pushed, subscribers: data.subscribers });
  } catch {
    return json({ ok: false, error: "Couldn't reach the nodes site." }, 502);
  }
};
