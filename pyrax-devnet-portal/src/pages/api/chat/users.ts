// SPDX-License-Identifier: LicenseRef-Proprietary
// Tester search (for starting DMs / adding group members) + the roster (members panel).
import type { APIRoute } from "astro";
import { requireTester } from "../../../server/guard";
import { searchTesters, chatRoster } from "../../../server/db";
import { json } from "../../../server/http";

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies }) => {
  const me = await requireTester(cookies);
  if (!me) return json({ ok: false }, 401);
  const q = (url.searchParams.get("q") || "").slice(0, 40);
  if (url.searchParams.get("roster")) return json({ ok: true, roster: await chatRoster() });
  return json({ ok: true, users: await searchTesters(q, me.id) });
};
