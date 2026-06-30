// SPDX-License-Identifier: LicenseRef-Proprietary
import type { TesterRow } from "./db";

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}

/** Best-effort client IP: trust the first X-Forwarded-For hop (set by our Caddy proxy), else the
 *  socket address Astro resolved. Used for the legal-signing audit trail. */
export function clientIp(request: Request, fallback?: string): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim().slice(0, 64);
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim().slice(0, 64);
  return (fallback || "").slice(0, 64);
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
