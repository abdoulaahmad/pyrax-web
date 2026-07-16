// SPDX-License-Identifier: LicenseRef-Proprietary
import type { APIRoute } from "astro";
import { requireTester } from "../../server/guard";
import { updateTesterProfile, getLegalStatus, getDevnetSettings } from "../../server/db";
import { currentSessionStart, SESSION_COOKIE } from "../../server/auth";
import { json, publicTester } from "../../server/http";
import { transitionState } from "../../server/onboarding";
import { validateWallet, clampSessionDays } from "../../lib/tester";
import { NDA_VERSION, TOS_VERSION } from "../../lib/legal-docs";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const me = await requireTester(cookies);
  if (!me) return json({ ok: false, tester: null });
  // The superuser is exempt from the signing gate (and from decline-deletion). Everyone else signs
  // the NDA once (first login) and accepts the Alpha T&C once PER LOGIN (per session).
  const startedAt = (await currentSessionStart(cookies.get(SESSION_COOKIE)?.value)) ?? Date.now();
  const settings = await getDevnetSettings();
  const isExempt = me.is_superuser || settings.legalRequired === false;

  const legal = isExempt
    ? { ndaAccepted: true, tosAccepted: true, exempt: true, ndaVersion: NDA_VERSION, tosVersion: TOS_VERSION }
    : { ...(await getLegalStatus(me.id, startedAt)), exempt: false, ndaVersion: NDA_VERSION, tosVersion: TOS_VERSION };
  return json({ ok: true, tester: publicTester(me), legal });
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

  // Auto-advance onboarding state if they just completed their profile
  if (me.onboarding_status === 'REGISTERED' && displayName.length > 0) {
    await transitionState(me.id, 'PROFILE_COMPLETE');
    updated.onboarding_status = 'PROFILE_COMPLETE';
  }

  return json({ ok: true, tester: publicTester(updated) });
};
