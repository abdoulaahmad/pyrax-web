// SPDX-License-Identifier: LicenseRef-Proprietary
// Declining the legal terms removes the tester from the program entirely: their account and every
// record referencing them are permanently deleted, and their session is cleared. The superuser
// cannot delete themselves this way.
import type { APIRoute } from "astro";
import { requireTester } from "../../../server/guard";
import { deleteTesterFully } from "../../../server/db";
import { SESSION_COOKIE } from "../../../server/auth";
import { json } from "../../../server/http";

export const prerender = false;

export const POST: APIRoute = async ({ cookies }) => {
  const me = await requireTester(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);
  if (me.is_superuser) return json({ ok: false, error: "The owner account cannot be removed this way." }, 403);

  const deleted = await deleteTesterFully(me.id);
  cookies.delete(SESSION_COOKIE, { path: "/" });
  return json({ ok: true, deleted });
};
