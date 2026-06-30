// SPDX-License-Identifier: LicenseRef-Proprietary
import type { APIRoute } from "astro";
import { requireUser, subjectOf } from "../../../server/guard";
import { listDevnetConversations, createDevnetConversation, devnetTesterByHandle } from "../../../server/devnet-db";
import { json } from "../../../server/http";
import { can } from "../../../lib/permissions";

export const prerender = false;
const meMember = (me: any) => ({ id: me.id, user: me.chat_username || "", name: me.display_name || "", admin: true });

export const GET: APIRoute = async ({ cookies }) => {
  const me = await requireUser(cookies);
  if (!me || !can(subjectOf(me), "devnet.chat")) return json({ ok: false }, 403);
  return json({ ok: true, conversations: await listDevnetConversations(me.id), me: meMember(me) });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const me = await requireUser(cookies);
  if (!me || !can(subjectOf(me), "devnet.chat")) return json({ ok: false }, 403);
  const b = await request.json().catch(() => ({}));
  const type = b?.type === "dm" ? "dm" : "group";
  const handles: string[] = Array.isArray(b?.memberHandles) ? b.memberHandles.map((h: any) => String(h).replace(/^@/, "")).slice(0, 20) : [];
  const members: any[] = [];
  for (const h of handles) { const t = await devnetTesterByHandle(h); if (t && t.id !== me.id && !members.find((m) => m.id === t.id)) members.push({ id: t.id, user: t.handle, name: t.display_name, admin: t.is_staff }); }
  if (!members.length) return json({ ok: false, error: "Add at least one valid tester." }, 422);
  if (type === "dm" && members.length !== 1) return json({ ok: false, error: "A DM is between exactly two people." }, 422);
  const id = await createDevnetConversation(type, type === "group" ? (String(b?.name ?? "").trim() || "Group chat") : "", meMember(me), members);
  return json({ ok: true, id });
};
