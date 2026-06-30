// SPDX-License-Identifier: LicenseRef-Proprietary
// Add a comment to a bug. ?id=<bugId> body {body:"..."}.
import type { APIRoute } from "astro";
import { requireTester, subjectOf } from "../../../server/guard";
import { addBugComment, getBug } from "../../../server/db";
import { json } from "../../../server/http";
import { can } from "../../../lib/permissions";

export const prerender = false;

export const POST: APIRoute = async ({ url, request, cookies }) => {
  const me = await requireTester(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);
  if (!can(subjectOf(me), "issues.submit")) return json({ ok: false, error: "Forbidden." }, 403);
  const bugId = url.searchParams.get("id") || "";
  const b = await request.json().catch(() => ({}));
  const body = String(b?.body ?? "").trim();
  if (!bugId || !body) return json({ ok: false, error: "Missing comment." }, 400);
  await addBugComment(bugId, me.id, body);
  const bug = await getBug(bugId, me.id);
  return json({ ok: true, comments: bug?.comments || [] });
};
