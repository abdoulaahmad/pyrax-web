// SPDX-License-Identifier: LicenseRef-Proprietary
// App/CLI: redeem a pairing code → receive a node heartbeat token. Public (validated by the code).
// On a successful first connect, the tester may claim a Founding Tester slot (first N + bonus).
import type { APIRoute } from "astro";
import { pairNode, claimFounding } from "../../../server/db";
import { json } from "../../../server/http";
import { REWARDS } from "../../../lib/rewards";

export const prerender = false;

// The live node-status WebSocket the paired node connects to (?token=<nodeToken>). Returned in the
// redeem response so the CLIENT is told where to report — "the code picks the dashboard": a code minted
// by THIS portal hands back THIS portal's status WS. Overridable per environment.
const STATUS_WS_URL = process.env.NODE_STATUS_WS_URL || "wss://devnet.pyraxchain.com/__nodews";

export const POST: APIRoute = async ({ request }) => {
  const b = await request.json().catch(() => ({}));
  const code = String(b?.code ?? "");
  if (!code) return json({ ok: false, error: "Missing pairing code." }, 400);
  const r = await pairNode(code, { label: b?.label, app: b?.app, appVersion: b?.appVersion, nodeVersion: b?.nodeVersion });
  if (!r.ok) {
    const msg = r.reason === "expired" ? "This pairing code has expired." : r.reason === "used" ? "This pairing code was already used." : "Invalid pairing code.";
    return json({ ok: false, error: msg }, 400);
  }
  const founding = await claimFounding(r.testerId, REWARDS.foundingTester.bonus, REWARDS.foundingTester.count);
  // The app/CLI stores nodeToken and either (a) opens the live status WS at statusWsUrl?token=<token>,
  // or (b) falls back to POST /api/node/heartbeat with `Authorization: Bearer <token>`.
  return json({ ok: true, nodePk: r.nodePk, nodeToken: r.nodeToken, heartbeatEverySec: 30, statusWsUrl: STATUS_WS_URL, foundingRank: founding });
};
