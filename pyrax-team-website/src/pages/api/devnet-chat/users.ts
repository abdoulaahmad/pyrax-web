// SPDX-License-Identifier: LicenseRef-Proprietary
import type { APIRoute } from "astro";
import { requireUser, subjectOf } from "../../../server/guard";
import { searchDevnetTesters, devnetChatRoster } from "../../../server/devnet-db";
import { json } from "../../../server/http";
import { can } from "../../../lib/permissions";

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies }) => {
  const me = await requireUser(cookies);
  if (!me || !can(subjectOf(me), "devnet.chat")) return json({ ok: false }, 403);
  if (url.searchParams.get("roster")) return json({ ok: true, roster: await devnetChatRoster() });
  return json({ ok: true, users: await searchDevnetTesters((url.searchParams.get("q") || "").slice(0, 40), me.id) });
};
