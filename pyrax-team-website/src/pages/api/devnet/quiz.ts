// SPDX-License-Identifier: LicenseRef-Proprietary
import type { APIRoute } from "astro";
import { requireUser, subjectOf } from "../../../server/guard";
import { json } from "../../../server/http";
import { can } from "../../../lib/permissions";
import {
  listDevnetQuizQuestions,
  saveDevnetQuizQuestion,
  deleteDevnetQuizQuestion,
} from "../../../server/devnet-db";
import { audit } from "../../../server/db";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false }, 401);
  if (!can(subjectOf(me), "devnet.manage")) return json({ ok: false, error: "Forbidden." }, 403);
  return json({ ok: true, questions: await listDevnetQuizQuestions() });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false }, 401);
  if (!can(subjectOf(me), "devnet.manage")) return json({ ok: false, error: "Forbidden." }, 403);
  const body = await request.json().catch(() => ({}));
  
  if (body.action === "save") {
    await saveDevnetQuizQuestion(body.question);
    await audit({ actorId: me.id, actorEmail: me.email, action: "devnet.quiz.save", detail: { questionId: body.question.id } });
  } else if (body.action === "delete") {
    await deleteDevnetQuizQuestion(body.id);
    await audit({ actorId: me.id, actorEmail: me.email, action: "devnet.quiz.delete", detail: { questionId: body.id } });
  } else {
    return json({ ok: false, error: "Invalid action." }, 400);
  }
  
  return json({ ok: true });
};
