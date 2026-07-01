// SPDX-License-Identifier: LicenseRef-Proprietary
import type { APIRoute } from "astro";
import { requireUser, subjectOf } from "../../../../../server/guard";
import { assignTestSubmission, withReviewerNames } from "../../../../../server/devnet-db";
import { audit, listPermissionHolders } from "../../../../../server/db";
import { json } from "../../../../../server/http";
import { can } from "../../../../../lib/permissions";

export const prerender = false;

/** POST /api/devnet/tests/:id/assign — assign to a reviewer (self or another `devnet.tests` holder).
 *  Moves submitted/ai_screening → in_review (contract §6.3). The assignee must hold `devnet.tests`. */
export const POST: APIRoute = async ({ params, request, cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false }, 401);
  if (!can(subjectOf(me), "devnet.tests")) return json({ ok: false, error: "Forbidden." }, 403);
  const b = await request.json().catch(() => ({}));
  const assigneeId = String(b?.assigneeId ?? "").trim();
  if (!assigneeId) return json({ ok: false, error: "Missing assignee." }, 400);
  const holders = await listPermissionHolders("devnet.tests");
  if (!holders.some((h) => h.id === assigneeId)) return json({ ok: false, error: "Assignee is not a test reviewer." }, 400);
  const sub = await assignTestSubmission(String(params.id), assigneeId, me.id);
  if (!sub) return json({ ok: false, error: "Not found." }, 404);
  await audit({ actorId: me.id, actorEmail: me.email, action: "devnet.test.assign", targetId: String(params.id), detail: { assigneeId } });
  const names = new Map(holders.map((h) => [h.id, h.name] as const));
  return json({ ok: true, submission: withReviewerNames([sub], names)[0] });
};
