// SPDX-License-Identifier: LicenseRef-Proprietary
// App/CLI: redeem a pairing code → receive a node heartbeat token. Public (validated by the code).
// On a successful first connect, the tester may claim a Founding Tester slot (first N + bonus).
import type { APIRoute } from "astro";
import { pairNode, claimFounding } from "../../../server/db";
import { json } from "../../../server/http";
import { REWARDS } from "../../../lib/rewards";

export const prerender = false;

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
  // The app stores nodeToken and sends it as `Authorization: Bearer <token>` on every heartbeat.
  return json({ ok: true, nodePk: r.nodePk, nodeToken: r.nodeToken, heartbeatEverySec: 30, foundingRank: founding });
};
