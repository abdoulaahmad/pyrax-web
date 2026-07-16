// SPDX-License-Identifier: LicenseRef-Proprietary
import type { APIRoute } from "astro";
import { requireOnboardingState } from "../../../server/onboarding-guard";
import { json } from "../../../server/http";
import { getQuizQuestions } from "../../../server/certification";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const guard = await requireOnboardingState(cookies, 'QUIZ');
  if (!guard) return json({ ok: false, error: "Unauthorized or prerequisite not met." }, 403);
  const me = guard.tester;

  const result = await getQuizQuestions(me.id);
  if (!result.ok) return json(result, 400);

  return json(result);
};
