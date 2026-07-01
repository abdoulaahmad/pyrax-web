// SPDX-License-Identifier: LicenseRef-Proprietary
//
// POST /api/tests/:id/submit — a tester submits their proof for a Product Test (docs §5). The server:
//   • requires a tester session + `campaigns.view`,
//   • rate-limits per tester (a submission is heavy: proof review + potential auto-award),
//   • enforces canTesterSubmit (the test is OPEN and every prereq slug has an ACCEPTED submission by
//     this tester) — returns the machine reason + missingPrereqs on failure,
//   • SANITIZES attachments against THIS tester's own presigned CDN prefix exactly like the Issue
//     Council validator (client url/type/hash are never trusted), keeping the per-step index + the
//     anti-fraud content hash,
//   • normalizes results to {stepIndex,pass,note} bounded to the test's steps,
//   • caps logs at 16000 chars,
//   • creates the submission at review_status 'submitted'.
// Returns { ok:true, submissionId } (201) or { ok:false, reason, missingPrereqs } for a gate failure.
import type { APIRoute } from "astro";
import { requireTester, subjectOf } from "../../../../server/guard";
import { canTesterSubmit, createSubmission, type SubmissionInput } from "../../../../server/db";
import { json } from "../../../../server/http";
import { rateLimited } from "../../../../server/ratelimit";
import { can } from "../../../../lib/permissions";
import { sanitizeAttachments } from "../../../../server/attachments";

export const prerender = false;

const MAX_LOGS = 16_000;
const MAX_NOTE = 2_000;
const MAX_ATTACHMENTS = 24; // a proof per step + a couple of extras; well above any seeded test's steps

/** Coerce the client `results` into the {stepIndex,pass,note?} shape the DB stores, bounded to the
 *  test's real step count so a client can't fabricate results for steps that don't exist. */
function normalizeResults(raw: unknown, stepCount: number): SubmissionInput["results"] {
  if (!Array.isArray(raw)) return [];
  const out: SubmissionInput["results"] = [];
  const seen = new Set<number>();
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const si = typeof o.stepIndex === "number" && Number.isFinite(o.stepIndex) ? Math.floor(o.stepIndex) : -1;
    if (si < 0 || si >= stepCount || seen.has(si)) continue;
    seen.add(si);
    out.push({
      stepIndex: si,
      pass: o.pass === true,
      ...(typeof o.note === "string" && o.note.trim() ? { note: o.note.slice(0, 600) } : {}),
    });
    if (out.length >= 200) break;
  }
  return out.sort((a, b) => a.stepIndex - b.stepIndex);
}

export const POST: APIRoute = async ({ params, request, cookies }) => {
  const me = await requireTester(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);
  if (!can(subjectOf(me), "campaigns.view")) return json({ ok: false, error: "Forbidden." }, 403);

  // ≤6 submissions/min/tester: a real run is minutes of work; this only brakes automated abuse.
  const limited = rateLimited(`test:submit:${me.id}`, 6, 60_000);
  if (limited) return limited;

  const testId = String(params.id || "");
  const gate = await canTesterSubmit(me.id, testId);
  if (!gate.ok) {
    const status = gate.reason === "not_found" ? 404 : 403;
    return json({ ok: false, reason: gate.reason, missingPrereqs: gate.missingPrereqs }, status);
  }
  const test = gate.test!;

  const b = await request.json().catch(() => ({} as any));

  // Attachments: accept ONLY those under this tester's own presigned CDN prefix, with a known kind.
  // The per-step index + content hash ride along (validated in sanitizeAttachment); the client url/type
  // are never trusted — this is the same stored-link-injection defense the Issue Council uses.
  const attachments = sanitizeAttachments(b?.attachments, me.id, process.env, MAX_ATTACHMENTS);

  const results = normalizeResults(b?.results, (test.steps || []).length);
  const logs = typeof b?.logs === "string" ? b.logs.slice(0, MAX_LOGS) : undefined;
  const notes = typeof b?.notes === "string" ? b.notes.slice(0, MAX_NOTE) : undefined;

  const { id: submissionId } = await createSubmission(me.id, testId, { results, attachments, logs, notes });
  return json({ ok: true, submissionId }, 201);
};
