// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Sentinel error telemetry for the SSR explorer web service (source "explorer-web").
//
// This service is SERVER-SIDE OPERATED (the container holds NOVA_AGENT_SECRET, which never ships to a
// browser), so it reports on the operator ingest path:
//     POST ${SENTINEL_INGEST_URL}/api/errors   with  authorization: Bearer ${NOVA_AGENT_SECRET}
//
// Canonical rules (see the integration spec):
//   • FAIL-OPEN — telemetry is best-effort. Every POST is wrapped so any throw is swallowed, bounded by
//     a ~10s timeout, and fire-and-forget (never awaited on a request hot path). A non-200/network
//     error is at most logged locally, NEVER surfaced to the user, NEVER rethrown. With the secret or
//     URL unset the reporter is a silent no-op and the app runs normally.
//   • CALLER-SIDE DEDUPE/THROTTLE — a burst of the same error collapses to at most one report per
//     unique signature per ~15 min, carrying an occurrence count. Benign/expected errors (4xx / bad
//     user input) are never sent — call sites report only genuine 5xx faults.
//   • PRIVACY SCRUB — every title/detail is run through redact() so secrets, bearer tokens, wallet
//     addresses/keys, raw IPs, and OS-username filesystem paths never leave the box.
//
// Modeled on the desktop apps' electron/main/error-reporter.ts (dedupe/throttle/redact), adapted to the
// operator ingest contract.

const INGEST_BASE = (process.env.SENTINEL_INGEST_URL || "https://status.pyraxchain.com").replace(/\/+$/, "");
const AGENT_SECRET = process.env.NOVA_AGENT_SECRET || "";
const SOURCE = "explorer-web";
const DROPLET = process.env.DROPLET_HOST || process.env.HOSTNAME || undefined;

/** At most one report per unique signature per this window, carrying the occurrences since the last send. */
const THROTTLE_MS = Number(process.env.SENTINEL_THROTTLE_MS) || 15 * 60 * 1000;
/** Bound the POST so a hung ingest never ties up a socket. */
const POST_TIMEOUT_MS = 10_000;

/** True only when the reporter is fully configured; otherwise every send() is a silent no-op. */
export const sentinelEnabled = (): boolean => !!AGENT_SECRET && !!INGEST_BASE;

/** Scrub secrets + personally-identifying data BEFORE anything leaves the box. Conservative and
 *  value-targeted so 0x-prefixed block/tx hashes stay readable for debugging, but bearer tokens, secret
 *  values, bare private-key-like hex, wallet addresses, and OS-username paths are collapsed. Mirrors the
 *  desktop apps' redact() and adds a wallet-address rule (0x + 40 hex) appropriate to explorer data. */
export function redact(input: string): string {
  const KEYS =
    "pass(?:word|phrase)|secret|mnemonic|seed[\\s_-]?phrase|private[\\s_-]?key|priv[\\s_-]?key|" +
    "api[\\s_-]?key|access[\\s_-]?token|refresh[\\s_-]?token|auth(?:orization)?|bearer|cookie|x-api-key";
  return String(input)
    // Auth-scheme credential — keep the scheme word, redact the credential that follows.
    .replace(/\b(Bearer|Basic|Digest)\s+[A-Za-z0-9._~+/=-]{4,}/gi, (_m, scheme) => `${scheme} …redacted…`)
    // QUOTED secret value (may contain spaces — a multi-word mnemonic — so redact it whole).
    .replace(new RegExp(`("?\\b(?:${KEYS})\\b"?\\s*[:=]\\s*)"[^"]*"`, "gi"), (_m, lead) => `${lead}"…redacted…"`)
    // UNQUOTED secret value — key: v / key=v (value ends at whitespace/comma/brace).
    .replace(new RegExp(`("?\\b(?:${KEYS})\\b"?\\s*[:=]\\s*)[^\\s",}]+`, "gi"), (_m, lead) => `${lead}…redacted…`)
    // Wallet address (0x + exactly 40 hex) — an explorer error can carry a queried address; omit it.
    .replace(/\b0x[0-9a-fA-F]{40}\b/g, "0x…addr…")
    // Bare private-key-like material: 64+ hex chars NOT prefixed with 0x (0x-prefixed = hashes, kept).
    .replace(/(^|[^0xX0-9a-fA-F])([0-9a-fA-F]{64,})\b/g, (_m, pre) => `${pre}…redacted…`)
    // Raw IPv4 — never ship a peer/client IP.
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "…ip…")
    // Home-directory paths leak the OS username — collapse it.
    .replace(/([A-Za-z]:\\Users\\)[^\\/:*?"<>|\r\n]+/g, "$1…")
    .replace(/(\/(?:home|Users)\/)[^/\s:]+/g, "$1…")
    .slice(0, 8000);
}

/** Collapse volatile bits (hex, hashes, numbers) so the SAME error with different ids dedupes to one
 *  signature. */
function signatureOf(title: string, detail: string): string {
  const norm = (title + "|" + detail)
    .replace(/0x[0-9a-fA-F]+/g, "0x…")
    .replace(/\b[0-9a-fA-F]{16,}\b/g, "…")
    .replace(/\d+/g, "#")
    .slice(0, 240);
  return norm;
}

interface Pending { count: number; firstTs: number; timer: ReturnType<typeof setTimeout>; title: string; detail: string; level: "error" | "warn" | "info"; }
const pending = new Map<string, Pending>();

async function post(title: string, detail: string, level: "error" | "warn" | "info", count: number): Promise<void> {
  const body = JSON.stringify({
    source: SOURCE,
    title: redact(title).slice(0, 200),
    detail: redact(count > 1 ? `[×${count} in the last ${Math.round(THROTTLE_MS / 60000)}m] ${detail}` : detail),
    level,
    ...(DROPLET ? { droplet: String(DROPLET).slice(0, 120) } : {}),
  });
  try {
    await fetch(`${INGEST_BASE}/api/errors`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${AGENT_SECRET}` },
      body,
      signal: AbortSignal.timeout(POST_TIMEOUT_MS),
    });
  } catch {
    /* best-effort telemetry — never surface a reporting failure to the caller */
  }
}

/** Report a genuine server fault (a caught 5xx-class exception). Fire-and-forget, deduped/throttled,
 *  privacy-scrubbed. NEVER await this on a request hot path; NEVER pass it expected 4xx/user-input
 *  errors. Any internal failure is swallowed so a telemetry problem can never break a response. */
export function reportServerError(title: string, detail: string, level: "error" | "warn" | "info" = "error"): void {
  try {
    if (!sentinelEnabled()) return; // silent no-op when unconfigured
    const sig = signatureOf(title, detail);
    const existing = pending.get(sig);
    if (existing) {
      // A throttle window is already open for this signature — accrue and let the scheduled flush carry
      // the new count. This is what collapses a crash-loop into one report ("×217").
      existing.count += 1;
      existing.title = title;
      existing.detail = detail;
      return;
    }
    // First occurrence: send immediately (fire-and-forget), then open a throttle window.
    void post(title, detail, level, 1);
    const p: Pending = {
      count: 0,
      firstTs: Date.now(),
      title,
      detail,
      level,
      timer: setTimeout(() => flush(sig), THROTTLE_MS),
    };
    // Don't let the throttle timer keep the process alive.
    (p.timer as any)?.unref?.();
    pending.set(sig, p);
  } catch {
    /* fail-open: a bug in the reporter must never propagate */
  }
}

function flush(sig: string): void {
  const p = pending.get(sig);
  if (!p) return;
  if (p.count > 0) {
    void post(p.title, p.detail, p.level, p.count);
    p.count = 0;
    p.firstTs = Date.now();
    p.timer = setTimeout(() => flush(sig), THROTTLE_MS);
    (p.timer as any)?.unref?.();
  } else {
    // Window elapsed with no repeats — close the signature out.
    pending.delete(sig);
  }
}

/** Wrap an SSR/API handler so any thrown fault is reported (fail-open) and re-thrown for Astro's own
 *  500 handling. Only genuine faults reach here — validation/4xx handlers return Responses, they don't
 *  throw. Usage:  export const GET = withSentinel("api:net", async (ctx) => { … });  */
export function withSentinel<A extends any[]>(
  label: string,
  handler: (...args: A) => Promise<Response> | Response,
): (...args: A) => Promise<Response> {
  return async (...args: A): Promise<Response> => {
    try {
      const res = await handler(...args);
      // A handler that itself returns a 5xx (without throwing) is still a fault worth reporting.
      if (res && res.status >= 500) reportServerError(`${label}: HTTP ${res.status}`, `${label} returned status ${res.status}`);
      return res;
    } catch (e: any) {
      reportServerError(`${label}: ${e?.name || "Error"}`, redact(String(e?.stack || e?.message || e)));
      throw e; // preserve normal error propagation — telemetry is a side-channel
    }
  };
}
