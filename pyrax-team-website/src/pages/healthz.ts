// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Liveness probe for the container HEALTHCHECK + the load balancer. Intentionally does NOT touch
// the database (a DB blip must not mark the web process unhealthy and trigger a restart loop) —
// it only proves the Node server is up and serving. Unauthenticated by design.
import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = () =>
  new Response(JSON.stringify({ ok: true, service: "team-portal" }), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
