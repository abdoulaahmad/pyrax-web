// SPDX-License-Identifier: LicenseRef-Proprietary
import type { APIRoute } from "astro";
import { requireOnboardingState } from "../../../server/onboarding-guard";
import { json } from "../../../server/http";
import { getQuizHistory } from "../../../server/certification";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const guard = await requireOnboardingState(cookies, 'QUIZ');
  if (!guard) return json({ ok: false, error: "Unauthorized or prerequisite not met." }, 403);
  const me = guard.tester;

  const history = await getQuizHistory(me.id);
  return json({ ok: true, history });
};
