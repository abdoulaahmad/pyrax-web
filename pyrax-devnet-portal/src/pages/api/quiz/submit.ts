// SPDX-License-Identifier: LicenseRef-Proprietary
import type { APIRoute } from "astro";
import { requireOnboardingState } from "../../../server/onboarding-guard";
import { json } from "../../../server/http";
import { submitQuizAnswers } from "../../../server/certification";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const guard = await requireOnboardingState(cookies, 'QUIZ');
  if (!guard) return json({ ok: false, error: "Unauthorized or prerequisite not met." }, 403);
  const me = guard.tester;

  const body = await request.json().catch(() => ({}));
  const answers = body.answers;
  
  if (!answers || typeof answers !== 'object') {
    return json({ ok: false, error: "Invalid answers payload." }, 400);
  }

  const result = await submitQuizAnswers(me.id, answers);
  
  if (result.ok && result.passed) {
    const onboarding = await import('../../../server/onboarding');
    await onboarding.transitionState(me.id, 'CERTIFIED');
    
    const missions = await import('../../../server/missions');
    const target = await missions.getCurrentMissionTarget(me.id);
    if (target && target.mission_number === 3) {
      await missions.completeMission(me.id, target.id);
    }
  }

  return json(result);
};
