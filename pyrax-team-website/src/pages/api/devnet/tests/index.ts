// SPDX-License-Identifier: LicenseRef-Proprietary
import type { APIRoute } from "astro";
import { requireUser, subjectOf } from "../../../../server/guard";
import { listTestSubmissions, withReviewerNames } from "../../../../server/devnet-db";
import { listPermissionHolders } from "../../../../server/db";
import { json } from "../../../../server/http";
import { can } from "../../../../lib/permissions";

export const prerender = false;

/** GET /api/devnet/tests — the review queue (contract §6). Filters: status, assignee, track, tester,
 *  limit. Also returns the list of assignable `devnet.tests` holders for the assign dropdown, and
 *  resolves each submission's assignee/assigner team-user ids to display names. */
export const GET: APIRoute = async ({ url, cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false }, 401);
  if (!can(subjectOf(me), "devnet.tests")) return json({ ok: false, error: "Forbidden." }, 403);

  const q = url.searchParams;
  // A non-numeric ?limit would yield NaN → LIMIT NaN → a Postgres 500; coerce with a finite guard.
  const limitN = Number(q.get("limit"));
  const [subs, reviewers] = await Promise.all([
    listTestSubmissions({
      status: q.get("status") || undefined,
      assignee: q.get("assignee") || undefined,
      track: q.get("track") || undefined,
      tester: q.get("tester") || undefined,
      limit: Number.isFinite(limitN) && limitN > 0 ? limitN : undefined,
    }),
    listPermissionHolders("devnet.tests"),
  ]);
  const names = new Map(reviewers.map((r) => [r.id, r.name] as const));
  return json({ ok: true, submissions: withReviewerNames(subs, names), reviewers });
};
