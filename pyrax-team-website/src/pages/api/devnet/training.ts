// SPDX-License-Identifier: LicenseRef-Proprietary
import type { APIRoute } from "astro";
import { requireUser, subjectOf } from "../../../server/guard";
import { json } from "../../../server/http";
import { can } from "../../../lib/permissions";
import {
  listDevnetTrainingLessons,
  saveDevnetTrainingLesson,
  deleteDevnetTrainingLesson,
} from "../../../server/devnet-db";
import { audit } from "../../../server/db";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false }, 401);
  if (!can(subjectOf(me), "devnet.manage")) return json({ ok: false, error: "Forbidden." }, 403);
  return json({ ok: true, lessons: await listDevnetTrainingLessons() });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false }, 401);
  if (!can(subjectOf(me), "devnet.manage")) return json({ ok: false, error: "Forbidden." }, 403);
  const body = await request.json().catch(() => ({}));
  
  if (body.action === "save") {
    await saveDevnetTrainingLesson(body.lesson);
    await audit({ actorId: me.id, actorEmail: me.email, action: "devnet.training.save", detail: { lessonId: body.lesson.id } });
  } else if (body.action === "delete") {
    await deleteDevnetTrainingLesson(body.id);
    await audit({ actorId: me.id, actorEmail: me.email, action: "devnet.training.delete", detail: { lessonId: body.id } });
  } else {
    return json({ ok: false, error: "Invalid action." }, 400);
  }
  
  return json({ ok: true });
};
