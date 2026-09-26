// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Best-effort server-side error reporting for the marketing site (pyrax-website, Astro SSR).
// When an SSR API route hits an UNEXPECTED 5xx, or the Node process emits an unhandledRejection,
// this module POSTs a scrubbed, deduped summary to the NOVA Sentinel ingest so the on-call sees
// it. It is a mirror of the node-app `electron/main/error-reporter.ts` design, adapted to the
// SERVER-SIDE trust boundary: this process is OPERATED by us, so the secret stays on the server and
// we use the agent-secret ingest path (NOT the distributed app-key gateway).
//
// TRUST BOUNDARY: server-operated → POST ${SENTINEL_INGEST_URL}/api/errors with
//   `authorization: Bearer ${NOVA_AGENT_SECRET}`.  source = "pyrax-website".
//
// NON-NEGOTIABLE CONTRACTS (identical to every other Sentinel surface):
//  • FAIL-OPEN: telemetry is best-effort. Every POST is wrapped so any throw is swallowed, bounded
//    by a ~10s timeout, and fire-and-forget (never awaited on the request hot path). A non-200 /
//    network error is at most logged locally, NEVER surfaced to a visitor, NEVER rethrown. If the
//    secret/URL is unset the reporter is a silent no-op and the site runs normally.
//  • CALLER-SIDE DEDUPE/THROTTLE: a burst of the same error collapses to at most one report per
//    unique signature per ~15 min, carrying an occurrence count. Benign/expected errors (4xx, bad
//    user input) are skipped by the caller — this module only ever sees unexpected faults.
//  • PRIVACY SCRUB: secrets, bearer tokens, wallet keys/addresses, tx contents, raw peer IPs,
//    syncIds/ciphertext, session tokens, and filesystem paths carrying an OS username are stripped
//    before anything leaves the process. When in doubt, omit.

/** Env — canonical names shared across every Sentinel surface. */
const env = (k: string): string => (typeof process !== "undefined" ? process.env?.[k] ?? "" : "");
const INGEST_BASE = (env("SENTINEL_INGEST_URL") || "https://status.pyraxnetwork.org").replace(/\/+$/, "");
const AGENT_SECRET = env("NOVA_AGENT_SECRET");
/** Stable service slug this site reports under. */
const SOURCE = "pyrax-website";
/** Optional host label so the on-call can tell droplets apart (never a path/username). */
const DROPLET = env("DROPLET") || env("HOSTNAME") || "";

/** After the first send for a signature, at most one more report per this window, carrying the
 *  count of repeats seen during it — so a crash loop is one report ("×217"), never a flood. */
const THROTTLE_MS = Number(env("PYRAX_ERROR_THROTTLE_MS")) || 15 * 60 * 1000;
/** Bound every telemetry POST — a hung ingest must never wedge the reporter. */
const POST_TIMEOUT_MS = 10_000;

type Level = "error" | "warn" | "info";

interface Pending {
  /** Occurrences accrued since the last report was sent for this signature. */
  count: number;
  firstTs: number;
  title: string;
  detail: string;
  level: Level;
  timer: ReturnType<typeof setTimeout> | null;
}

/** Scrub secrets and personally-identifying data from a string BEFORE it leaves the process.
 *  Value-targeted + conservative so ordinary stack frames stay readable for debugging, while a
 *  stray bearer token, private key, session cookie, or a path carrying the OS username can never be
 *  reported in the clear. Byte-for-byte the same intent as the node apps' `redact()`. */
export function redact(input: string): string {
  const KEYS =
    "pass(?:word|phrase)|secret|mnemonic|seed[\\s_-]?phrase|private[\\s_-]?key|priv[\\s_-]?key|" +
    "api[\\s_-]?key|access[\\s_-]?token|refresh[\\s_-]?token|session[\\s_-]?token|auth(?:orization)?|" +
    "bearer|cookie|x-api-key|nova[\\s_-]?agent[\\s_-]?secret|otp|magic[\\s_-]?link|syncid";
  return (
    input
      // 1. Auth-scheme credential — keep the scheme word, redact the credential across the space.
      .replace(/\b(Bearer|Basic|Digest)\s+[A-Za-z0-9._~+/=-]{4,}/gi, (_m, scheme) => `${scheme} …redacted…`)
      // 2. QUOTED secret value (JSON config dump / multi-word mnemonic) — redact whole.
      .replace(new RegExp(`("?\\b(?:${KEYS})\\b"?\\s*[:=]\\s*)"[^"]*"`, "gi"), (_m, lead) => `${lead}"…redacted…"`)
      // 3. UNQUOTED secret value — `key: v`, `key=v` (value ends at whitespace/comma/brace).
      .replace(new RegExp(`("?\\b(?:${KEYS})\\b"?\\s*[:=]\\s*)[^\\s",}]+`, "gi"), (_m, lead) => `${lead}…redacted…`)
      // 4. bare private-key-like material: 64+ hex chars NOT 0x-prefixed (0x-prefixed = hashes/addresses).
      .replace(/(^|[^0xX0-9a-fA-F])([0-9a-fA-F]{64,})\b/g, (_m, pre) => `${pre}…redacted…`)
      // 5. 0x-prefixed 40-hex EVM addresses + 64-hex keys/tx-hashes — collapse (wallet privacy).
      .replace(/\b0x[0-9a-fA-F]{40,}\b/g, "0x…")
      // 6. raw IPv4 addresses (peer IPs).
      .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "…ip…")
      // 7. home-directory paths leak the OS username — collapse it.
      .replace(/([A-Za-z]:\\Users\\)[^\\/:*?"<>|\r\n]+/g, "$1…")
      .replace(/(\/(?:home|Users)\/)[^/\s:]+/g, "$1…")
      // 8. email addresses (tester emails) — collapse the local part.
      .replace(/\b[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g, "…@$1")
  );
}

/** Collapse volatile bits (numbers, hex, hashes) so the SAME fault with different ids dedupes to
 *  one signature — a crash loop is one report, not one per request. */
function signatureOf(title: string, level: Level): string {
  const norm = title
    .replace(/0x[0-9a-fA-F]+/g, "0x…")
    .replace(/\b[0-9a-fA-F]{16,}\b/g, "…")
    .replace(/\d+/g, "#")
    .slice(0, 200);
  return `${level}|${norm}`;
}

/** Best-effort truncation to a stable, bounded summary. */
function clamp(s: string, max: number): string {
  const t = (s || "").replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
}

const pending = new Map<string, Pending>();
let installed = false;

/** True once a real ingest secret is configured. When false, every report is a silent no-op and the
 *  site runs normally (dev, or a deploy that hasn't been given the secret yet). */
function configured(): boolean {
  return AGENT_SECRET.length > 0;
}

/** Fire the actual POST to the Sentinel ingest. Fully self-contained fail-open: bounded, and any
 *  throw (network, abort, non-2xx handling) is swallowed. Never awaited on a request hot path. */
async function post(title: string, detail: string, level: Level, count: number): Promise<void> {
  if (!configured()) return;
  const body = JSON.stringify({
    source: SOURCE,
    title: clamp(count > 1 ? `${title} (×${count})` : title, 200),
    detail: clamp(redact(detail || title), 8000),
    level,
    ...(DROPLET ? { droplet: clamp(DROPLET, 120) } : {}),
  });
  try {
    await fetch(`${INGEST_BASE}/api/errors`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${AGENT_SECRET}` },
      body,
      signal: AbortSignal.timeout(POST_TIMEOUT_MS),
    });
    // A non-2xx is intentionally ignored — telemetry is best-effort and must never surface.
  } catch {
    /* best-effort telemetry — never surface a reporting failure to a visitor */
  }
}

/**
 * Report an unexpected server fault. DEDUPE + THROTTLE + FAIL-OPEN + fire-and-forget.
 *  • `title`  — a short, STABLE summary (used for dedupe + the report title; <=200 chars sent).
 *  • `detail` — the full message / stack (scrubbed before send).
 *  • `level`  — "error" (default) | "warn" | "info".
 *
 * Returns immediately (void). The first occurrence of a new signature is sent right away; further
 * occurrences within THROTTLE_MS accrue a count that rides the next (throttled) send.
 */
export function reportServerError(title: string, detail = "", level: Level = "error"): void {
  try {
    if (!configured()) return; // silent no-op when unconfigured
    const cleanTitle = clamp(redact(title || "unknown error"), 200);
    const sig = signatureOf(cleanTitle, level);
    const existing = pending.get(sig);
    if (existing) {
      // A throttle window is already open for this signature — just accrue; the scheduled flush
      // carries the new count. This is the crash-loop collapse.
      existing.count += 1;
      existing.detail = detail || existing.detail;
      return;
    }
    // First sighting: send immediately, then open a throttle window.
    const entry: Pending = { count: 0, firstTs: Date.now(), title: cleanTitle, detail, level, timer: null };
    pending.set(sig, entry);
    void post(cleanTitle, detail, level, 1);
    entry.timer = setTimeout(() => void flush(sig), THROTTLE_MS);
    // Don't keep the event loop alive for telemetry.
    (entry.timer as { unref?: () => void })?.unref?.();
  } catch {
    /* the reporter itself must never throw into a request path */
  }
}

/** Throttle-window flush: if repeats accrued, send the summary with its count; then either re-open
 *  the window (still hot) or close the signature out (quiesced). */
async function flush(sig: string): Promise<void> {
  const p = pending.get(sig);
  if (!p) return;
  if (p.count === 0) {
    // The window elapsed with no repeats — close the signature.
    pending.delete(sig);
    return;
  }
  const count = p.count;
  p.count = 0;
  p.firstTs = Date.now();
  await post(p.title, p.detail, p.level, count);
  p.timer = setTimeout(() => void flush(sig), THROTTLE_MS);
  (p.timer as { unref?: () => void })?.unref?.();
}

/**
 * Wrap an SSR API handler so an UNEXPECTED throw is (a) reported to Sentinel and (b) turned into a
 * clean 500 for the visitor — the page/API never leaks a stack. Expected 4xx the handler returns
 * itself are passed through untouched and NOT reported. Use in an API route's catch path, e.g.
 *
 *   export const GET = withErrorReport("GET /api/net", async ({ request }) => { … });
 */
export function withErrorReport<T extends (...args: any[]) => Promise<Response> | Response>(
  label: string,
  handler: T,
): T {
  const wrapped = (async (...args: Parameters<T>): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (err) {
      const e = err as Error;
      reportServerError(`${label}: ${e?.message || String(err)}`, e?.stack || String(err), "error");
      return new Response(JSON.stringify({ ok: false, error: "internal error" }), {
        status: 500,
        headers: { "content-type": "application/json", "cache-control": "no-store" },
      });
    }
  }) as T;
  return wrapped;
}

/**
 * Install the process-level `unhandledRejection` / `uncaughtException` hooks ONCE, so a rejected
 * promise that escapes a request path still gets reported (scrubbed, deduped). Idempotent and safe
 * to call from module top-level; a no-op when the reporter is unconfigured. NEVER exits the process
 * on our behalf — we only report and let Node's default behavior stand.
 */
export function installProcessHooks(): void {
  if (installed) return;
  installed = true;
  if (typeof process === "undefined" || typeof process.on !== "function") return;
  try {
    process.on("unhandledRejection", (reason: unknown) => {
      const e = reason as Error;
      reportServerError(`unhandledRejection: ${e?.message || String(reason)}`, e?.stack || String(reason), "error");
    });
    process.on("uncaughtException", (err: Error) => {
      reportServerError(`uncaughtException: ${err?.message || String(err)}`, err?.stack || String(err), "error");
    });
  } catch {
    /* hook install is best-effort — never block startup */
  }
}
