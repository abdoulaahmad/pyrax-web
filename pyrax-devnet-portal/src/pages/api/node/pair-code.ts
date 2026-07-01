// SPDX-License-Identifier: LicenseRef-Proprietary
// Tester-initiated: mint a short pairing code to enter in the Inferno app / CLI to link a node.
import type { APIRoute } from "astro";
import { requireTester } from "../../../server/guard";
import { createPairingCode } from "../../../server/db";
import { json } from "../../../server/http";
import { rateLimited, ipKey } from "../../../server/ratelimit";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  const me = await requireTester(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);
  // Cap code minting per-tester and per-IP (a code is a credential to link a node).
  const limited = rateLimited(`paircode:${me.id}`, 10, 10 * 60_000) || rateLimited(`paircode:ip:${ipKey(request, clientAddress)}`, 30, 10 * 60_000);
  if (limited) return limited;
  const b = await request.json().catch(() => ({}));
  const label = typeof b?.label === "string" ? b.label.slice(0, 60) : undefined;
  const { code, expiresAt } = await createPairingCode(me.id, label);
  return json({ ok: true, code, expiresAt, expiresInSec: Math.round((expiresAt - Date.now()) / 1000) });
};
