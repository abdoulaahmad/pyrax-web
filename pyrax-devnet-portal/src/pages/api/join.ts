// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Accept a whitelist invite: create the tester account (chat handle = the Telegram @handle set at
// whitelist) and start a session. The OTP isn't needed here — receiving the personal invite link
// already proves email ownership.
import type { APIRoute } from "astro";
import { acceptInvite } from "../../server/db";
import { createSession, cookieOptions, SESSION_COOKIE } from "../../server/auth";
import { json } from "../../server/http";
import { validateWallet, clampSessionDays } from "../../lib/tester";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const b = await request.json().catch(() => ({}));
  const token = String(b?.token ?? "");
  const displayName = String(b?.displayName ?? "").trim();
  if (!token) return json({ ok: false, error: "Missing invite." }, 400);
  if (!displayName) return json({ ok: false, errors: { displayName: "Display name is required." } }, 422);
  const wallet = validateWallet(String(b?.payoutWallet ?? ""));
  if (!wallet.ok) return json({ ok: false, errors: { payoutWallet: wallet.error } }, 422);
  const sessionMaxDays = clampSessionDays(b?.sessionDays);

  const r = await acceptInvite(token, { display_name: displayName.slice(0, 80), payout_wallet: wallet.value || null, session_max_days: sessionMaxDays });
  if (!r.ok) {
    const msg = r.reason === "expired" ? "This invite has expired." : r.reason === "used" ? "This invite was already used." : "This invite link is invalid.";
    return json({ ok: false, error: msg }, 400);
  }
  const { sid, maxAgeMs } = await createSession(r.tester.id, r.tester.session_max_days);
  cookies.set(SESSION_COOKIE, sid, cookieOptions(maxAgeMs));
  return json({ ok: true });
};
