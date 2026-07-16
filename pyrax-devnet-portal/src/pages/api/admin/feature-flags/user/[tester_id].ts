// SPDX-License-Identifier: LicenseRef-Proprietary
import type { APIRoute } from "astro";
import { requireTester } from "../../../../../server/guard";
import { json } from "../../../../../server/http";
import { getEnabledFeatures } from "../../../../../server/feature-flags";

export const prerender = false;

export const GET: APIRoute = async ({ params, cookies }) => {
  const me = await requireTester(cookies);
  if (!me || (!me.is_staff && !me.is_superuser)) {
    return json({ ok: false, error: "Unauthorized." }, 403);
  }

  const testerId = params.tester_id;
  if (!testerId) return json({ ok: false, error: "Missing tester id." }, 400);

  const features = await getEnabledFeatures(testerId);
  return json({ ok: true, features });
};
