// SPDX-License-Identifier: LicenseRef-Proprietary
import type { APIRoute } from "astro";
import { requireTester } from "../../../server/guard";
import { json } from "../../../server/http";
import { getOnboardingState } from "../../../server/onboarding";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const me = await requireTester(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);

  let state = await getOnboardingState(me.id);
  if (!state) return json({ ok: false, error: "State not found." }, 404);

  // Auto-repair: if user is stuck in QUIZ state but already has a certificate, bump to CERTIFIED
  if (state.onboarding_status === 'QUIZ' && state.certification_id) {
     await import('../../../server/onboarding').then(m => m.transitionState(me.id, 'CERTIFIED'));
     // Refresh state
     const newState = await getOnboardingState(me.id);
     if (newState) state = newState;
  }

  return json({ ok: true, state });
};
