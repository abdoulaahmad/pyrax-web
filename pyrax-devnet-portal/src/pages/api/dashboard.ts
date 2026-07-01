// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Aggregated dashboard data for the signed-in tester: devnet status, their nodes + live uptime,
// accrued earnings (+ USD-equiv), founding rank, leaderboard position. Rewards are only ever
// surfaced here (post-login) — never on public/marketing surfaces.
import type { APIRoute } from "astro";
import { requireTester } from "../../server/guard";
import { getDevnetSettings, listNodesFor, uptimePct, ledgerTotal, listLedger, leaderboard, bugsAcceptedCount, unreadCount, foundingClaimedCount } from "../../server/db";
import { json } from "../../server/http";
import { usd, uptimeReward, tierFor, REWARDS } from "../../lib/rewards";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const me = await requireTester(cookies);
  if (!me) return json({ ok: false }, 401);

  const since30 = Date.now() - 30 * 86_400_000;
  const [devnet, nodes, uptime, total, ledger, board, bugsAccepted, unread, foundingClaimed] = await Promise.all([
    getDevnetSettings(), listNodesFor(me.id), uptimePct(me.id, since30), ledgerTotal(me.id), listLedger(me.id, 50), leaderboard(100), bugsAcceptedCount(me.id), unreadCount(me.id), foundingClaimedCount(),
  ]);
  const rank = board.findIndex((b) => b.id === me.id);

  return json({
    ok: true,
    devnet,
    nodes,
    uptime,                                  // best-single-node uptime % (30d)
    online: nodes.some((n: any) => n.online),
    earnings: {
      rewardEligible: me.reward_eligible,
      totalPyrx: total,
      totalUsd: usd(total),
      projectedUptimePyrx: me.reward_eligible ? uptimeReward(uptime) : 0,
      tier: tierFor(total),
      bugsAccepted,
      ledger,
    },
    unread,
    foundingRank: me.founding_rank,
    foundingRemaining: Math.max(0, REWARDS.foundingTester.count - foundingClaimed), // real remaining slots
    rank: rank >= 0 ? rank + 1 : null,
    leaderboardTop: board.slice(0, 10),
  });
};
