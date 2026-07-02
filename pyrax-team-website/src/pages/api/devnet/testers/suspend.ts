// SPDX-License-Identifier: LicenseRef-Proprietary
// Kick/ban (suspend) or restore a devnet tester. A suspended tester can no longer log in to the devnet
// site and any live session is wiped immediately. (requires devnet.manage)
import type { APIRoute } from "astro";
import { requireUser, subjectOf } from "../../../../server/guard";
import { setDevnetTesterStatus } from "../../../../server/devnet-db";
import { audit } from "../../../../server/db";
import { json } from "../../../../server/http";
import { can } from "../../../../lib/permissions";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);
  if (!can(subjectOf(me), "devnet.manage")) return json({ ok: false, error: "Forbidden." }, 403);

  const b = await request.json().catch(() => ({}));
  const email = String(b?.email ?? "").trim().toLowerCase();
  const suspend = b?.suspend !== false; // default to suspend; pass { suspend: false } to restore
  if (!email) return json({ ok: false, error: "Missing email." }, 422);

  const n = await setDevnetTesterStatus(email, suspend ? "suspended" : "active");
  if (!n) return json({ ok: false, error: "No such tester." }, 404);
  await audit({ actorId: me.id, actorEmail: me.email, action: suspend ? "devnet.tester.suspend" : "devnet.tester.restore", targetEmail: email, detail: {} });
  return json({ ok: true, status: suspend ? "suspended" : "active" });
};
