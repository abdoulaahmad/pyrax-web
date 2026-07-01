// SPDX-License-Identifier: LicenseRef-Proprietary
//
// GET /api/tests — the signed-in tester's Product Test catalog (docs §5). Every test is returned with
// this tester's per-test status + a computed unlock (prereqs), backed by listTestsForTester. Gated by a
// tester session + the `campaigns.view` baseline permission.
import type { APIRoute } from "astro";
import { requireTester, subjectOf } from "../../../server/guard";
import { listTestsForTester } from "../../../server/db";
import { json } from "../../../server/http";
import { can } from "../../../lib/permissions";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const me = await requireTester(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);
  if (!can(subjectOf(me), "campaigns.view")) return json({ ok: false, error: "Forbidden." }, 403);
  const tests = await listTestsForTester(me.id);
  return json({ ok: true, tests });
};
