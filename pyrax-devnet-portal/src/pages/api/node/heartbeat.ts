// SPDX-License-Identifier: LicenseRef-Proprietary
// App/CLI: periodic node heartbeat. Auth: `Authorization: Bearer <nodeToken>` from pairing.
// Updates the node's liveness + telemetry; the portal computes uptime from heartbeat presence.
import type { APIRoute } from "astro";
import { nodeByToken, recordHeartbeat } from "../../../server/db";
import { json } from "../../../server/http";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const auth = request.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) return json({ ok: false, error: "Missing node token." }, 401);
  const node = await nodeByToken(token);
  if (!node) return json({ ok: false, error: "Invalid node token." }, 401);

  const b = await request.json().catch(() => ({}));
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.floor(v) : undefined);
  await recordHeartbeat(node.tester_id, node.node_pk, {
    app: typeof b?.app === "string" ? b.app.slice(0, 24) : undefined,
    appVersion: typeof b?.appVersion === "string" ? b.appVersion.slice(0, 24) : undefined,
    nodeVersion: typeof b?.nodeVersion === "string" ? b.nodeVersion.slice(0, 24) : undefined,
    height: num(b?.height), peers: num(b?.peers),
  });
  return json({ ok: true, nextSec: 30 });
};
