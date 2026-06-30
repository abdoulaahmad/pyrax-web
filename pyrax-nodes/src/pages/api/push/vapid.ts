// SPDX-License-Identifier: LicenseRef-Proprietary
import type { APIRoute } from "astro";
import { pushPublicKey, pushConfigured } from "../../../server/push";

export const prerender = false;

export const GET: APIRoute = async () =>
  new Response(JSON.stringify({ ok: true, configured: pushConfigured(), publicKey: pushPublicKey() }), {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
