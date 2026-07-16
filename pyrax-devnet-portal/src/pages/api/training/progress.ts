// SPDX-License-Identifier: LicenseRef-Proprietary
import type { APIRoute } from "astro";
import { requireOnboardingState } from "../../../server/onboarding-guard";
import { json } from "../../../server/http";
import { getTrainingProgress } from "../../../server/training";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const guard = await requireOnboardingState(cookies, 'PROFILE_COMPLETE');
  if (!guard) return json({ ok: false, error: "Unauthorized or prerequisite not met." }, 403);
  const me = guard.tester;

  const progress = await getTrainingProgress(me.id);
  return json({ ok: true, progress });
};
