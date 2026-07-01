// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Liveness/health endpoint for the container HEALTHCHECK + the droplet monitor. Per the Sentinel
// /healthz contract: ALWAYS returns 200 while the SSR process is up, with body
//   { ok:true, version:"<pkg version>", db:"up"|"down"|"unconfigured", ts:<epoch-ms> }
// and cache-control:no-store. DB reachability is a NON-FATAL field — a Postgres outage must NOT fail
// liveness (the portal degrades gracefully without the DB), so the probe is bounded (~4s) and can
// never throw or hang the check. Unauthenticated by design.
import type { APIRoute } from "astro";
import { pingDb } from "../server/pingDb";

export const prerender = false;

// `__PORTAL_VERSION__` is inlined at build by Vite (see astro.config.mjs vite.define) from
// package.json, so the health body reports the running build's version even though the container
// starts via `node` (not `npm run`). Declared here; guarded so dev/test without the define still work.
declare const __PORTAL_VERSION__: string | undefined;
const VERSION =
  (typeof __PORTAL_VERSION__ !== "undefined" && __PORTAL_VERSION__) ||
  process.env.npm_package_version ||
  "0.1.0";

export const GET: APIRoute = async () => {
  let db: "up" | "down" | "unconfigured" = "unconfigured";
  try { db = await pingDb(); } catch { db = "down"; } // dependency health is non-fatal, never a non-200
  return new Response(JSON.stringify({ ok: true, version: VERSION, db, ts: Date.now() }), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
};
