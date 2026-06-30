// SPDX-License-Identifier: LicenseRef-Proprietary
import type { APIRoute } from "astro";
import { requireUser, subjectOf } from "../../../../server/guard";
import { getDevnetBug, triageDevnetBug } from "../../../../server/devnet-db";
import { json } from "../../../../server/http";
import { can } from "../../../../lib/permissions";

export const prerender = false;

export const GET: APIRoute = async ({ params, cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false }, 401);
  if (!can(subjectOf(me), "devnet.issues")) return json({ ok: false, error: "Forbidden." }, 403);
  const bug = await getDevnetBug(String(params.id));
  if (!bug) return json({ ok: false, error: "Not found." }, 404);
  return json({ ok: true, bug });
};

export const PUT: APIRoute = async ({ params, request, cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false }, 401);
  if (!can(subjectOf(me), "devnet.issues")) return json({ ok: false, error: "Forbidden." }, 403);
  const b = await request.json().catch(() => ({}));
  const r = await triageDevnetBug(String(params.id), { status: b?.status, assignedSeverity: b?.assignedSeverity, bountyPyrx: b?.bountyPyrx });
  if (!r.ok) return json({ ok: false, error: "Not found." }, 404);
  const bug = await getDevnetBug(String(params.id));
  return json({ ok: true, bug });
};
