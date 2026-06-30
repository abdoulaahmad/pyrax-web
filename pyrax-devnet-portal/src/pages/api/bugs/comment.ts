// SPDX-License-Identifier: LicenseRef-Proprietary
// Add a comment to a bug. ?id=<bugId> body {body:"..."}. @mentions + the reporter get an in-app
// notification and an email. Author info is denormalized so team devs (from the team site) work too.
import type { APIRoute } from "astro";
import { requireTester, subjectOf } from "../../../server/guard";
import { addBugComment, getBug, bugReporter, testerByHandle, testerById, addNotification } from "../../../server/db";
import { json } from "../../../server/http";
import { can } from "../../../lib/permissions";
import { sendIssueNotify } from "../../../server/email";

export const prerender = false;

export const POST: APIRoute = async ({ url, request, cookies }) => {
  const me = await requireTester(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);
  if (!can(subjectOf(me), "issues.submit")) return json({ ok: false, error: "Forbidden." }, 403);
  const bugId = url.searchParams.get("id") || "";
  const b = await request.json().catch(() => ({}));
  const body = String(b?.body ?? "").trim();
  if (!bugId || !body) return json({ ok: false, error: "Missing comment." }, 400);

  await addBugComment(bugId, { id: me.id, name: me.display_name || me.handle, user: me.handle, admin: me.is_staff }, body);

  // Notify @mentions + the bug reporter (in-app + email). Fire-and-forget, deduped.
  const rep = await bugReporter(bugId);
  const notified = new Set<string>([me.id]);
  const who = me.handle ? "@" + me.handle : me.display_name;
  const mentions = [...new Set((body.match(/@([a-z0-9_]+)/gi) || []).map((m) => m.slice(1).toLowerCase()))];
  for (const h of mentions) {
    const t = await testerByHandle(h);
    if (t && !notified.has(t.id)) {
      notified.add(t.id);
      await addNotification(t.id, "mention", `${who} mentioned you`, `On "${rep?.title || "a bug report"}".`, "/app");
      void sendIssueNotify(t.email, `${who} mentioned you in the Issue Council`, `${who} mentioned you on the report "${rep?.title || ""}". Jump in and reply.`);
    }
  }
  if (rep && !notified.has(rep.tester_id)) {
    const reporter = await testerById(rep.tester_id);
    if (reporter) {
      await addNotification(reporter.id, "reply", `New reply on your bug`, `${who} commented on "${rep.title}".`, "/app");
      void sendIssueNotify(reporter.email, `New reply on your bug report`, `${who} commented on your report "${rep.title}".`);
    }
  }

  const bug = await getBug(bugId, me.id);
  return json({ ok: true, comments: bug?.comments || [] });
};
