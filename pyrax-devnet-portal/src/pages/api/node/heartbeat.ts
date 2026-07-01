// SPDX-License-Identifier: LicenseRef-Proprietary
// App/CLI: periodic node heartbeat. Auth: `Authorization: Bearer <nodeToken>` from pairing.
// Updates the node's liveness + telemetry; the portal computes uptime from heartbeat presence.
import type { APIRoute } from "astro";
import { nodeByToken, recordHeartbeat } from "../../../server/db";
import { json } from "../../../server/http";
import { rateLimited, ipKey } from "../../../server/ratelimit";

export const prerender = false;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  // Public endpoint: throttle by source IP BEFORE the DB token lookup so a flood of bad tokens can't
  // hammer the database. Honest nodes heartbeat ~every 30s, so even a generous cap is never hit.
  const ipLimited = rateLimited(`hb:ip:${ipKey(request, clientAddress)}`, 120, 60_000);
  if (ipLimited) return ipLimited;
  const auth = request.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) return json({ ok: false, error: "Missing node token." }, 401);
  const node = await nodeByToken(token);
  if (!node) return json({ ok: false, error: "Invalid node token." }, 401);
  // Per-node cap: one node shouldn't heartbeat more than a few times a minute.
  const nodeLimited = rateLimited(`hb:node:${node.node_pk}`, 10, 60_000);
  if (nodeLimited) return nodeLimited;

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
