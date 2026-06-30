// SPDX-License-Identifier: LicenseRef-Proprietary
import type { APIRoute } from "astro";
import { requireTester, subjectOf } from "../../../server/guard";
import { getBug, triageBug, testerById } from "../../../server/db";
import { json } from "../../../server/http";
import { can } from "../../../lib/permissions";
import { sendIssueNotify } from "../../../server/email";

export const prerender = false;

export const GET: APIRoute = async ({ params, cookies }) => {
  const me = await requireTester(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);
  if (!can(subjectOf(me), "issues.view")) return json({ ok: false, error: "Forbidden." }, 403);
  const bug = await getBug(String(params.id), me.id);
  if (!bug) return json({ ok: false, error: "Not found." }, 404);
  return json({ ok: true, bug });
};

/** Staff triage: status / assigned severity / award bounty. */
export const PUT: APIRoute = async ({ params, request, cookies }) => {
  const me = await requireTester(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);
  if (!can(subjectOf(me), "issues.triage")) return json({ ok: false, error: "Forbidden." }, 403);
  const b = await request.json().catch(() => ({}));
  const updated = await triageBug(String(params.id), { status: b?.status, assignedSeverity: b?.assignedSeverity, bountyPyrx: b?.bountyPyrx });
  if (!updated) return json({ ok: false, error: "Not found." }, 404);
  if (updated._awarded) {
    const reporter = await testerById(updated._awarded.reporterId);
    if (reporter) void sendIssueNotify(reporter.email, "Your bug was accepted 🎉", `Your report "${updated._awarded.title}" was accepted and earned ${updated._awarded.amount.toLocaleString("en-US")} PYRX, paid via the mainnet airdrop.`);
  }
  const { _awarded, ...bug } = updated;
  return json({ ok: true, bug });
};
