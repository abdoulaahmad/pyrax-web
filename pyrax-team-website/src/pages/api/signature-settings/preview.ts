// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Live preview for the Signature Studio: renders the manager's OWN signature with DRAFT (unsaved)
// design settings, so they can see edits before saving. Manager-only; renders, never persists.
import type { APIRoute } from "astro";
import { requireUser, subjectOf } from "../../../server/guard";
import { can } from "../../../lib/permissions";
import { sanitizeSettings } from "../../../lib/signature-settings";
import { renderSignatureDoc, type SignatureUser, type SignatureTheme } from "../../../server/signature";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return new Response("Not signed in.", { status: 401 });
  if (!can(subjectOf(me), "signature.manage")) return new Response("Forbidden.", { status: 403 });

  const body = await request.json().catch(() => ({}));
  const settings = sanitizeSettings(body?.settings);
  const t = body?.theme;
  const theme: SignatureTheme = t === "dark" ? "dark" : "light";
  const su: SignatureUser = {
    displayName: me.display_name, position: me.position, email: me.email,
    phone: me.phone, bookingUrl: me.booking_url, socials: me.socials,
  };
  return new Response(renderSignatureDoc(su, theme, settings), {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
};
