// SPDX-License-Identifier: LicenseRef-Proprietary
// Expose the VAPID public key so the browser can subscribe to Web Push.
import type { APIRoute } from "astro";
import { requireTester } from "../../../server/guard";
import { json } from "../../../server/http";
import { VAPID_PUBLIC, pushConfigured } from "../../../server/push";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const me = await requireTester(cookies);
  if (!me) return json({ ok: false }, 401);
  return json({ ok: true, publicKey: VAPID_PUBLIC, configured: pushConfigured() });
};
