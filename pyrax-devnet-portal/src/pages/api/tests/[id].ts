// SPDX-License-Identifier: LicenseRef-Proprietary
//
// GET /api/tests/:id — one Product Test for the signed-in tester, plus THIS tester's submission history
// for it (docs §5). The test carries the tester's unlock computation (locked/missingPrereqs/myStatus)
// exactly like the catalog, so the runner can render prereqs + status without a second call. Gated by a
// tester session + `campaigns.view`.
import type { APIRoute } from "astro";
import { requireTester, subjectOf } from "../../../server/guard";
import { getTest, listSubmissions, canTesterSubmit, listTestsForTester } from "../../../server/db";
import { json } from "../../../server/http";
import { can } from "../../../lib/permissions";

export const prerender = false;

export const GET: APIRoute = async ({ params, cookies }) => {
  const me = await requireTester(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);
  if (!can(subjectOf(me), "campaigns.view")) return json({ ok: false, error: "Forbidden." }, 403);
  const testId = String(params.id || "");
  const test = await getTest(testId);
  if (!test) return json({ ok: false, error: "Not found." }, 404);

  // Reuse the catalog computation for this one test so unlock/status stays identical to GET /api/tests.
  const catalog = await listTestsForTester(me.id);
  const withStatus = catalog.find((t) => t.id === testId);
  const gate = await canTesterSubmit(me.id, testId);
  const submissions = await listSubmissions({ tester: me.id, limit: 50 });
  const mine = submissions.filter((s) => s.testId === testId);

  return json({
    ok: true,
    test: withStatus ?? { ...test, myStatus: "not_started", mySubmissionId: null, locked: gate.missingPrereqs.length > 0, missingPrereqs: gate.missingPrereqs },
    canSubmit: gate.ok,
    missingPrereqs: gate.missingPrereqs,
    submissions: mine,
  });
};
