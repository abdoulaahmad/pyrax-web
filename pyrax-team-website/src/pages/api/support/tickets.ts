// SPDX-License-Identifier: LicenseRef-Proprietary
// Support ticket queue: GET list (filters + pagination + counts + assignee options + stats) and
// POST a staff-opened manual ticket. (requires support.manage)
import type { APIRoute } from "astro";
import { requireUser, subjectOf } from "@/server/guard";
import { can } from "@/lib/permissions";
import { json } from "@/server/http";
import { audit, listPermissionHolders } from "@/server/db";
import { listTickets, ticketStats, openTicket, addTicketWatcher, TK_PRIORITY, TK_CATEGORY } from "@/server/devnet-db";

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false, error: "Sign in required." }, 401);
  if (!can(subjectOf(me), "support.manage")) return json({ ok: false, error: "Forbidden." }, 403);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const pageSize = 20;
  try {
    const { rows, total, counts } = await listTickets({
      status: url.searchParams.get("status") || undefined,
      priority: url.searchParams.get("priority") || undefined,
      category: url.searchParams.get("category") || undefined,
      assignee: url.searchParams.get("assignee") || undefined,
      source: url.searchParams.get("source") || undefined,
      q: url.searchParams.get("q") || undefined,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
    const [stats, assignees] = await Promise.all([ticketStats(), listPermissionHolders("support.manage")]);
    return json({ ok: true, tickets: rows, total, page, pageSize, counts, stats, assignees, me: { id: me.id, name: me.display_name || me.email } });
  } catch (e) {
    console.error("[support/tickets]", (e as Error)?.message || e);
    return json({ ok: false, error: "Couldn't load tickets." }, 500);
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false, error: "Sign in required." }, 401);
  if (!can(subjectOf(me), "support.manage")) return json({ ok: false, error: "Forbidden." }, 403);
  const b = await request.json().catch(() => ({}));
  const subject = String(b?.subject || "").trim();
  if (!subject) return json({ ok: false, error: "A subject is required." }, 422);
  const { id, code } = await openTicket({
    subject,
    body: typeof b?.body === "string" ? b.body : undefined,
    category: TK_CATEGORY.includes(String(b?.category)) ? String(b.category) : "general",
    priority: TK_PRIORITY.includes(String(b?.priority)) ? String(b.priority) : "normal",
    source: "manual",
    reporterEmail: typeof b?.reporter_email === "string" ? b.reporter_email.slice(0, 160) : undefined,
    reporterName: typeof b?.reporter_name === "string" ? b.reporter_name.slice(0, 80) : undefined,
    actorId: me.id,
    actorName: me.display_name || me.email,
  });
  await addTicketWatcher(id, me.id, me.display_name || me.email);
  await audit({ actorId: me.id, actorEmail: me.email, action: "support.ticket.open", targetId: id, detail: { code, subject } });
  return json({ ok: true, id, code });
};
