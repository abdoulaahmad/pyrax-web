// SPDX-License-Identifier: LicenseRef-Proprietary
// Toggle a vote or "I can reproduce" confirm on a bug. ?id=<bugId> body {kind:"vote"|"confirm"}.
import type { APIRoute } from "astro";
import { requireTester, subjectOf } from "../../../server/guard";
import { reactBug } from "../../../server/db";
import { json } from "../../../server/http";
import { can } from "../../../lib/permissions";

export const prerender = false;

export const POST: APIRoute = async ({ url, request, cookies }) => {
  const me = await requireTester(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);
  if (!can(subjectOf(me), "issues.submit")) return json({ ok: false, error: "Forbidden." }, 403);
  const bugId = url.searchParams.get("id") || "";
  const b = await request.json().catch(() => ({}));
  const kind = b?.kind === "confirm" ? "confirm" : "vote";
  if (!bugId) return json({ ok: false, error: "Missing bug id." }, 400);
  const r = await reactBug(bugId, me.id, kind);
  return json({ ok: true, ...r, kind });
};
