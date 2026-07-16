// SPDX-License-Identifier: LicenseRef-Proprietary
import type { APIRoute } from "astro";
import { requireTester } from "../../../server/guard";
import { json } from "../../../server/http";
import { getCurrentMissionTarget } from "../../../server/onboarding";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const me = await requireTester(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);

  const target = await getCurrentMissionTarget(me.id);
  if (!target) return json({ ok: false, error: "No mission target found." }, 404);

  return json({ ok: true, target });
};
