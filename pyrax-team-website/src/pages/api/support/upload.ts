// SPDX-License-Identifier: LicenseRef-Proprietary
// Presign a direct-to-Spaces PUT for a ticket attachment (public-read). The browser PUTs the file to
// `putUrl`, then references the stable `url` on the reply. (requires support.manage)
import type { APIRoute } from "astro";
import crypto from "node:crypto";
import { requireUser, subjectOf } from "@/server/guard";
import { can } from "@/lib/permissions";
import { json } from "@/server/http";
import { presignPut, publicUrl, spacesConfigured } from "@/server/spaces";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false, error: "Sign in required." }, 401);
  if (!can(subjectOf(me), "support.manage")) return json({ ok: false, error: "Forbidden." }, 403);
  if (!spacesConfigured()) return json({ ok: false, error: "Attachments aren't configured (Spaces creds unset)." }, 503);
  const b = await request.json().catch(() => ({}));
  const name = (String(b?.name || "file").replace(/[^\w.\-]+/g, "_").slice(0, 120)) || "file";
  const year = new Date().getUTCFullYear();
  const key = `support/${year}/${crypto.randomBytes(8).toString("hex")}-${name}`;
  return json({ ok: true, putUrl: presignPut(key), url: publicUrl(key), name });
};
