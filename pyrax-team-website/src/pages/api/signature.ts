// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Serves the signed-in member's personalized PYRAX email signature.
//   ?format=doc   (default) full standalone HTML document — used for the preview iframe + .htm file
//   ?format=inner just the <table> block — used for "Copy signature" to the clipboard
//   ?download=1   adds Content-Disposition so the browser saves it as pyrax-signature.htm
import type { APIRoute } from "astro";
import { sessionUser, SESSION_COOKIE } from "../../server/auth";
import { renderSignatureDoc, renderSignatureInner, type SignatureUser, type SignatureTheme } from "../../server/signature";

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies }) => {
  const user = await sessionUser(cookies.get(SESSION_COOKIE)?.value);
  if (!user) return new Response("Not signed in.", { status: 401 });

  const su: SignatureUser = {
    displayName: user.display_name, position: user.position, email: user.email,
    phone: user.phone, bookingUrl: user.booking_url, socials: user.socials,
  };
  // Preview themes force a fixed look for the portal only; copy + .htm stay OS-adaptive ("auto").
  const p = url.searchParams.get("preview");
  const theme: SignatureTheme = p === "light" || p === "dark" ? p : "auto";
  const inner = url.searchParams.get("format") === "inner";
  const html = inner ? renderSignatureInner(su) : renderSignatureDoc(su, theme);
  const headers: Record<string, string> = { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" };
  if (url.searchParams.get("download")) headers["content-disposition"] = 'attachment; filename="pyrax-signature.htm"';
  return new Response(html, { status: 200, headers });
};
