// SPDX-License-Identifier: LicenseRef-Proprietary
// Chat token for a team member (joins the shared Devnet community chat as an Admin). Requires the
// devnet.chat permission + a chat username set in their profile.
import type { APIRoute } from "astro";
import { requireUser, subjectOf } from "../../../server/guard";
import { json } from "../../../server/http";
import { can } from "../../../lib/permissions";
import { signChatToken } from "../../../lib/chat-token";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);
  if (!can(subjectOf(me), "devnet.chat")) return json({ ok: false, error: "Forbidden." }, 403);
  if (!me.chat_username) return json({ ok: false, error: "Set a chat username in your profile first." }, 400);
  const token = signChatToken({ uid: me.id, name: me.display_name || me.chat_username, user: me.chat_username, admin: true, role: "admin" });
  return json({ ok: true, token, wsUrl: process.env.CHAT_WS_URL || "ws://localhost:8788", giphy: !!process.env.GIPHY_API_KEY });
};
