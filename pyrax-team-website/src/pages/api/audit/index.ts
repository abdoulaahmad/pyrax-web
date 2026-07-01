// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Admin-only audit log. Surfaces the append-only record of sensitive mutations (invites, removals,
// permission changes, company-signature + nodes/devnet settings, broadcasts). Restricted to the
// superuser: the log can reveal who changed whose access, so its read is the most privileged gate.
//   GET /api/audit?limit=N  → recent entries, newest first
import type { APIRoute } from "astro";
import { requireUser } from "../../../server/guard";
import { listAudit } from "../../../server/db";
import { json } from "../../../server/http";

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);
  if (!me.is_superuser) return json({ ok: false, error: "Forbidden." }, 403);
  const limit = Number(url.searchParams.get("limit") || 200);
  const entries = await listAudit(Number.isFinite(limit) ? limit : 200);
  return json({ ok: true, entries });
};
