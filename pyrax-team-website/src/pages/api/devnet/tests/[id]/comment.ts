// SPDX-License-Identifier: LicenseRef-Proprietary
import type { APIRoute } from "astro";
import { requireUser, subjectOf } from "../../../../../server/guard";
import { addTestComment } from "../../../../../server/devnet-db";
import { audit } from "../../../../../server/db";
import { json } from "../../../../../server/http";
import { can } from "../../../../../lib/permissions";

export const prerender = false;

/** POST /api/devnet/tests/:id/comment — post a staff comment on the review thread (contract §6.5).
 *  Author = the staff member; author_admin=true; notifies the tester in-app. */
export const POST: APIRoute = async ({ params, request, cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false }, 401);
  if (!can(subjectOf(me), "devnet.tests")) return json({ ok: false, error: "Forbidden." }, 403);
  const id = String(params.id);
  const body = String((await request.json().catch(() => ({})))?.body ?? "").trim();
  if (!id || !body) return json({ ok: false, error: "Missing comment." }, 400);
  const comments = await addTestComment(id, { id: me.id, name: me.display_name || me.email, user: "" }, body);
  await audit({ actorId: me.id, actorEmail: me.email, action: "devnet.test.comment", targetId: id });
  return json({ ok: true, comments });
};
