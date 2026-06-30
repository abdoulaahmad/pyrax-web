// SPDX-License-Identifier: LicenseRef-Proprietary
// Tester-initiated: mint a short pairing code to enter in the Inferno app / CLI to link a node.
import type { APIRoute } from "astro";
import { requireTester } from "../../../server/guard";
import { createPairingCode } from "../../../server/db";
import { json } from "../../../server/http";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const me = await requireTester(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);
  const b = await request.json().catch(() => ({}));
  const label = typeof b?.label === "string" ? b.label.slice(0, 60) : undefined;
  const { code, expiresAt } = await createPairingCode(me.id, label);
  return json({ ok: true, code, expiresAt, expiresInSec: Math.round((expiresAt - Date.now()) / 1000) });
};
