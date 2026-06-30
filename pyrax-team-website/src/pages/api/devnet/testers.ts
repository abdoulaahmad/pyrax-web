// SPDX-License-Identifier: LicenseRef-Proprietary
// Devnet tester roster + pending invites (requires devnet.manage).
import type { APIRoute } from "astro";
import { requireUser, subjectOf } from "../../../server/guard";
import { listDevnetInvitesAndTesters } from "../../../server/devnet-db";
import { json } from "../../../server/http";
import { can } from "../../../lib/permissions";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false }, 401);
  if (!can(subjectOf(me), "devnet.manage")) return json({ ok: false, error: "Forbidden." }, 403);
  return json({ ok: true, testers: await listDevnetInvitesAndTesters() });
};
