// SPDX-License-Identifier: LicenseRef-Proprietary
// The signed-in tester's own executed agreements (their NDA + latest T&C), so they can view the
// copy they signed — name, digital signature, IP, and date — from their own account.
import type { APIRoute } from "astro";
import { requireTester } from "../../../server/guard";
import { getMyLegalAcceptances } from "../../../server/db";
import { json } from "../../../server/http";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const me = await requireTester(cookies);
  if (!me) return json({ ok: false }, 401);
  return json({ ok: true, ...(await getMyLegalAcceptances(me.id)) });
};
