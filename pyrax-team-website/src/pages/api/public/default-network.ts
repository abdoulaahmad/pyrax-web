// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Public (no-auth) read of the cross-site default network chosen on the Network Management page.
// The marketing site (pyrax-website) and the block explorer fetch this to decide which network a
// first-time visitor sees before they pick one themselves. Only the default-network key is exposed
// (one of seed|forge|rise|one) — nothing sensitive. GET is CSRF-safe (see middleware); CORS is open so
// any PYRAX origin can read it. Falls back to the stored default if the DB is briefly unreachable.
import type { APIRoute } from "astro";
import { getNodesSettings } from "../../../server/nodes-db";

export const prerender = false;

export const GET: APIRoute = async () => {
  let def = "forge";
  try {
    def = (await getNodesSettings()).defaultNetwork || "forge";
  } catch {
    /* keep the fallback */
  }
  return new Response(JSON.stringify({ ok: true, default: def }), {
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=30",
      "access-control-allow-origin": "*",
    },
  });
};
