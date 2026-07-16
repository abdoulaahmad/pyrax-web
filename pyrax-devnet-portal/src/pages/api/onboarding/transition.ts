// SPDX-License-Identifier: LicenseRef-Proprietary
import type { APIRoute } from "astro";
import { requireTester } from "../../../server/guard";
import { json } from "../../../server/http";
import { transitionState } from "../../../server/onboarding";
import type { OnboardingStatus } from "../../../types/onboarding";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const me = await requireTester(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);

  const body = await request.json().catch(() => ({}));
  const newState = body.status as OnboardingStatus;
  
  if (!newState) return json({ ok: false, error: "Missing status." }, 400);

  const result = await transitionState(me.id, newState);
  if (!result.ok) return json({ ok: false, error: result.reason }, 400);

  return json(result);
};
