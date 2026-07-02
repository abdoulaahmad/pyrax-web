// SPDX-License-Identifier: LicenseRef-Proprietary
// Watch / unwatch a ticket (adds the caller to the participants list). (requires support.manage)
import type { APIRoute } from "astro";
import { requireUser, subjectOf } from "@/server/guard";
import { can } from "@/lib/permissions";
import { json } from "@/server/http";
import { addTicketWatcher, removeTicketWatcher } from "@/server/devnet-db";

export const prerender = false;

export const POST: APIRoute = async ({ params, request, cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false, error: "Sign in required." }, 401);
  if (!can(subjectOf(me), "support.manage")) return json({ ok: false, error: "Forbidden." }, 403);
  const id = String(params.id || "");
  const b = await request.json().catch(() => ({}));
  if (b?.watch === false) await removeTicketWatcher(id, me.id);
  else await addTicketWatcher(id, me.id, me.display_name || me.email);
  return json({ ok: true, watching: b?.watch !== false });
};
