// SPDX-License-Identifier: LicenseRef-Proprietary
import type { APIRoute } from "astro";
import { requireTester, subjectOf } from "../../../server/guard";
import { listBugs, createBug } from "../../../server/db";
import { json } from "../../../server/http";
import { can } from "../../../lib/permissions";

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
  const b = await request.json().catch(() => ({}));
  const title = String(b?.title ?? "").trim();
  if (title.length < 5) return json({ ok: false, errors: { title: "Give the bug a clear title (5+ chars)." } }, 422);
  const reproSteps = String(b?.reproSteps ?? "").trim();
  if (reproSteps.length < 5) return json({ ok: false, errors: { reproSteps: "Add the steps to reproduce." } }, 422);
  const attachments = Array.isArray(b?.attachments) ? b.attachments.filter((a: any) => a && typeof a.url === "string").slice(0, 8) : [];
  const bug = await createBug(me.id, {
    title, description: String(b?.description ?? ""), reproSteps,
    expected: String(b?.expected ?? ""), actual: String(b?.actual ?? ""),
    severity: String(b?.severity ?? "medium"), component: String(b?.component ?? ""),
    environment: typeof b?.environment === "object" && b.environment ? b.environment : {},
    attachments,
  });
  return json({ ok: true, bug }, 201);
};
