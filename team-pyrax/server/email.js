// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// team-pyrax — transactional email via Brevo.
//
// `renderEmail()` is the SHARED, on-brand PYRAX email template — reuse it for every
// future transactional email by passing different content. It's a premium dark layout
// matching the website theme (the horizontal wordmark from the Spaces CDN, a fire→blue
// gradient accent, a bulletproof gradient CTA). All layout is table-based with inline
// styles for maximum client support; gradients degrade to a solid brand colour in
// Outlook. sendMagicLink() composes the sign-in email on top of it.

import { BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME, EMAIL_LOGO_URL } from "./config.js";

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

/** Send the passwordless sign-in link. Throws on a hard send failure (the HTTP layer
 *  still returns its generic anti-enumeration response). */
export async function sendMagicLink(email, url) {
  const htmlContent = renderEmail({
    preheader: "Your one-time PYRAX Team sign-in link — expires in 15 minutes.",
    eyebrow: "Secure sign-in",
    heading: "Sign in to PYRAX Team",
    intro:
      "Click the button below to sign in to the PYRAX Team portal. For your security this link expires in 15 minutes and can be used once.",
    ctaLabel: "Sign in to PYRAX Team",
    ctaUrl: url,
    metaNote: "Expires in 15 minutes · one-time use",
    fallbackUrl: url,
  });
  const textContent =
    `Sign in to the PYRAX Team portal:\n\n${url}\n\n` +
    `This link expires in 15 minutes and can be used once.\n` +
    `If you didn't request it, you can safely ignore this email.`;

  if (!BREVO_API_KEY) {
    console.warn(`[team-pyrax] BREVO_API_KEY unset — sign-in link for ${email}:\n  ${url}`);
    return;
  }
  const res = await fetch(BREVO_ENDPOINT, {
    method: "POST",
    headers: { "api-key": BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { email: BREVO_SENDER_EMAIL, name: BREVO_SENDER_NAME },
      to: [{ email }],
      subject: "Your PYRAX Team sign-in link",
      htmlContent,
      textContent,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`brevo send failed: ${res.status} ${body.slice(0, 300)}`);
  }
}

const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * The shared PYRAX transactional-email shell. Pass any of:
 *   preheader  — hidden inbox preview text
 *   eyebrow    — small uppercase chip above the heading
 *   heading    — the H1
 *   intro      — lead paragraph
 *   bodyHtml   — optional extra HTML inside the card (already-safe markup)
 *   ctaLabel + ctaUrl — the gradient call-to-action button
 *   metaNote   — small uppercase note under the CTA (e.g. expiry)
 *   fallbackUrl — shown as a copy-paste link below a divider
 * Returns a full HTML document.
 */
export function renderEmail({
  preheader = "",
  eyebrow = "",
  heading = "",
  intro = "",
  bodyHtml = "",
  ctaLabel = "",
  ctaUrl = "",
  metaNote = "",
  fallbackUrl = "",
} = {}) {
  const year = new Date().getFullYear();

  const cta =
    ctaLabel && ctaUrl
      ? `
          <tr><td style="padding:26px 40px 2px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr>
              <td align="center" style="border-radius:12px;background-color:#f58622;background:linear-gradient(100deg,#fcd03d 0%,#f58622 52%,#d75427 100%);box-shadow:0 12px 30px -12px rgba(245,134,34,0.7);">
                <a href="${esc(ctaUrl)}" target="_blank" style="display:inline-block;padding:15px 32px;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;letter-spacing:0.01em;color:#1a0f02;text-decoration:none;border-radius:12px;">${esc(ctaLabel)} &nbsp;&rarr;</a>
              </td>
            </tr></table>
          </td></tr>`
      : "";

  const meta = metaNote
    ? `<tr><td style="padding:16px 40px 0;font-family:Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#6a7286;">${esc(metaNote)}</td></tr>`
    : "";

  const fallback = fallbackUrl
    ? `
          <tr><td style="padding:24px 40px 32px;">
            <div style="border-top:1px solid #171b27;padding-top:18px;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#6a7286;">
              Button not working? Copy and paste this link into your browser:<br>
              <a href="${esc(fallbackUrl)}" target="_blank" style="color:#60b8cc;text-decoration:none;word-break:break-all;">${esc(fallbackUrl)}</a>
            </div>
          </td></tr>`
    : "";

  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="x-ua-compatible" content="ie=edge">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>PYRAX</title>
</head>
<body style="margin:0;padding:0;background-color:#050609;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;color:#050609;font-size:1px;line-height:1px;">${esc(preheader)}</div>
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#050609;background-image:radial-gradient(60rem 26rem at 16% -8%, rgba(215,84,39,0.20), transparent 60%), radial-gradient(58rem 30rem at 90% -6%, rgba(28,99,166,0.20), transparent 60%);">
  <tr><td align="center" style="padding:44px 16px;">
    <table role="presentation" width="560" border="0" cellpadding="0" cellspacing="0" style="width:560px;max-width:100%;">

      <tr><td align="center" style="padding:0 0 30px;">
        <img src="${esc(EMAIL_LOGO_URL)}" alt="PYRAX" width="190" style="display:block;border:0;outline:none;text-decoration:none;width:190px;max-width:62%;height:auto;">
      </td></tr>

      <tr><td style="background-color:#0c0e16;border:1px solid #232838;border-radius:18px;">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
          <tr><td style="height:3px;line-height:3px;font-size:0;background-color:#f58622;background:linear-gradient(90deg,#fcd03d 0%,#f58622 42%,#d75427 66%,#3981c0 100%);">&nbsp;</td></tr>
          <tr><td style="padding:36px 40px 0;">
            ${
              eyebrow
                ? `<span style="display:inline-block;padding:5px 12px;border:1px solid #2a3142;border-radius:999px;background-color:#12141e;font-family:Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#f5a623;">${esc(eyebrow)}</span>`
                : ""
            }
            <h1 style="margin:16px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:27px;line-height:1.18;font-weight:800;letter-spacing:-0.02em;color:#f7f9fd;">${esc(heading)}</h1>
            ${intro ? `<p style="margin:14px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:#9aa4ba;">${esc(intro)}</p>` : ""}
            ${bodyHtml}
          </td></tr>
          ${cta}
          ${meta}
          ${fallback}
        </table>
      </td></tr>

      <tr><td align="center" style="padding:28px 24px 6px;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.7;color:#6a7286;">
        <div style="font-weight:800;letter-spacing:0.2em;color:#9aa4ba;">PYRAX</div>
        <div style="margin-top:8px;">You received this because someone requested a sign-in link for your address.<br>If it wasn't you, you can safely ignore this email — no one can sign in without the link.</div>
        <div style="margin-top:12px;color:#454d5e;">© ${year} PYRAX · Internal use only</div>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`;
}
