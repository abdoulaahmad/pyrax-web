// SPDX-License-Identifier: LicenseRef-Proprietary
import type { APIRoute } from "astro";
import { requireOnboardingState } from "../../../../../server/onboarding-guard";
import { json } from "../../../../../server/http";
import { startLesson } from "../../../../../server/training";

export const prerender = false;

export const POST: APIRoute = async ({ params, cookies }) => {
  const guard = await requireOnboardingState(cookies, 'TRAINING');
  if (!guard) return json({ ok: false, error: "Unauthorized or prerequisite not met." }, 403);
  const me = guard.tester;

  if (!params.id) return json({ ok: false, error: "Missing lesson id." }, 400);
  const result = await startLesson(me.id, params.id);
  
  if (!result.ok) return json(result, 400);
  return json(result);
};
