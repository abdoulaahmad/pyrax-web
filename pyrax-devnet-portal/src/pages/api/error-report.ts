// SPDX-License-Identifier: LicenseRef-Proprietary
// Redacted crash/error report ingest from the apps + CLI (the same payload they send to Sentinel:
// { source, title, detail, level, app_version, os }). No auth — reports are pre-redacted + anonymous;
// rate-limited per source IP. Deduped server-side by signature. Feeds the team Error Reports page.
import type { APIRoute } from "astro";
import { recordErrorReport } from "../../server/db";
import { json } from "../../server/http";
import { rateLimited, ipKey } from "../../server/ratelimit";

export const prerender = false;
const LEVELS = new Set(["error", "warn", "info"]);

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ipLimited = rateLimited(`er:ip:${ipKey(request, clientAddress)}`, 60, 60_000);
  if (ipLimited) return ipLimited;

  const b = await request.json().catch(() => ({}));
  const title = String(b?.title ?? "").trim();
  if (!title) return json({ ok: false, error: "missing title" }, 400);

  const source = typeof b?.source === "string" ? b.source.slice(0, 40) : undefined;
  await recordErrorReport({
    source,
    app: typeof b?.app === "string" ? b.app.slice(0, 24) : source?.replace(/^app:/, "").slice(0, 24),
    appVersion: typeof b?.app_version === "string" ? b.app_version.slice(0, 24) : undefined,
    os: typeof b?.os === "string" ? b.os.slice(0, 24) : undefined,
    level: LEVELS.has(String(b?.level)) ? String(b.level) : "error",
    title,
    detail: typeof b?.detail === "string" ? b.detail : undefined,
  });
  return json({ ok: true });
};
