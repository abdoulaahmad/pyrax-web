// SPDX-License-Identifier: LicenseRef-Proprietary
import type { APIRoute } from "astro";
import { requireUser, subjectOf } from "../../../../server/guard";
import { getTestSubmission, listTestComments, withReviewerNames } from "../../../../server/devnet-db";
import { listPermissionHolders } from "../../../../server/db";
import { json } from "../../../../server/http";
import { can } from "../../../../lib/permissions";

export const prerender = false;

/** GET /api/devnet/tests/:id — one submission (with test + tester), its comment thread, and the
 *  resolved reviewer names (contract §6.2). */
export const GET: APIRoute = async ({ params, cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false }, 401);
  if (!can(subjectOf(me), "devnet.tests")) return json({ ok: false, error: "Forbidden." }, 403);
  const sub = await getTestSubmission(String(params.id));
  if (!sub) return json({ ok: false, error: "Not found." }, 404);
  const holders = await listPermissionHolders("devnet.tests");
  const names = new Map(holders.map((r) => [r.id, r.name] as const));
  const comments = await listTestComments(sub.id);
  return json({ ok: true, submission: withReviewerNames([sub], names)[0], comments });
};
