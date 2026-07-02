// SPDX-License-Identifier: LicenseRef-Proprietary
// One ticket + its full thread (public + internal messages), lifecycle events, and watchers.
// (requires support.manage)
import type { APIRoute } from "astro";
import { requireUser, subjectOf } from "@/server/guard";
import { can } from "@/lib/permissions";
import { json } from "@/server/http";
import { getTicket, getTicketThread } from "@/server/devnet-db";

export const prerender = false;

export const GET: APIRoute = async ({ params, cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false, error: "Sign in required." }, 401);
  if (!can(subjectOf(me), "support.manage")) return json({ ok: false, error: "Forbidden." }, 403);
  const t = await getTicket(String(params.id || ""));
  if (!t) return json({ ok: false, error: "No such ticket." }, 404);
  const thread = await getTicketThread(t.id);
  return json({ ok: true, ticket: t, ...thread });
};
