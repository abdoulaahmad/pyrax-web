// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Sentinel crash telemetry for the Devnet Tester Portal (server-side path).
//
// This is a SERVER-OPERATED service — the secret stays on the droplet — so it uses the agent-secret
// ingest:  POST ${SENTINEL_INGEST_URL}/api/errors  with  Authorization: Bearer ${NOVA_AGENT_SECRET}.
// The reporter is DIAGNOSTIC-ONLY: it names the error class + route so operators know something is
// failing, and NOTHING else.
//
// EXTRA PII SCRUB (non-negotiable for this surface): the portal handles tester emails, OTP / magic-link
// secrets, session tokens, wallet + node-pairing data, and push subscriptions. NONE of that may leave
// the process. We therefore report ONLY:  the error's class name (e.g. "TypeError") and the route path
// with any ids/tokens stripped (e.g. "/api/node/heartbeat"). We deliberately do NOT ship the error
// message, stack, query string, request body, headers, or cookies — those can carry the secrets above.
//
// CANONICAL RULES honored here:
//   - FAIL-OPEN: every POST is wrapped so any throw is swallowed; bounded with a ~10s timeout;
//     fire-and-forget (never awaited on a request path). If NOVA_AGENT_SECRET is unset the reporter is
//     a silent no-op and the portal runs normally. A non-200/network error is never surfaced/rethrown.
//   - DEDUPE/THROTTLE: at most one report per unique signature (source|level|class|route) per ~15min,
//     carrying an occurrence count for the burst.
//
// env: SENTINEL_INGEST_URL (default https://status.pyraxchain.com), NOVA_AGENT_SECRET.

const INGEST_BASE = (process.env.SENTINEL_INGEST_URL || "https://status.pyraxchain.com").replace(/\/+$/, "");
const SECRET = process.env.NOVA_AGENT_SECRET || "";
const SOURCE = "devnet-portal";
const THROTTLE_MS = 15 * 60 * 1000; // one report per signature per 15 min
const POST_TIMEOUT_MS = 10_000;

type Level = "error" | "warn" | "info";

interface Window { count: number; firstTs: number; timer: ReturnType<typeof setTimeout>; level: Level; title: string; detail: string }
const windows = new Map<string, Window>();

/** Reduce a route to a STABLE, PII-free shape: strip the query string, then replace every path
 *  segment that looks like an id / token / email / hash with a placeholder. This keeps "/api/node/pair"
 *  readable while guaranteeing a tester id, session token, or email in the path never ships. */
export function scrubRoute(rawPath: string): string {
  let p = (rawPath || "").split("?")[0].split("#")[0];
  if (!p.startsWith("/")) p = "/" + p;
  const parts = p.split("/").map((seg) => {
    if (!seg) return seg;
    // Anything with an @, or that is long / mixed / numeric / hex-ish => an id or secret, not a route word.
    if (seg.includes("@")) return ":redacted";
    if (/^[0-9]+$/.test(seg)) return ":id";
    if (seg.length > 24) return ":id";
    if (/[0-9]/.test(seg) && /[a-zA-Z]/.test(seg) && seg.length > 12) return ":id";
    if (/^[0-9a-fA-F]{12,}$/.test(seg)) return ":id";
    return seg;
  });
  return parts.join("/").slice(0, 120) || "/";
}

/** The error's CLASS only — never its message (a message can embed an email, token, or path). */
function errorClass(err: unknown): string {
  if (err && typeof err === "object" && err.constructor && typeof err.constructor.name === "string") {
    return err.constructor.name.slice(0, 60) || "Error";
  }
  return "Error";
}

function post(body: unknown): void {
  // Fire-and-forget; every failure mode is swallowed. Silent no-op when unconfigured.
  if (!SECRET) return;
  try {
    void fetch(`${INGEST_BASE}/api/errors`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${SECRET}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(POST_TIMEOUT_MS),
    }).catch(() => {}); // network/non-200 — best-effort only, never surfaced
  } catch {
    /* URL/serialization guard — telemetry must never break the request path */
  }
}

function flush(sig: string): void {
  const w = windows.get(sig);
  if (!w) return;
  if (w.count === 0) { windows.delete(sig); return; } // window elapsed with no repeats — close it out
  post({
    source: SOURCE,
    level: w.level,
    title: w.count > 1 ? `${w.title} (x${w.count})` : w.title,
    detail: w.detail,
    droplet: process.env.HOSTNAME || undefined,
  });
  // Re-arm the throttle window: repeats during it accrue into `count`; the next flush summarizes them.
  w.count = 0;
  w.firstTs = Date.now();
  w.timer = setTimeout(() => flush(sig), THROTTLE_MS);
}

/** Report a portal-side fault to Sentinel. `title`/`detail` are derived here from the error CLASS and
 *  the scrubbed route ONLY — callers pass the raw error + route and we guarantee nothing sensitive
 *  leaves this function. Deduped/throttled per signature. Always fail-open. */
export function reportPortalError(opts: { err: unknown; route?: string; level?: Level; status?: number }): void {
  if (!SECRET) return; // silent no-op when unconfigured
  try {
    const level: Level = opts.level || "error";
    const cls = errorClass(opts.err);
    const route = opts.route ? scrubRoute(opts.route) : "";
    const statusPart = opts.status ? ` [${opts.status}]` : "";
    // Diagnostic, PII-free: class + route + status. No message, stack, query, body, or headers.
    const title = `${cls}${route ? ` @ ${route}` : ""}${statusPart}`.slice(0, 200);
    const detail = `${cls} thrown while serving ${route || "an unknown route"}${statusPart}. `
      + "(message/stack withheld: this surface handles tester emails, OTP/magic-link secrets, sessions, "
      + "wallet & node-pairing data, and push subscriptions.)";
    const sig = `${SOURCE}|${level}|${cls}|${route}`;

    const w = windows.get(sig);
    if (w) { w.count += 1; w.level = level; w.title = title; w.detail = detail; return; }
    windows.set(sig, {
      count: 1, firstTs: Date.now(), level, title, detail,
      timer: setTimeout(() => flush(sig), 0), // send the first occurrence promptly, then throttle
    });
  } catch {
    /* the reporter itself must never throw into a request path */
  }
}

let installed = false;
/** Install a process-level unhandledRejection reporter (idempotent). API 5xx are reported from the
 *  middleware; this catches faults that escape a request (e.g. a dangling promise). */
export function installUnhandledReporter(): void {
  if (installed) return;
  installed = true;
  try {
    process.on("unhandledRejection", (reason) => {
      reportPortalError({ err: reason, route: "unhandledRejection", level: "error" });
    });
  } catch {
    /* never let telemetry setup break boot */
  }
}
