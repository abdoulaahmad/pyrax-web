// SPDX-License-Identifier: LicenseRef-Proprietary
import type { APIRoute } from "astro";
import { requireTester } from "../../../../../server/guard";
import { json } from "../../../../../server/http";
import { getAllFeatureFlags } from "../../../../../server/feature-flags";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const me = await requireTester(cookies);
  if (!me || (!me.is_staff && !me.is_superuser)) {
    return json({ ok: false, error: "Unauthorized." }, 403);
  }

  const flags = await getAllFeatureFlags();
  return json({ ok: true, flags });
};
