// SPDX-License-Identifier: LicenseRef-Proprietary
// Presigned PUT for Issue Council attachments (video/log/image) → DO Spaces. Degrades gracefully
// when Spaces isn't configured (the UI then allows text-only reports).
import type { APIRoute } from "astro";
import crypto from "node:crypto";
import { requireTester, subjectOf } from "../../../server/guard";
import { json } from "../../../server/http";
import { can } from "../../../lib/permissions";
import { presignPut, spacesConfigured } from "../../../server/s3presign";

export const prerender = false;

const LIMITS: Record<string, number> = { image: 10, video: 100, log: 25 }; // MB
function kind(ct: string, name: string): "image" | "video" | "log" | null {
  const e = (name.split(".").pop() || "").toLowerCase();
  if (/^image\//.test(ct) || ["png", "jpg", "jpeg", "gif", "webp"].includes(e)) return "image";
  if (/^video\//.test(ct) || ["mp4", "webm", "mov"].includes(e)) return "video";
  if (["txt", "log", "json", "zip"].includes(e) || /text|json|zip/.test(ct)) return "log";
  return null;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const me = await requireTester(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);
  if (!can(subjectOf(me), "issues.submit")) return json({ ok: false, error: "Forbidden." }, 403);
  if (!spacesConfigured()) return json({ ok: false, reason: "unconfigured", error: "Attachments aren't configured yet." }, 200);

  const b = await request.json().catch(() => ({}));
  const filename = String(b?.filename ?? "file").slice(0, 120);
  const contentType = String(b?.contentType ?? "application/octet-stream");
  const size = Number(b?.size ?? 0);
  const k = kind(contentType, filename);
  if (!k) return json({ ok: false, error: "Unsupported file type." }, 422);
  if (size > LIMITS[k] * 1024 * 1024) return json({ ok: false, error: `${k} files must be under ${LIMITS[k]} MB.` }, 422);

  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const key = `devnet/issues/${me.id}/${crypto.randomBytes(8).toString("hex")}-${safe}`;
  const { url, publicUrl, headers } = presignPut(key, 900);
  return json({ ok: true, url, publicUrl, headers, key, kind: k });
};
