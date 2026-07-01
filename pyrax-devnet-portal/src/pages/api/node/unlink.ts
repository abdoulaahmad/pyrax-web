// SPDX-License-Identifier: LicenseRef-Proprietary
// Node lifecycle (tester-owned): remove a linked node (revoking its heartbeat token) or rotate that
// token. Auth'd by the tester session; the DB operations are scoped to the owner so a tester can only
// act on their own nodes. Body: { nodePk: string, action?: "remove" | "rotate" } (default "remove").
import type { APIRoute } from "astro";
import { requireTester } from "../../../server/guard";
import { unlinkNode, rotateNodeToken } from "../../../server/db";
import { json } from "../../../server/http";
import { rateLimited } from "../../../server/ratelimit";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const me = await requireTester(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);
  const limited = rateLimited(`node:lifecycle:${me.id}`, 30, 60_000);
  if (limited) return limited;

  const b = await request.json().catch(() => ({}));
  const nodePk = typeof b?.nodePk === "string" ? b.nodePk : "";
  const action = b?.action === "rotate" ? "rotate" : "remove";
  if (!nodePk) return json({ ok: false, error: "Missing node id." }, 400);

  if (action === "rotate") {
    const r = await rotateNodeToken(me.id, nodePk);
    if (!r) return json({ ok: false, error: "Node not found." }, 404);
    // The new token is shown ONCE — the app/CLI must re-pair with it. The old token is now invalid.
    return json({ ok: true, action, nodePk: r.nodePk, nodeToken: r.nodeToken });
  }

  const removed = await unlinkNode(me.id, nodePk);
  if (!removed) return json({ ok: false, error: "Node not found." }, 404);
  return json({ ok: true, action, nodePk });
};
