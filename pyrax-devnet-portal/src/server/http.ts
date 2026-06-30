// SPDX-License-Identifier: LicenseRef-Proprietary
import type { TesterRow } from "./db";

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}

/** Client-safe tester shape (never leaks internal columns). */
export function publicTester(t: TesterRow) {
  return {
    id: t.id, email: t.email, displayName: t.display_name, handle: t.handle,
    payoutWallet: t.payout_wallet, rewardEligible: t.reward_eligible, isStaff: t.is_staff,
    permissions: t.permissions, isSuperuser: t.is_superuser, status: t.status,
    sessionMaxDays: t.session_max_days, foundingRank: t.founding_rank,
  };
}
export type PublicTester = ReturnType<typeof publicTester>;
