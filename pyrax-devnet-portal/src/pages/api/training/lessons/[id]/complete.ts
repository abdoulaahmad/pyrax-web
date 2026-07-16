// SPDX-License-Identifier: LicenseRef-Proprietary
import type { APIRoute } from "astro";
import { requireOnboardingState } from "../../../../../server/onboarding-guard";
import { json } from "../../../../../server/http";
import { completeLesson, markTrainingComplete } from "../../../../../server/training";
import { transitionState } from "../../../../../server/onboarding";

export const prerender = false;

export const POST: APIRoute = async ({ params, cookies }) => {
  const guard = await requireOnboardingState(cookies, 'PROFILE_COMPLETE');
  if (!guard) return json({ ok: false, error: "Unauthorized or prerequisite not met." }, 403);

  // Transition state to TRAINING if they haven't yet
  if (guard.tester.onboarding_status === 'PROFILE_COMPLETE') {
    await import('../../../../../server/onboarding').then(m => m.transitionState(guard.tester.id, 'TRAINING'));
  }
  const me = guard.tester;

  if (!params.id) return json({ ok: false, error: "Missing lesson id." }, 400);
  const result = await completeLesson(me.id, params.id);
  
  if (result.ok && result.progress === 100) {
    await markTrainingComplete(me.id);
    await transitionState(me.id, 'QUIZ');
  }
  
  if (!result.ok) return json(result, 400);
  return json(result);
};
