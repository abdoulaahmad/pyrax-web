// SPDX-License-Identifier: LicenseRef-Proprietary
// The signed-in user's private conversations (DMs + group chats). GET lists them; POST creates one.
import type { APIRoute } from "astro";
import { requireTester } from "../../../server/guard";
import { listConversations, createConversation, testerByHandle } from "../../../server/db";
import { json } from "../../../server/http";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const me = await requireTester(cookies);
  if (!me) return json({ ok: false }, 401);
  const conversations = await listConversations(me.id);
  return json({ ok: true, conversations, me: { id: me.id, user: me.handle, name: me.display_name, admin: me.is_staff } });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const me = await requireTester(cookies);
  if (!me) return json({ ok: false }, 401);
  const b = await request.json().catch(() => ({}));
  const type = b?.type === "dm" ? "dm" : "group";
  const handles: string[] = Array.isArray(b?.memberHandles) ? b.memberHandles.map((h: any) => String(h).replace(/^@/, "")).slice(0, 20) : [];
  const members: any[] = [];
  for (const h of handles) {
    const t = await testerByHandle(h);
    if (t && t.id !== me.id && !members.find((m) => m.id === t.id)) members.push({ id: t.id, user: t.handle, name: t.display_name, admin: t.is_staff });
  }
  if (!members.length) return json({ ok: false, error: "Add at least one valid member." }, 422);
  if (type === "dm" && members.length !== 1) return json({ ok: false, error: "A DM is between exactly two people." }, 422);
  const name = type === "group" ? String(b?.name ?? "").trim() || "Group chat" : "";
  const creator = { id: me.id, user: me.handle, name: me.display_name, admin: me.is_staff };
  const id = await createConversation(type, name, creator, members);
  return json({ ok: true, id });
};
