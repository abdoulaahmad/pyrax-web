// SPDX-License-Identifier: LicenseRef-Proprietary
// Mint a chat token for the signed-in tester. Username = their Telegram @handle (set at whitelist).
import type { APIRoute } from "astro";
import { requireTester } from "../../../server/guard";
import { json } from "../../../server/http";
import { signChatToken } from "../../../lib/chat-token";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const me = await requireTester(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);
  const role = me.is_staff ? "admin" : (me.permissions.includes("community.support") ? "support" : "tester");
  const token = signChatToken({ uid: me.id, name: me.display_name || me.handle || "tester", user: me.handle || "", admin: me.is_staff, role });
  const wsUrl = process.env.CHAT_WS_URL || "ws://localhost:8788";
  const giphy = !!process.env.GIPHY_API_KEY;
  return json({ ok: true, token, wsUrl, giphy });
};
