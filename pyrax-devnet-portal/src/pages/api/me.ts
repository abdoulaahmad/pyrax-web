// SPDX-License-Identifier: LicenseRef-Proprietary
import type { APIRoute } from "astro";
import { requireTester } from "../../server/guard";
import { updateTesterProfile } from "../../server/db";
import { json, publicTester } from "../../server/http";
import { validateWallet, clampSessionDays } from "../../lib/tester";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const me = await requireTester(cookies);
  if (!me) return json({ ok: false, tester: null });
  return json({ ok: true, tester: publicTester(me) });
};

/** Update the tester's own settings: display name, payout wallet, session length (<=7d).
 *  The chat @handle is their Telegram handle (set at whitelist) and is NOT editable here. */
export const PUT: APIRoute = async ({ request, cookies }) => {
  const me = await requireTester(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);
  const b = await request.json().catch(() => ({}));
  const errors: Record<string, string> = {};

  const displayName = String(b?.displayName ?? "").trim();
  if (!displayName) errors.displayName = "Display name is required.";
  const wallet = validateWallet(String(b?.payoutWallet ?? ""));
  if (!wallet.ok) errors.payoutWallet = wallet.error!;
  const sessionMaxDays = clampSessionDays(b?.sessionMaxDays);

  if (Object.keys(errors).length) return json({ ok: false, errors }, 422);
  const updated = await updateTesterProfile(me.id, { display_name: displayName.slice(0, 80), handle: me.handle, payout_wallet: wallet.value || null, session_max_days: sessionMaxDays });
  if (!updated) return json({ ok: false, error: "Could not save." }, 500);
  return json({ ok: true, tester: publicTester(updated) });
};
