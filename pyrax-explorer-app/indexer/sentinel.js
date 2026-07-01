// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Sentinel error telemetry for the explorer INDEXER service (source "explorer-indexer").
//
// This is a SERVER-SIDE OPERATED service (the container holds NOVA_AGENT_SECRET, never shipped to a
// client), so it reports on the operator ingest path:
//     POST ${SENTINEL_INGEST_URL}/api/errors   with  authorization: Bearer ${NOVA_AGENT_SECRET}
//
// Canonical rules (see the integration spec):
//   • FAIL-OPEN — best-effort. Every POST is wrapped so any throw is swallowed, bounded by a ~10s
//     timeout, and fire-and-forget (never awaited on the ingest hot path). A non-200/network error is
//     at most logged locally, NEVER rethrown. With the secret/URL unset the reporter is a silent no-op
//     and ingest runs normally.
//   • CALLER-SIDE DEDUPE/THROTTLE — a burst of the same failure collapses to at most one report per
//     unique signature per ~15 min, carrying an occurrence count (so an RPC/DB outage that fails every
//     tick is one report "×217", not a flood).
//   • PRIVACY SCRUB — every title/detail is run through redact() (secrets, bearer tokens, wallet
//     addresses/keys, raw IPs, OS-username paths). Connection strings never carry into a detail because
//     they're scrubbed here as a backstop.

const INGEST_BASE = (process.env.SENTINEL_INGEST_URL || "https://status.pyraxchain.com").replace(/\/+$/, "");
const AGENT_SECRET = process.env.NOVA_AGENT_SECRET || "";
const SOURCE = "explorer-indexer";
const DROPLET = process.env.DROPLET_HOST || process.env.HOSTNAME || undefined;

const THROTTLE_MS = Number(process.env.SENTINEL_THROTTLE_MS) || 15 * 60 * 1000;
const POST_TIMEOUT_MS = 10_000;

/** True only when fully configured; otherwise every report() is a silent no-op. */
export const enabled = () => !!AGENT_SECRET && !!INGEST_BASE;

/** Scrub secrets + PII before anything leaves the box. 0x-prefixed block/tx hashes stay readable; bearer
 *  tokens, secret values, DB connection strings, wallet addresses, bare key-like hex, raw IPs, and
 *  OS-username paths are collapsed. */
export function redact(input) {
  const KEYS =
    "pass(?:word|phrase)|secret|mnemonic|seed[\\s_-]?phrase|private[\\s_-]?key|priv[\\s_-]?key|" +
    "api[\\s_-]?key|access[\\s_-]?token|refresh[\\s_-]?token|auth(?:orization)?|bearer|cookie|x-api-key";
  return String(input)
    // postgres://user:pass@host — a pg error can echo the connection string; strip credentials + host.
    .replace(/\b(postgres(?:ql)?|mysql|redis|amqp|mongodb(?:\+srv)?):\/\/[^\s"']+/gi, (_m, scheme) => `${scheme}://…redacted…`)
    .replace(/\b(Bearer|Basic|Digest)\s+[A-Za-z0-9._~+/=-]{4,}/gi, (_m, scheme) => `${scheme} …redacted…`)
    .replace(new RegExp(`("?\\b(?:${KEYS})\\b"?\\s*[:=]\\s*)"[^"]*"`, "gi"), (_m, lead) => `${lead}"…redacted…"`)
    .replace(new RegExp(`("?\\b(?:${KEYS})\\b"?\\s*[:=]\\s*)[^\\s",}]+`, "gi"), (_m, lead) => `${lead}…redacted…`)
    .replace(/\b0x[0-9a-fA-F]{40}\b/g, "0x…addr…")
    .replace(/(^|[^0xX0-9a-fA-F])([0-9a-fA-F]{64,})\b/g, (_m, pre) => `${pre}…redacted…`)
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "…ip…")
    .replace(/([A-Za-z]:\\Users\\)[^\\/:*?"<>|\r\n]+/g, "$1…")
    .replace(/(\/(?:home|Users)\/)[^/\s:]+/g, "$1…")
    .slice(0, 8000);
}

/** Collapse volatile bits so the same failure with different ids dedupes to one signature. */
function signatureOf(title, detail) {
  return String(title + "|" + detail)
    .replace(/0x[0-9a-fA-F]+/g, "0x…")
    .replace(/\b[0-9a-fA-F]{16,}\b/g, "…")
    .replace(/\d+/g, "#")
    .slice(0, 240);
}

const pending = new Map();

async function post(title, detail, level, count) {
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
    /* best-effort telemetry — never surface a reporting failure */
  }
}

function flush(sig) {
  const p = pending.get(sig);
  if (!p) return;
  if (p.count > 0) {
    void post(p.title, p.detail, p.level, p.count);
    p.count = 0;
    p.timer = setTimeout(() => flush(sig), THROTTLE_MS);
    p.timer?.unref?.();
  } else {
    pending.delete(sig);
  }
}

/** Report a genuine indexer fault (an ingest failure, a DB error, a pool error). Fire-and-forget,
 *  deduped/throttled, privacy-scrubbed. Any internal failure is swallowed so a telemetry problem can
 *  never break ingest. `level` is one of "error" | "warn" | "info". */
export function report(title, detail, level = "error") {
  try {
    if (!enabled()) return; // silent no-op when unconfigured
    const sig = signatureOf(title, detail);
    const existing = pending.get(sig);
    if (existing) {
      existing.count += 1;
      existing.title = title;
      existing.detail = detail;
      return;
    }
    void post(title, detail, level, 1);
    const p = { count: 0, title, detail, level, timer: setTimeout(() => flush(sig), THROTTLE_MS) };
    p.timer?.unref?.();
    pending.set(sig, p);
  } catch {
    /* fail-open: a bug in the reporter must never propagate into ingest */
  }
}
