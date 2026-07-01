// SPDX-License-Identifier: LicenseRef-Proprietary
import type { APIRoute } from "astro";
import { requireUser, subjectOf } from "../../../../server/guard";
import { testReleaseReadiness } from "../../../../server/devnet-db";
import { json } from "../../../../server/http";
import { can } from "../../../../lib/permissions";

export const prerender = false;

/** GET /api/devnet/tests/readiness — raw tests + submissions for the module's Release-Readiness panel
 *  (per-app-version coverage % + the test×track pass/fail heatmap). Computed client-side to keep the
 *  server layer a thin, contract-shaped read. */
export const GET: APIRoute = async ({ cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false }, 401);
  if (!can(subjectOf(me), "devnet.tests")) return json({ ok: false, error: "Forbidden." }, 403);
  const { tests, submissions } = await testReleaseReadiness();
  return json({ ok: true, tests, submissions });
};
