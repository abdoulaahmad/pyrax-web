// SPDX-License-Identifier: LicenseRef-Proprietary
// Open a support ticket from the node apps + CLI ("send logs → ticket") or anonymous web intake.
// Rate-limited per IP; the client pre-redacts the body/snapshot. Attachments are already-uploaded
// Spaces URLs. The team portal handles the ticket from here (reply, assign, resolve).
import type { APIRoute } from "astro";
import { createTicket, SUPERUSER_EMAIL } from "../../../server/db";
import { sendIssueNotify } from "../../../server/email";
import { json } from "../../../server/http";
import { rateLimited, ipKey } from "../../../server/ratelimit";

export const prerender = false;
const CATEGORIES = new Set(["general", "node", "mining", "wallet", "account", "bug", "other"]);
const PRIORITIES = new Set(["low", "normal", "high", "urgent"]);

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const limited = rateLimited(`tkt:ip:${ipKey(request, clientAddress)}`, 12, 60_000);
  if (limited) return limited;

  const b = await request.json().catch(() => ({}));
  const subject = String(b?.subject ?? "").trim();
  if (!subject) return json({ ok: false, error: "missing subject" }, 400);

  const attachments = Array.isArray(b?.attachments)
    ? b.attachments
        .filter((a: any) => a && typeof a.url === "string" && /^https:\/\//.test(a.url))
        .slice(0, 12)
        .map((a: any) => ({ url: String(a.url).slice(0, 600), name: String(a.name || "attachment").slice(0, 120), mime: String(a.mime || "").slice(0, 80), size: Number(a.size) || 0 }))
    : undefined;

  try {
    const { id, code } = await createTicket({
      subject,
      body: typeof b?.body === "string" ? b.body : undefined,
      category: CATEGORIES.has(String(b?.category)) ? String(b.category) : "general",
      priority: PRIORITIES.has(String(b?.priority)) ? String(b.priority) : "normal",
      source: typeof b?.source === "string" ? b.source.slice(0, 24) : "web",
      reporterEmail: typeof b?.email === "string" ? b.email.slice(0, 160) : undefined,
      reporterName: typeof b?.name === "string" ? b.name.slice(0, 80) : undefined,
      appVersion: typeof b?.app_version === "string" ? b.app_version.slice(0, 24) : undefined,
      os: typeof b?.os === "string" ? b.os.slice(0, 24) : undefined,
      snapshot: b?.snapshot && typeof b.snapshot === "object" ? b.snapshot : undefined,
      attachments,
    });
    // Best-effort: alert the team a new ticket arrived (they manage it in the team portal → Support).
    const cat = CATEGORIES.has(String(b?.category)) ? String(b.category) : "general";
    const pri = PRIORITIES.has(String(b?.priority)) ? String(b.priority) : "normal";
    const src = typeof b?.source === "string" ? b.source : "web";
    void sendIssueNotify(SUPERUSER_EMAIL, `New support ticket #${code}`, `${subject} — ${cat} / ${pri} (via ${src}). Manage it in the team portal → Support Tickets.`).catch(() => {});
    return json({ ok: true, id, code });
  } catch (e) {
    console.error("[support/ticket]", (e as Error)?.message || e);
    return json({ ok: false, error: "Couldn't open the ticket." }, 500);
  }
};
