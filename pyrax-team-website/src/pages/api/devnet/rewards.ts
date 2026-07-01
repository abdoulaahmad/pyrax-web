// SPDX-License-Identifier: LicenseRef-Proprietary
import type { APIRoute } from "astro";
import { requireUser, subjectOf } from "../../../server/guard";
import { testerRewardAccounting, rewardAccountingCsv } from "../../../server/devnet-db";
import { json } from "../../../server/http";
import { can } from "../../../lib/permissions";

export const prerender = false;

/** GET /api/devnet/rewards — the airdrop accounting: every tester's accrued PYRX (broken down by ledger
 *  reason) + payout wallet + grand totals (the mainnet-airdrop liability). `?format=csv` streams a CSV
 *  download instead of JSON. Gated on `devnet.rewards` (exposes wallets + financial totals). Read-only. */
export const GET: APIRoute = async ({ url, cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false }, 401);
  if (!can(subjectOf(me), "devnet.rewards")) return json({ ok: false, error: "Forbidden." }, 403);

  const data = await testerRewardAccounting();

  if (url.searchParams.get("format") === "csv") {
    const csv = rewardAccountingCsv(data.accounts);
    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="pyrax-airdrop-accounting-${stamp}.csv"`,
        "cache-control": "no-store",
      },
    });
  }

  return json({ ok: true, ...data });
};
