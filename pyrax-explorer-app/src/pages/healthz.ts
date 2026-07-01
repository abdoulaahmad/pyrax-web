// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Liveness/health endpoint for the Sentinel/droplet monitor + the container HEALTHCHECK.
//
// Contract (canonical across all PYRAX services):
//   GET /healthz  ->  ALWAYS 200 while the SSR process is up.
//   body { ok:true, version:"<build version>", db:"up"|"down"|"unconfigured", ts:<epoch-ms> }
//   cache-control: no-store
//
// Dependency (Postgres) health is a NON-FATAL field — the explorer is designed to run and render even
// with no DB reachable (it degrades to live-RPC → PYRAX-native sample). A DB outage must therefore NEVER
// make this a non-200: it only flips `db` to "down". The probe is bounded (<=4.5s, never throws) so a
// hung DB connect can't stall the health check, the HEALTHCHECK, or the monitor.
import type { APIRoute } from "astro";
import { pingDb } from "../server/indexer";
import pkg from "../../package.json";

export const prerender = false;

const VERSION = process.env.EXPLORER_VERSION || (pkg as { version?: string }).version || "0.0.0";

export const GET: APIRoute = async () => {
  let db: "up" | "down" | "unconfigured" = "unconfigured";
  try { db = await pingDb(); } catch { db = "down"; } // defensive: pingDb already never throws
  return new Response(JSON.stringify({ ok: true, version: VERSION, db, ts: Date.now() }), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
};
