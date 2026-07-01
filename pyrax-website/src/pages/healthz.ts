// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Liveness probe for the container HEALTHCHECK + the load balancer / droplet monitor. It ALWAYS
// returns 200 with a small JSON body while the SSR process is up — it makes NO upstream calls (no
// DB, no RPC, no team-portal fetch), so a dependency blip can never mark the web process unhealthy
// and trigger a restart loop. The marketing site has no database of its own, so `db` is always
// "unconfigured" (reported for a uniform /healthz contract across every PYRAX surface).
// Unauthenticated by design.
//
// Contract: GET /healthz -> 200 { ok:true, version, db:"unconfigured", ts:<epoch-ms> }, no-store.
import type { APIRoute } from "astro";
import pkg from "../../package.json";

export const prerender = false;

const VERSION = (pkg as { version?: string }).version || "0.0.0";

export const GET: APIRoute = () =>
  new Response(JSON.stringify({ ok: true, version: VERSION, db: "unconfigured", ts: Date.now() }), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
