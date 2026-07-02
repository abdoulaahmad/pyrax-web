// SPDX-License-Identifier: LicenseRef-Proprietary
// Live node fleet for the Node Control page — proxied (HMAC) from the tunnel relay's registry.
// (requires node_control.view)
import type { APIRoute } from "astro";
import { requireUser, subjectOf } from "../../../server/guard";
import { relayAdmin, relayConfigured } from "../../../server/relay";
import { json } from "../../../server/http";
import { can } from "../../../lib/permissions";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);
  if (!can(subjectOf(me), "node_control.view")) return json({ ok: false, error: "Forbidden." }, 403);
  if (!relayConfigured()) return json({ ok: true, configured: false, nodes: [], networkVersion: "" });
  const r = await relayAdmin("GET", "/__admin/nodes", "");
  if (!r.ok) return json({ ok: false, error: r.data?.error || "Couldn't reach node control." }, r.status);
  return json({ ok: true, configured: true, ...r.data });
};
