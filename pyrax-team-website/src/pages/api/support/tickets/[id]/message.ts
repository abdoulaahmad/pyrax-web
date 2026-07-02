// SPDX-License-Identifier: LicenseRef-Proprietary
// Append a message to a ticket: a public reply (emails the reporter) or an internal note (staff-only).
// (requires support.manage)
import type { APIRoute } from "astro";
import { requireUser, subjectOf } from "@/server/guard";
import { can } from "@/lib/permissions";
import { json } from "@/server/http";
import { audit } from "@/server/db";
import { getTicket, addTicketMessage } from "@/server/devnet-db";
import { sendEmail } from "@/server/email";

export const prerender = false;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

export const POST: APIRoute = async ({ params, request, cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false, error: "Sign in required." }, 401);
  if (!can(subjectOf(me), "support.manage")) return json({ ok: false, error: "Forbidden." }, 403);
  const t = await getTicket(String(params.id || ""));
  if (!t) return json({ ok: false, error: "No such ticket." }, 404);
  const b = await request.json().catch(() => ({}));
  const body = String(b?.body || "").trim();
  const internal = !!b?.internal;
  const attachments = Array.isArray(b?.attachments)
    ? b.attachments.filter((a: any) => a && typeof a.url === "string" && /^https:\/\//.test(a.url)).slice(0, 12)
        .map((a: any) => ({ url: String(a.url).slice(0, 600), name: String(a.name || "file").slice(0, 120), mime: String(a.mime || "").slice(0, 80), size: Number(a.size) || 0 }))
    : undefined;
  if (!body && !(attachments && attachments.length)) return json({ ok: false, error: "Message can't be empty." }, 422);

  const msg = await addTicketMessage(t.id, { authorId: me.id, authorName: me.display_name || me.email, authorKind: "staff", body, internal, attachments });
  await audit({ actorId: me.id, actorEmail: me.email, action: internal ? "support.ticket.note" : "support.ticket.reply", targetId: t.id, detail: { code: t.code } });

  if (!internal && t.reporter_email) {
    const html = `<p>The PYRAX support team replied to your ticket <strong>#${t.code}</strong>:</p>`
      + `<blockquote style="border-left:3px solid #f58622;padding-left:12px;color:#333;margin:12px 0">${esc(body).replace(/\n/g, "<br>")}</blockquote>`
      + `<p style="color:#666;font-size:13px">Reply to this email (keep <strong>#${t.code}</strong> in the subject) and we'll pick it up.</p>`;
    void sendEmail(t.reporter_email, `Re: [#${t.code}] ${t.subject}`, html).catch(() => {});
  }
  return json({ ok: true, message: { ...msg, author_name: me.display_name || me.email, author_kind: "staff", body, internal, attachments: attachments || null } });
};
