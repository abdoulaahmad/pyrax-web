// SPDX-License-Identifier: LicenseRef-Proprietary
// Aggregated anonymous app-telemetry for the team Statistics page. (requires network.manage)
import type { APIRoute } from "astro";
import { requireUser, subjectOf } from "../../../server/guard";
import { telemetryStats } from "../../../server/devnet-db";
import { json } from "../../../server/http";
import { can } from "../../../lib/permissions";

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);
  if (!can(subjectOf(me), "network.manage")) return json({ ok: false, error: "Forbidden." }, 403);
  const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days")) || 7));
  try {
    const stats = await telemetryStats(days * 864e5);
    return json({ ok: true, ...stats });
  } catch (e) {
    console.error("[telemetry/stats]", (e as Error)?.message || e);
    return json({ ok: false, error: "Couldn't load statistics." }, 500);
  }
};
