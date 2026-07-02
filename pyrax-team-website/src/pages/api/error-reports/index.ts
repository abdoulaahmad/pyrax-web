// SPDX-License-Identifier: LicenseRef-Proprietary
// Paginated crash/error reports (from the apps + CLI) for the Error Reports page. (requires error_reports.view)
import type { APIRoute } from "astro";
import { requireUser, subjectOf } from "../../../server/guard";
import { listErrorReports } from "../../../server/devnet-db";
import { json } from "../../../server/http";
import { can } from "../../../lib/permissions";

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);
  if (!can(subjectOf(me), "error_reports.view")) return json({ ok: false, error: "Forbidden." }, 403);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const pageSize = 25;
  try {
    const { rows, total } = await listErrorReports({
      status: url.searchParams.get("status") || undefined,
      level: url.searchParams.get("level") || undefined,
      app: url.searchParams.get("app") || undefined,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
    return json({ ok: true, reports: rows, total, page, pageSize });
  } catch (e) {
    console.error("[error-reports]", (e as Error)?.message || e);
    return json({ ok: false, error: "Couldn't load error reports." }, 500);
  }
};
