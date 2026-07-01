// SPDX-License-Identifier: LicenseRef-Proprietary
import type { APIRoute } from "astro";
import { requireTester, subjectOf } from "../../../server/guard";
import { listBugs, createBug } from "../../../server/db";
import { json } from "../../../server/http";
import { rateLimited } from "../../../server/ratelimit";
import { can } from "../../../lib/permissions";
import { sanitizeAttachments } from "../../../server/attachments";

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies }) => {
  const me = await requireTester(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);
  if (!can(subjectOf(me), "issues.view")) return json({ ok: false, error: "Forbidden." }, 403);
  const bugs = await listBugs({ status: url.searchParams.get("status") || undefined, sort: url.searchParams.get("sort") || undefined });
  return json({ ok: true, bugs });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const me = await requireTester(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);
  if (!can(subjectOf(me), "issues.submit")) return json({ ok: false, error: "Forbidden." }, 403);
  const limited = rateLimited(`bug:create:${me.id}`, 10, 60_000); // ≤10 new reports/min/tester
  if (limited) return limited;
  const b = await request.json().catch(() => ({}));
  const title = String(b?.title ?? "").trim();
  if (title.length < 5) return json({ ok: false, errors: { title: "Give the bug a clear title (5+ chars)." } }, 422);
  const reproSteps = String(b?.reproSteps ?? "").trim();
  if (reproSteps.length < 5) return json({ ok: false, errors: { reproSteps: "Add the steps to reproduce." } }, 422);
  // Attachments are rendered to every viewer (incl. staff) as <a href>/<img src>/<video src>, so the
  // client-supplied url/type cannot be trusted. Accept only attachments whose url is under THIS tester's
  // own presigned CDN prefix and whose type is a known kind — blocks stored off-CDN link injection.
  const attachments = sanitizeAttachments(b?.attachments, me.id);
  const bug = await createBug(me.id, {
    title, description: String(b?.description ?? ""), reproSteps,
    expected: String(b?.expected ?? ""), actual: String(b?.actual ?? ""),
    severity: String(b?.severity ?? "medium"), component: String(b?.component ?? ""),
    environment: typeof b?.environment === "object" && b.environment ? b.environment : {},
    attachments,
  });
  return json({ ok: true, bug }, 201);
};
