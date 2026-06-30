// SPDX-License-Identifier: LicenseRef-Proprietary
import type { APIRoute } from "astro";
import { requireUser, subjectOf } from "../../../../server/guard";
import { listDevnetBugs } from "../../../../server/devnet-db";
import { json } from "../../../../server/http";
import { can } from "../../../../lib/permissions";

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false }, 401);
  if (!can(subjectOf(me), "devnet.issues")) return json({ ok: false, error: "Forbidden." }, 403);
  return json({ ok: true, bugs: await listDevnetBugs(url.searchParams.get("status") || undefined, url.searchParams.get("sort") || undefined) });
};
