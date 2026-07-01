// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Server-to-server client for the NEURAX Sentinel backend (the headless guardian brain that runs
// on the status droplet). The team portal is the ONLY admin front-door for Sentinel: these calls
// carry a shared bearer secret so the Sentinel API trusts them, while the team site gates every
// route on the SRE `sentinel.*` permissions. status.pyraxchain.com stays a PURELY PUBLIC status
// page — it no longer serves an admin console; all Sentinel activity happens here.
import type { AstroCookies } from "astro";
import { requireUser, subjectOf } from "./guard";
import { json } from "./http";
import { can, type Permission } from "../lib/permissions";

const BASE = (process.env.SENTINEL_BACKEND_URL || "https://status.pyraxchain.com").replace(/\/+$/, "");
const SECRET = process.env.SENTINEL_ADMIN_SECRET || "";

/** True once a real shared secret is configured (else the console reports "not configured"). */
export function sentinelConfigured(): boolean {
  return SECRET.length > 0;
}

interface SentinelResult {
  ok: boolean;
  status: number;
  data: Record<string, unknown> & { error?: string; ok?: boolean };
}

/** Total-request timeout budgets. undici's fetch() has NO default total-request timeout (only a
 *  connect timeout that never fires against a SYN-dropped / blackholed peer), so a hung nova host
 *  would otherwise hold the team-portal request open indefinitely, piling up in-flight proxies from
 *  the 8s console auto-poll and exhausting the pg pool / SSR event loop. We bound EVERY call:
 *   - POSTs that legitimately run on-GPU inference (ask/dispatch/investigate) get a long budget
 *     that still comfortably exceeds nova's own NOVA_INFER_TIMEOUT_MS (=120_000);
 *   - GET status/mind polls get a short budget so a stalled backend fails fast. */
const POLL_TIMEOUT_MS = 5_000;
const INFERENCE_TIMEOUT_MS = 130_000;

/** Low-level signed call to the Sentinel backend. Never throws — a transport failure OR a timeout
 *  resolves to a clean error result (502 unreachable / 504 timed out) so a route can pass a clean
 *  error to the UI rather than hanging forever. */
async function sentinelFetch(
  path: string,
  init: { method?: string; body?: unknown; timeoutMs?: number } = {},
): Promise<SentinelResult> {
  if (!SECRET) {
    return { ok: false, status: 500, data: { error: "Sentinel isn't configured (missing SENTINEL_ADMIN_SECRET)." } };
  }
  const method = init.method || "GET";
  // Default the budget from the verb: a body-carrying POST may drive inference; a GET is a poll.
  const timeoutMs = init.timeoutMs ?? (method === "GET" ? POLL_TIMEOUT_MS : INFERENCE_TIMEOUT_MS);
  try {
    const r = await fetch(`${BASE}${path}`, {
      method,
      headers: { "content-type": "application/json", authorization: `Bearer ${SECRET}` },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const data = (await r.json().catch(() => ({}))) as SentinelResult["data"];
    return { ok: r.ok, status: r.status, data: data && typeof data === "object" ? data : {} };
  } catch (e) {
    // AbortSignal.timeout() rejects with a TimeoutError DOMException when the budget elapses.
    if (e instanceof Error && e.name === "TimeoutError") {
      return { ok: false, status: 504, data: { error: "Sentinel timed out." } };
    }
    return { ok: false, status: 502, data: { error: "Couldn't reach the Sentinel backend." } };
  }
}

/**
 * The one helper every `/api/sentinel/*` route uses: resolve the signed-in user, enforce the SRE
 * permission, forward to the Sentinel backend with the bearer, and normalize the reply to
 * `{ ok, ... }`. Keeps each route a single line + the trust boundary in one place.
 */
export async function proxySentinel(
  cookies: AstroCookies,
  permission: Permission,
  path: string,
  init: { method?: string; body?: unknown; timeoutMs?: number } = {},
): Promise<Response> {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false, error: "Sign in required." }, 401);
  if (!can(subjectOf(me), permission)) return json({ ok: false, error: "Forbidden." }, 403);
  const r = await sentinelFetch(path, init);
  if (!r.ok) return json({ ok: false, error: r.data.error || `Sentinel returned ${r.status}` }, r.status || 502);
  return json({ ok: true, ...r.data });
}
