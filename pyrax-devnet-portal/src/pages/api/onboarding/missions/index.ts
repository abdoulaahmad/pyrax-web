// SPDX-License-Identifier: LicenseRef-Proprietary
import type { APIRoute } from "astro";
import { requireTester } from "../../../../server/guard";
import { json } from "../../../../server/http";
import { getOnboardingState } from "../../../../server/onboarding";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const me = await requireTester(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);

  const state = await getOnboardingState(me.id);
  if (!state) return json({ ok: false, error: "State not found." }, 404);

  return json({ ok: true, missions: state.missions, current_mission_number: state.current_mission });
};
