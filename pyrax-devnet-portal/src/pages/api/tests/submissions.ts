// SPDX-License-Identifier: LicenseRef-Proprietary
//
// GET /api/tests/submissions — the signed-in tester's OWN submissions (docs §5), for their dashboard
// history + live status. Scoped to `me.id` so a tester only ever sees their own submissions. This
// STATIC route takes precedence over the sibling dynamic [id].ts, so "/api/tests/submissions" resolves
// here and never collides with GET /api/tests/:id.
import type { APIRoute } from "astro";
import { requireTester, subjectOf } from "../../../server/guard";
import { listSubmissions, testerTestStats } from "../../../server/db";
import { json } from "../../../server/http";
import { can } from "../../../lib/permissions";
import { CONSISTENCY, meetsConsistencyWeek } from "../../../lib/rewards";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const me = await requireTester(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);
  if (!can(subjectOf(me), "campaigns.view")) return json({ ok: false, error: "Forbidden." }, 403);
  const [submissions, stats] = await Promise.all([
    listSubmissions({ tester: me.id, limit: 200 }),
    testerTestStats(me.id),
  ]);
  // The streak meter needs the raw stats + the bar the tester is measured against; meetsThisWeek says
  // whether the CURRENT week already qualifies (so the UI can show "this week counts").
  return json({
    ok: true,
    submissions,
    stats,
    consistency: {
      minAcceptedTestsPerWeek: CONSISTENCY.minAcceptedTestsPerWeek,
      minAcceptedIssueReportsPerWeek: CONSISTENCY.minAcceptedIssueReportsPerWeek,
      sustainedWeeks: CONSISTENCY.sustainedWeeks,
      bonusPyrx: CONSISTENCY.bonusPyrx,
      meetsThisWeek: meetsConsistencyWeek(stats),
    },
  });
};
