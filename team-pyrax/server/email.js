// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// team-pyrax — transactional email via Brevo.
//
// `renderEmail()` is the SHARED, on-brand PYRAX email template — reuse it for every
// future transactional email. It mirrors the website hero: a deep near-black field
// with fire+blue glow (a hosted background image applied via CSS AND VML so it shows
// in Outlook, with bgcolor as the floor), Sora headings / Inter body, the horizontal
// wordmark, and a bulletproof gradient CTA (a VML rounded button for Outlook + a CSS
// gradient button with a brand glow for everything else). Fully centered.

import { BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME, EMAIL_LOGO_URL, EMAIL_BG_URL } from "./config.js";

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
      subject: "Sign in to PYRAX Team",
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

/** Send the Ember admin-area unlock OTP. Throws on a hard send failure (the HTTP
 *  layer still returns its generic anti-enumeration response). */
export async function sendEmberOtp(email, code) {
  const codeHtml = `<div style="margin:28px auto 6px;padding:18px 22px;max-width:340px;border:1px solid #303852;border-radius:12px;background-color:#141824;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:32px;font-weight:800;letter-spacing:0.34em;color:#fcd03d;text-align:center;">${esc(code)}</div>`;
  const htmlContent = renderEmail({
    preheader: "Your Ember admin unlock code — expires in 10 minutes.",
    eyebrow: "Ember admin access",
    heading: "Your admin unlock code",
    intro: "Enter this code in the Ember app to unlock the admin area. It expires in 10 minutes and can be used once.",
    bodyHtml: codeHtml,
    metaNote: "Expires in 10 minutes · one-time use",
  });
  const textContent =
    `Your Ember admin unlock code: ${code}\n\n` +
    `Enter it in the Ember app to unlock the admin area.\n` +
    `This code expires in 10 minutes and can be used once.\n` +
    `If you didn't request it, you can safely ignore this email.`;

  if (!BREVO_API_KEY) {
    console.warn(`[team-pyrax] BREVO_API_KEY unset — Ember admin OTP for ${email}: ${code}`);
    return;
  }
  const res = await fetch(BREVO_ENDPOINT, {
    method: "POST",
    headers: { "api-key": BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { email: BREVO_SENDER_EMAIL, name: BREVO_SENDER_NAME },
      to: [{ email }],
      subject: "Your Ember admin unlock code",
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

/** Where automatic error reports are delivered. The founder specified the Teams channel
 *  connector. COMMA-SEPARATED so additional recipients can be added via PYRAX_ERROR_EMAIL
 *  WITHOUT a code change (e.g. a mailbox, since a Teams connector can filter external
 *  senders — if reports don't arrive, add an inbox here). */
const ERROR_REPORT_EMAILS = (process.env.PYRAX_ERROR_EMAIL || "67dcaa51.PYRAXChain.onmicrosoft.com@ca.teams.ms")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const LEVEL_HUE = { error: "#f87171", warn: "#fbbf24", info: "#cbd5e1", debug: "#7a8294" };

function fmtTime(ms) {
  try {
    return new Date(Number(ms)).toISOString().replace("T", " ").replace("Z", " UTC");
  } catch {
    return String(ms);
  }
}

/**
 * Send an automatic error report from a node/CLI/app: a monospace dump of the 250
 * lines leading up to the failure, with the failing line BOLDED, plus a header with
 * the build identity + occurrence count. Best-effort — logs + returns on a no-key /
 * send failure (never throws to the caller). Returns true on a successful send.
 */
export async function sendErrorReport(report) {
  const { app = "app", variant = "", version = "", platform = "", level = "error", component = "", message = "", count = 1, firstTs, ts, context = [] } = report ?? {};
  const lvl = String(level).toLowerCase();
  const hue = LEVEL_HUE[lvl] ?? LEVEL_HUE.error;
  const head = `[PYRAX ${esc(app)} ${lvl.toUpperCase()}] ${esc(component)}: ${esc(String(message).slice(0, 90))}`;

  const rows = (Array.isArray(context) ? context : [])
    .map((e) => {
      const line = `${fmtTime(e.ts)}  ${String(e.level ?? "").toUpperCase().padEnd(5)}  ${e.component ?? ""}  ${e.message ?? ""}`;
      if (e.isError) {
        return `<div style="background:#3a1414;border-left:3px solid #f87171;padding:2px 8px;margin:2px -8px;color:#fca5a5;font-weight:700;">${esc(line)}</div>`;
      }
      return `<div style="padding:0 8px;color:#9aa4ba;">${esc(line)}</div>`;
    })
    .join("");

  const metaRow = (k, v) => `<tr><td style="padding:2px 14px 2px 0;color:#6a7286;">${esc(k)}</td><td style="color:#d7def0;font-weight:600;">${esc(v)}</td></tr>`;
  const htmlContent = `<!doctype html><html><body style="margin:0;background:#06070b;color:#e7ecf5;font-family:'SFMono-Regular',Consolas,Menlo,monospace;">
  <div style="padding:20px 22px;">
    <div style="font-size:16px;font-weight:800;color:${hue};margin-bottom:4px;">${lvl.toUpperCase()} in ${esc(app)} ${esc(version)}</div>
    <div style="font-size:13px;color:#cbd5e1;margin-bottom:14px;word-break:break-word;"><b>${esc(String(message))}</b></div>
    <table style="font-size:12px;margin-bottom:16px;border-collapse:collapse;">
      ${metaRow("app", `${app} (${variant})`)}
      ${metaRow("version", version)}
      ${metaRow("platform", platform)}
      ${metaRow("component", component)}
      ${metaRow("occurrences", `${count}${count > 1 ? " (deduped in this window)" : ""}`)}
      ${metaRow("first seen", fmtTime(firstTs ?? ts))}
      ${metaRow("reported", fmtTime(ts))}
    </table>
    <div style="font-size:11px;color:#6a7286;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.08em;">Context — last ${Array.isArray(context) ? context.length : 0} lines (failing line highlighted)</div>
    <div style="font-size:12px;line-height:1.5;background:#0b0d14;border:1px solid #1c2233;border-radius:8px;padding:10px 8px;white-space:pre-wrap;word-break:break-word;overflow-x:auto;">${rows || '<div style="color:#6a7286;padding:0 8px;">(no preceding context captured)</div>'}</div>
  </div></body></html>`;

  const textContent =
    `${head}\n\n${message}\n\n` +
    `app=${app} (${variant})  version=${version}  platform=${platform}  occurrences=${count}\n` +
    `first=${fmtTime(firstTs ?? ts)}  reported=${fmtTime(ts)}\n\n--- context (failing line marked >>) ---\n` +
    (Array.isArray(context) ? context : [])
      .map((e) => `${e.isError ? ">> " : "   "}${fmtTime(e.ts)} ${String(e.level ?? "").toUpperCase()} ${e.component ?? ""} ${e.message ?? ""}`)
      .join("\n");

  if (!BREVO_API_KEY) {
    console.warn(`[team-pyrax] BREVO_API_KEY unset — error report not emailed: ${head}`);
    return false;
  }
  try {
    const res = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: { "api-key": BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { email: BREVO_SENDER_EMAIL, name: BREVO_SENDER_NAME },
        to: ERROR_REPORT_EMAILS.map((email) => ({ email })),
        subject: head,
        htmlContent,
        textContent,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(`[team-pyrax] error-report send FAILED: ${res.status} ${body.slice(0, 300)} (to ${ERROR_REPORT_EMAILS.join(", ")})`);
      return false;
    }
    console.log(`[team-pyrax] error-report emailed → ${ERROR_REPORT_EMAILS.join(", ")}: ${head}`);
    return true;
  } catch (e) {
    console.warn(`[team-pyrax] error-report send threw: ${e?.message ?? e}`);
    return false;
  }
}

// Website type stacks (web fonts load where allowed; the rest fall back cleanly).
const DISPLAY = "'Sora','Helvetica Neue',Helvetica,Arial,sans-serif";
const BODY = "'Inter','Helvetica Neue',Helvetica,Arial,sans-serif";

/**
 * The shared PYRAX transactional-email shell — fully centered, on-brand, Outlook-hardened.
 * Pass any of: preheader, eyebrow, heading, intro, bodyHtml, ctaLabel + ctaUrl, metaNote,
 * fallbackUrl. Returns a full HTML document. Reuse for every PYRAX email.
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
  const BG = esc(EMAIL_BG_URL);

  // Bulletproof CTA: a VML rounded button for Outlook + a CSS gradient button (with a
  // brand glow) for everything else. Live text, so it stays reusable.
  const cta =
    ctaLabel && ctaUrl
      ? `
          <tr><td align="center" style="padding:30px 36px 4px;text-align:center;">
            <!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${esc(ctaUrl)}" style="height:52px;v-text-anchor:middle;width:300px;" arcsize="24%" strokecolor="#fcd03d" fillcolor="#f58622">
              <v:fill type="gradient" color="#fcd03d" color2="#d75427" angle="90"/>
              <w:anchorlock/>
              <center style="color:#1a0f02;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">${esc(ctaLabel)} &#8594;</center>
            </v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-->
            <a href="${esc(ctaUrl)}" target="_blank" style="display:inline-block;padding:16px 40px;border-radius:11px;background-color:#f58622;background-image:linear-gradient(100deg,#fcd03d 0%,#f58622 58%,#d75427 100%);box-shadow:0 0 0 1px rgba(252,208,61,0.35),0 12px 30px -10px rgba(245,134,34,0.8);font-family:${BODY};font-size:15px;font-weight:700;letter-spacing:0.01em;color:#1a0f02;text-decoration:none;">${esc(ctaLabel)} &nbsp;&rarr;</a>
            <!--<![endif]-->
          </td></tr>`
      : "";

  const meta = metaNote
    ? `<tr><td align="center" style="padding:18px 36px 0;text-align:center;font-family:${BODY};font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#6a7286;">${esc(metaNote)}</td></tr>`
    : "";

  const fallback = fallbackUrl
    ? `
          <tr><td style="padding:26px 36px 34px;">
            <div style="border-top:1px solid #1b2030;padding-top:20px;text-align:center;font-family:${BODY};font-size:12px;line-height:1.6;color:#6a7286;">
              Button not working? Copy and paste this link into your browser:<br>
              <a href="${esc(fallbackUrl)}" target="_blank" style="color:#60b8cc;text-decoration:none;word-break:break-all;">${esc(fallbackUrl)}</a>
            </div>
          </td></tr>`
    : "";

  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="x-ua-compatible" content="ie=edge">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>PYRAX</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700;800&display=swap" rel="stylesheet">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700;800&display=swap');
  @media (max-width:600px){ .px{ padding-left:24px!important; padding-right:24px!important; } }
</style>
</head>
<body bgcolor="#050609" style="margin:0;padding:0;background-color:#050609;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;color:#050609;font-size:1px;line-height:1px;">${esc(preheader)}</div>
<!--[if gte mso 9]>
<v:background xmlns:v="urn:schemas-microsoft-com:vml" fill="t">
  <v:fill type="frame" src="${BG}" color="#050609"/>
</v:background>
<![endif]-->
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#050609" background="${BG}" style="background-color:#050609;background-image:url('${BG}');background-position:top center;background-repeat:no-repeat;background-size:cover;">
  <tr><td align="center" style="padding:46px 16px;">
    <table role="presentation" width="560" border="0" cellpadding="0" cellspacing="0" align="center" style="width:560px;max-width:100%;margin:0 auto;">

      <tr><td align="center" style="padding:4px 0 30px;text-align:center;">
        <img src="${esc(EMAIL_LOGO_URL)}" alt="PYRAX" width="190" style="display:block;border:0;outline:none;text-decoration:none;width:190px;max-width:62%;height:auto;margin:0 auto;">
      </td></tr>

      <tr><td bgcolor="#0c0e16" style="background-color:#0c0e16;background-image:linear-gradient(180deg,#0f121b 0%,#0a0c12 100%);border:1px solid #1d2330;border-radius:16px;box-shadow:inset 0 1px 0 0 rgba(255,255,255,0.05), 0 36px 72px -30px rgba(0,0,0,0.92);">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
          <tr><td class="px" align="center" style="padding:46px 40px 0;text-align:center;">
            ${
              eyebrow
                ? `<span style="display:inline-block;padding:5px 12px;border:1px solid #303852;border-radius:999px;background-color:#141824;font-family:${BODY};font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#f5a623;">${esc(eyebrow)}</span>`
                : ""
            }
            <h1 style="margin:18px 0 0;font-family:${DISPLAY};font-size:28px;line-height:1.18;font-weight:800;letter-spacing:-0.02em;color:#f7f9fd;text-align:center;">${esc(heading)}</h1>
            ${intro ? `<p style="margin:14px auto 0;max-width:430px;font-family:${BODY};font-size:15px;line-height:1.65;color:#9aa4ba;text-align:center;">${esc(intro)}</p>` : ""}
            ${bodyHtml}
          </td></tr>
          ${cta}
          ${meta}
          ${fallback}
        </table>
      </td></tr>

      <tr><td align="center" style="padding:30px 24px 6px;text-align:center;font-family:${BODY};font-size:12px;line-height:1.7;color:#6a7286;">
        <div style="font-family:${DISPLAY};font-weight:800;letter-spacing:0.2em;color:#9aa4ba;">PYRAX</div>
        <div style="margin-top:8px;">You received this because someone requested a sign-in link for your address.<br>If it wasn't you, you can safely ignore this email — no one can sign in without the link.</div>
        <div style="margin-top:12px;color:#454d5e;">© ${year} PYRAX · Internal use only</div>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`;
}
