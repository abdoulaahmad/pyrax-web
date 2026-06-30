// SPDX-License-Identifier: LicenseRef-Proprietary
// Monthly uptime-reward runner. Idempotent per tester per month. Trigger from the team-site devnet
// admin (or a cron). Founding bonuses, bug bounties + report rewards are event-driven elsewhere.
import type { APIRoute } from "astro";
import { requireTester, subjectOf } from "../../../server/guard";
import { listTesters, uptimePct, awardUptimeForMonth } from "../../../server/db";
import { json } from "../../../server/http";
import { can } from "../../../lib/permissions";
import { uptimeReward } from "../../../lib/rewards";

export const prerender = false;

export const POST: APIRoute = async ({ cookies }) => {
  const me = await requireTester(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);
  if (!can(subjectOf(me), "rewards.admin")) return json({ ok: false, error: "Forbidden." }, 403);

  const now = new Date();
  const ym = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const since = Date.now() - 30 * 86_400_000;
  const testers = (await listTesters()).filter((t) => t.reward_eligible && t.status === "active");
  let awarded = 0, totalPyrx = 0;
  for (const t of testers) {
    const pct = await uptimePct(t.id, since);
    const pyrx = uptimeReward(pct);
    if (pyrx > 0 && (await awardUptimeForMonth(t.id, ym, pyrx))) { awarded++; totalPyrx += pyrx; }
  }
  return json({ ok: true, month: ym, awarded, totalPyrx });
};
