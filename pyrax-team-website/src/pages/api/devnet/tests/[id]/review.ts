// SPDX-License-Identifier: LicenseRef-Proprietary
import type { APIRoute } from "astro";
import { requireUser, subjectOf } from "../../../../../server/guard";
import { reviewTestSubmission, withReviewerNames } from "../../../../../server/devnet-db";
import { audit, listPermissionHolders } from "../../../../../server/db";
import { json } from "../../../../../server/http";
import { can } from "../../../../../lib/permissions";

export const prerender = false;

/** PUT /api/devnet/tests/:id/review — accept / reject / needs_more (contract §6.4). On accept, pays
 *  perTestReward (or the staff `awardPyrx` override) exactly once via ledger ref `test:{id}`. */
export const PUT: APIRoute = async ({ params, request, cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false }, 401);
  if (!can(subjectOf(me), "devnet.tests")) return json({ ok: false, error: "Forbidden." }, 403);
  const b = await request.json().catch(() => ({}));
  const awardPyrx = typeof b?.awardPyrx === "number" && Number.isFinite(b.awardPyrx) && b.awardPyrx >= 0 ? b.awardPyrx : undefined;
  const r = await reviewTestSubmission(String(params.id), { verdict: String(b?.verdict ?? ""), notes: b?.notes, awardPyrx }, { id: me.id, email: me.email });
  if (!r.ok) {
    const map = { self_review: [403, "You cannot review your own submission."], already_decided: [409, "This submission has already been decided."] } as const;
    const [code, error] = (map as Record<string, readonly [number, string]>)[r.reason] ?? [400, "Invalid verdict or submission not found."];
    return json({ ok: false, error }, code);
  }
  // Record the override delta in the audit trail so any award beyond the computed reward is attributable.
  await audit({ actorId: me.id, actorEmail: me.email, action: "devnet.test.review", targetId: String(params.id), detail: { verdict: b?.verdict, awarded: r.awarded?.amount ?? 0, override: awardPyrx ?? null } });
  const holders = await listPermissionHolders("devnet.tests");
  const names = new Map(holders.map((h) => [h.id, h.name] as const));
  return json({ ok: true, submission: r.submission ? withReviewerNames([r.submission], names)[0] : null, awarded: r.awarded ?? null });
};
