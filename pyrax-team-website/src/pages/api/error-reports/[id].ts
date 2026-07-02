// SPDX-License-Identifier: LicenseRef-Proprietary
// Triage a crash/error report: set its status (new | ack | resolved). (requires error_reports.view)
import type { APIRoute } from "astro";
import { requireUser, subjectOf } from "../../../server/guard";
import { setErrorReportStatus } from "../../../server/devnet-db";
import { audit } from "../../../server/db";
import { json } from "../../../server/http";
import { can } from "../../../lib/permissions";

export const prerender = false;

export const POST: APIRoute = async ({ params, request, cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);
  if (!can(subjectOf(me), "error_reports.view")) return json({ ok: false, error: "Forbidden." }, 403);
  const id = String(params.id || "");
  const b = await request.json().catch(() => ({}));
  const status = String(b?.status || "");
  if (!["new", "ack", "resolved"].includes(status)) return json({ ok: false, error: "Bad status." }, 422);
  const n = await setErrorReportStatus(id, status as "new" | "ack" | "resolved");
  if (!n) return json({ ok: false, error: "No such report." }, 404);
  await audit({ actorId: me.id, actorEmail: me.email, action: "error_report.status", targetId: id, detail: { status } });
  return json({ ok: true, status });
};
