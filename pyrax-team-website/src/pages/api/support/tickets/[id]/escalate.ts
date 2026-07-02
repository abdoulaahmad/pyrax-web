// SPDX-License-Identifier: LicenseRef-Proprietary
// Escalate a ticket to NEURAX Sentinel: the on-GPU brain analyzes the thread + diagnostics and posts
// its assessment back as an internal note (staff-only). (requires support.manage)
import type { APIRoute } from "astro";
import { requireUser, subjectOf } from "@/server/guard";
import { can } from "@/lib/permissions";
import { json } from "@/server/http";
import { audit } from "@/server/db";
import { getTicket, getTicketThread, addTicketMessage, addTicketEvent } from "@/server/devnet-db";

export const prerender = false;
const BRAIN = (process.env.SENTINEL_BACKEND_URL || "https://status.pyraxchain.com").replace(/\/+$/, "");
const SECRET = process.env.SENTINEL_ADMIN_SECRET || "";

export const POST: APIRoute = async ({ params, cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false, error: "Sign in required." }, 401);
  if (!can(subjectOf(me), "support.manage")) return json({ ok: false, error: "Forbidden." }, 403);
  if (!SECRET) return json({ ok: false, error: "Sentinel isn't configured." }, 503);
  const t = await getTicket(String(params.id || ""));
  if (!t) return json({ ok: false, error: "No such ticket." }, 404);

  const thread = await getTicketThread(t.id);
  const transcript = thread.messages.map((m: any) => `${m.author_name} (${m.author_kind}): ${m.body}`).join("\n").slice(0, 8000);
  const question = "You are NEURAX Sentinel assisting PYRAX support. Analyze this ticket and give staff, concisely: "
    + "(1) a one-line summary, (2) the most likely cause, (3) concrete next steps or a fix, "
    + `(4) whether it looks like a known/systemic issue.\n\nTicket #${t.code} — ${t.subject}\n`
    + `Category: ${t.category} · Priority: ${t.priority} · Source: ${t.source} · App ${t.app_version || "?"} on ${t.os || "?"}`;
  const context = `Ticket thread:\n${transcript}\n\nDiagnostics:\n${t.snapshot ? JSON.stringify(t.snapshot).slice(0, 4000) : "(none)"}`;

  let answer = "";
  try {
    const r = await fetch(`${BRAIN}/api/nova/ask`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${SECRET}` },
      body: JSON.stringify({ question, context }),
      signal: AbortSignal.timeout(130_000),
    });
    if (!r.ok) return json({ ok: false, error: `Sentinel returned ${r.status}.` }, 502);
    const j = await r.json().catch(() => ({}));
    answer = String(j?.answer ?? "").trim();
  } catch {
    return json({ ok: false, error: "Couldn't reach the Sentinel brain." }, 502);
  }
  if (!answer) return json({ ok: false, error: "Sentinel returned no analysis." }, 502);

  const msg = await addTicketMessage(t.id, { authorId: "sentinel", authorName: "NEURAX Sentinel", authorKind: "sentinel", body: answer, internal: true });
  await addTicketEvent(t.id, { actorId: me.id, actorName: me.display_name || me.email, kind: "escalate", detail: {} });
  await audit({ actorId: me.id, actorEmail: me.email, action: "support.ticket.escalate", targetId: t.id, detail: { code: t.code } });
  return json({ ok: true, message: { ...msg, author_name: "NEURAX Sentinel", author_kind: "sentinel", body: answer, internal: true } });
};
