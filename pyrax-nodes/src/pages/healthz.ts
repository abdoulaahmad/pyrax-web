// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Liveness/health endpoint for the droplet monitor + the container HEALTHCHECK. Returns 200 with a
// small JSON body whenever the SSR process is up. It also reports DB reachability as a non-fatal
// signal (`db: "up" | "down" | "unconfigured"`) — the app is designed to run (degrading gracefully)
// even when the Postgres cluster isn't reachable, so a DB outage must NOT fail the health check.
import type { APIRoute } from "astro";
import { pingDb } from "../server/settings";

export const prerender = false;

export const GET: APIRoute = async () => {
  let db: "up" | "down" | "unconfigured" = "unconfigured";
  try { db = await pingDb(); } catch { db = "down"; }
  return new Response(JSON.stringify({ ok: true, db, ts: Date.now() }), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
};
