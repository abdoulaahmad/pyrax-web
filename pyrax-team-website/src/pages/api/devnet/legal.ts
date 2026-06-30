// SPDX-License-Identifier: LicenseRef-Proprietary
// Team compliance view: every signed devnet NDA / Alpha T&C with the signer's identity, IP, and time.
import type { APIRoute } from "astro";
import { requireUser, subjectOf } from "../../../server/guard";
import { listDevnetLegalAcceptances } from "../../../server/devnet-db";
import { json } from "../../../server/http";
import { can } from "../../../lib/permissions";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const me = await requireUser(cookies);
  if (!me || !can(subjectOf(me), "devnet.manage")) return json({ ok: false }, 403);
  return json({ ok: true, acceptances: await listDevnetLegalAcceptances() });
};
