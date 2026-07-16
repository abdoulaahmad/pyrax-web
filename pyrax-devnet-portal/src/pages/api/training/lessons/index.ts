// SPDX-License-Identifier: LicenseRef-Proprietary
import type { APIRoute } from "astro";
import { requireOnboardingState } from "../../../../server/onboarding-guard";
import { json } from "../../../../server/http";
import { getLessons } from "../../../../server/training";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const guard = await requireOnboardingState(cookies, 'PROFILE_COMPLETE');
  if (!guard) return json({ ok: false, error: "Unauthorized or prerequisite not met." }, 403);
  const me = guard.tester;

  const lessons = await getLessons(me.id);
  
  // Auto-fix for users stuck in TRAINING state after completing all lessons
  if (guard.tester.onboarding_status === 'TRAINING') {
     const { isTrainingComplete, markTrainingComplete } = await import('../../../../server/training');
     if (await isTrainingComplete(me.id)) {
        await markTrainingComplete(me.id);
        await import('../../../../server/onboarding').then(m => m.transitionState(me.id, 'QUIZ'));
     }
  }

  return json({ ok: true, lessons });
};
