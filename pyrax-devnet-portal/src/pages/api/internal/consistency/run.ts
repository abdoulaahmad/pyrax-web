// SPDX-License-Identifier: LicenseRef-Proprietary
//
// POST /api/internal/consistency/run — the weekly sustained-participation bonus runner (docs §7 + §2),
// intended to be called on a weekly cron by nova. Body { testerId?: "t_…" }: with a testerId it awards
// that one tester; omitted, it sweeps all reward-eligible, active testers. Each award is idempotent per
// ISO week (ledger ref consistency:{isoWeek}) so a replay never double-pays. Separately kill-switched by
// TESTS_CONSISTENCY_ENABLED (default OFF): when off, the endpoint is a no-op that reports it's disabled.
// Bearer NOVA_AGENT_SECRET, constant-time, fail-closed.
import type { APIRoute } from "astro";
import { requireInternal } from "../../../../server/internal-auth";
import { awardConsistencyForWeek, eligibleActiveTesterIds } from "../../../../server/db";
import { consistencyAwardEnabled } from "../../../../lib/rewards";
import { json } from "../../../../server/http";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const unauth = requireInternal(request);
  if (unauth) return unauth;

  if (!consistencyAwardEnabled()) {
    return json({ ok: true, enabled: false, awards: [], note: "Consistency awards are disabled (TESTS_CONSISTENCY_ENABLED off)." });
  }

  const b = await request.json().catch(() => ({} as any));
  const one = typeof b?.testerId === "string" && b.testerId ? String(b.testerId) : null;
  const ids = one ? [one] : await eligibleActiveTesterIds();

  const awards: Array<{ testerId: string; pyrx: number }> = [];
  for (const id of ids) {
    const pyrx = await awardConsistencyForWeek(id);
    if (pyrx > 0) awards.push({ testerId: id, pyrx });
  }
  return json({ ok: true, enabled: true, awards });
};
