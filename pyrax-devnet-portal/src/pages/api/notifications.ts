// SPDX-License-Identifier: LicenseRef-Proprietary
// In-app notifications for the signed-in tester (mentions, replies, accepted bugs, releases).
import type { APIRoute } from "astro";
import { requireTester } from "../../server/guard";
import { listNotifications, unreadCount, markNotificationsRead } from "../../server/db";
import { json } from "../../server/http";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const me = await requireTester(cookies);
  if (!me) return json({ ok: false }, 401);
  return json({ ok: true, notifications: await listNotifications(me.id), unread: await unreadCount(me.id) });
};

export const POST: APIRoute = async ({ cookies }) => {
  const me = await requireTester(cookies);
  if (!me) return json({ ok: false }, 401);
  await markNotificationsRead(me.id);
  return json({ ok: true });
};
