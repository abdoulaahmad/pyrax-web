// SPDX-License-Identifier: LicenseRef-Proprietary
import type { APIRoute } from "astro";
import { requireTester } from "../../../../../server/guard";
import { json } from "../../../../../server/http";
import { setFeatureGlobal, setFeatureForUser, setFeatureForCohort } from "../../../../../server/feature-flags";
import type { FeatureFlagName } from "../../../../../lib/onboarding";

export const prerender = false;

export const PUT: APIRoute = async ({ params, request, cookies }) => {
  const me = await requireTester(cookies);
  if (!me || (!me.is_staff && !me.is_superuser)) {
    return json({ ok: false, error: "Unauthorized." }, 403);
  }

  const name = params.name as FeatureFlagName;
  if (!name) return json({ ok: false, error: "Missing flag name." }, 400);

  const body = await request.json().catch(() => ({}));
  const targetType = body.targetType; // 'global', 'user', 'cohort'
  const enabled = !!body.enabled;

  if (targetType === 'global') {
    const result = await setFeatureGlobal(name, enabled);
    return json(result);
  } else if (targetType === 'user') {
    const testerId = body.testerId;
    if (!testerId) return json({ ok: false, error: "Missing testerId." }, 400);
    const result = await setFeatureForUser(testerId, name, enabled);
    return json(result);
  } else if (targetType === 'cohort') {
    const cohortName = body.cohortName;
    if (!cohortName) return json({ ok: false, error: "Missing cohortName." }, 400);
    const result = await setFeatureForCohort(cohortName, name, enabled);
    return json(result);
  }

  return json({ ok: false, error: "Invalid targetType." }, 400);
};
