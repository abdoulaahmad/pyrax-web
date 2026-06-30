// SPDX-License-Identifier: LicenseRef-Proprietary
// Store a Web Push subscription for the signed-in tester (release/notification push).
import type { APIRoute } from "astro";
import { requireTester } from "../../../server/guard";
import { savePushSub } from "../../../server/db";
import { json } from "../../../server/http";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const me = await requireTester(cookies);
  if (!me) return json({ ok: false }, 401);
  const b = await request.json().catch(() => ({}));
  const sub = b?.subscription;
  if (!sub?.endpoint || !sub?.keys) return json({ ok: false, error: "Bad subscription." }, 400);
  await savePushSub(me.id, sub.endpoint, sub.keys);
  return json({ ok: true });
};
