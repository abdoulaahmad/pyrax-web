// SPDX-License-Identifier: LicenseRef-Proprietary
import type { APIRoute } from "astro";
import { requireUser, subjectOf } from "../../../../server/guard";
import { addDevnetBugComment, getDevnetBug } from "../../../../server/devnet-db";
import { json } from "../../../../server/http";
import { can } from "../../../../lib/permissions";

export const prerender = false;

export const POST: APIRoute = async ({ url, request, cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false }, 401);
  if (!can(subjectOf(me), "devnet.issues")) return json({ ok: false, error: "Forbidden." }, 403);
  const bugId = url.searchParams.get("id") || "";
  const body = String((await request.json().catch(() => ({})))?.body ?? "").trim();
  if (!bugId || !body) return json({ ok: false, error: "Missing comment." }, 400);
  await addDevnetBugComment(bugId, { id: me.id, name: me.display_name || me.email, user: "" }, body);
  const bug = await getDevnetBug(bugId);
  return json({ ok: true, comments: bug?.comments || [] });
};
