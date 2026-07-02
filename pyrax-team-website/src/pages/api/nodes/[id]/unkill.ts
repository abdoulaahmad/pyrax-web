// SPDX-License-Identifier: LicenseRef-Proprietary
// Restore a killed node (clear the persisted kill flag; signed unkill delivered via the tunnel relay).
// (requires node_control.kill)
import type { APIRoute } from "astro";
import { requireUser, subjectOf } from "../../../../server/guard";
import { relayAdmin } from "../../../../server/relay";
import { audit } from "../../../../server/db";
import { json } from "../../../../server/http";
import { can } from "../../../../lib/permissions";

export const prerender = false;
const SUB_RE = /^[0-9a-f]{4,64}$/;

export const POST: APIRoute = async ({ params, cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);
  if (!can(subjectOf(me), "node_control.kill")) return json({ ok: false, error: "Forbidden." }, 403);
  const id = String(params.id || "");
  if (!SUB_RE.test(id)) return json({ ok: false, error: "Bad node id." }, 422);
  const r = await relayAdmin("POST", `/__admin/nodes/${id}/unkill`, "");
  if (!r.ok) return json({ ok: false, error: r.data?.error || "Unkill failed." }, r.status);
  await audit({ actorId: me.id, actorEmail: me.email, action: "node.unkill", targetId: id, detail: {} });
  return json({ ok: true, ...r.data });
};
