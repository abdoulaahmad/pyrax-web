// SPDX-License-Identifier: LicenseRef-Proprietary
// Change a ticket's status / priority / category / assignee. Each real change records a lifecycle
// event; a resolve emails the reporter. (requires support.manage)
import type { APIRoute } from "astro";
import { requireUser, subjectOf } from "@/server/guard";
import { can } from "@/lib/permissions";
import { json } from "@/server/http";
import { audit } from "@/server/db";
import { getTicket, updateTicketFields } from "@/server/devnet-db";
import { sendEmail } from "@/server/email";

export const prerender = false;

export const POST: APIRoute = async ({ params, request, cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false, error: "Sign in required." }, 401);
  if (!can(subjectOf(me), "support.manage")) return json({ ok: false, error: "Forbidden." }, 403);
  const id = String(params.id || "");
  const before = await getTicket(id);
  if (!before) return json({ ok: false, error: "No such ticket." }, 404);
  const b = await request.json().catch(() => ({}));
  const t = await updateTicketFields(id, {
    status: typeof b?.status === "string" ? b.status : undefined,
    priority: typeof b?.priority === "string" ? b.priority : undefined,
    category: typeof b?.category === "string" ? b.category : undefined,
    assigneeId: b?.assignee_id === null ? null : (typeof b?.assignee_id === "string" ? b.assignee_id : undefined),
    assigneeName: b?.assignee_id === null ? null : (typeof b?.assignee_name === "string" ? b.assignee_name : undefined),
  }, { id: me.id, name: me.display_name || me.email });
  if (!t) return json({ ok: false, error: "No such ticket." }, 404);
  await audit({ actorId: me.id, actorEmail: me.email, action: "support.ticket.update", targetId: id, detail: { status: t.status, priority: t.priority, category: t.category, assignee: t.assignee_name } });

  if (t.status === "resolved" && before.status !== "resolved" && t.reporter_email) {
    void sendEmail(t.reporter_email, `Resolved: [#${t.code}] ${t.subject}`,
      `<p>Your PYRAX support ticket <strong>#${t.code}</strong> has been marked <strong>resolved</strong>. If it isn't fully fixed, reply to this email to reopen it.</p>`).catch(() => {});
  }
  return json({ ok: true, ticket: t });
};
