// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Transactional email via Brevo. The templates are hand-built, table-based, fully inline-styled
// HTML — they render cleanly on Outlook, Gmail, Apple Mail, and mobile. The brand mark is drawn
// in styled text (no <img>) so there is no image-blocking and nothing to right-click-save.

const API_KEY = process.env.BREVO_API_KEY || "";
const SENDER_EMAIL = process.env.BREVO_SENDER || "no-reply@pyraxchain.com";
const SENDER_NAME = process.env.BREVO_SENDER_NAME || "PYRAX Team";
// When set, the OTP is delivered through this stylized Brevo template ({{params.otp}}).
const OTP_TEMPLATE_ID = Number(process.env.BREVO_OTP_TEMPLATE_ID || 0);

const C = {
  bg: "#06070b", card: "#0e1018", box: "#05060a", line: "#222838",
  ink: "#f7f9fd", muted: "#9aa4ba", faint: "#6a7286", gold: "#fcd03d", brand: "#f58622", ember: "#d75427",
};

function shell(title: string, inner: string): string {
  const year = new Date().getFullYear();
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>${title}</title></head>
<body style="margin:0;padding:0;background:${C.bg};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${title} — PYRAX Team Portal.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:32px 12px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
    <tr><td style="height:4px;background:${C.brand};border-radius:4px 4px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr>
    <tr><td align="center" style="padding:26px 0 22px;">
      <span style="font-family:'Segoe UI',Arial,sans-serif;font-size:24px;font-weight:800;letter-spacing:-0.5px;color:${C.brand};">PYRAX</span>
      <span style="font-family:'Segoe UI',Arial,sans-serif;font-size:24px;font-weight:600;color:${C.faint};"> &nbsp;Team Portal</span>
    </td></tr>
    <tr><td style="background:${C.card};border:1px solid ${C.line};border-radius:14px;padding:36px 34px;">
      ${inner}
    </td></tr>
    <tr><td align="center" style="padding:22px 8px;font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:${C.faint};line-height:1.6;">
      © ${year} PYRAX LLC · Authorized personnel only<br><a href="https://team.pyraxchain.com" style="color:${C.brand};text-decoration:none;font-weight:600;">team.pyraxchain.com</a>
    </td></tr>
  </table>
</td></tr></table></body></html>`;
}

/** Absolute expiry as an unambiguous UTC clock time (e.g. "7:42 PM UTC"). Renders correctly in
 *  every email client and stays accurate no matter when the message is opened — unlike a relative
 *  "10 minutes" (the live countdown lives on the sign-in page, where JavaScript actually runs). */
export function formatExpiry(expiresAtMs: number): string {
  const t = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(expiresAtMs));
  return `${t} UTC`;
}

export function renderOtpEmail(code: string, expires: string): string {
  const spaced = code.split("").join("&#8202;"); // hair-spaces between digits for legibility
  const inner = `
    <h1 style="margin:0 0 8px;font-family:'Segoe UI',Arial,sans-serif;font-size:22px;font-weight:800;color:${C.ink};">Your sign-in code</h1>
    <p style="margin:0 0 24px;font-family:'Segoe UI',Arial,sans-serif;font-size:15px;color:${C.muted};line-height:1.6;">Use this one-time code to sign in to the PYRAX Team Portal.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"
      style="background:${C.box};border:1px solid ${C.brand};border-radius:12px;padding:22px 12px;">
      <span style="font-family:'Courier New',monospace;font-size:34px;font-weight:700;letter-spacing:8px;color:${C.gold};">${spaced}</span>
    </td></tr></table>
    <p style="margin:22px 0 0;font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:${C.muted};line-height:1.6;">Expires at <strong style="color:${C.ink};">${expires}</strong> and can only be used once.</p>
    <div style="height:1px;background:${C.line};margin:26px 0;font-size:0;line-height:0;">&nbsp;</div>
    <p style="margin:0;font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:${C.faint};line-height:1.6;">Didn't try to sign in? You can safely ignore this email. <strong style="color:${C.muted};">Never share this code with anyone</strong> — PYRAX staff will never ask for it.</p>`;
  return shell("Your sign-in code", inner);
}

export function renderInviteEmail(displayName: string, inviter?: string): string {
  const inner = `
    <h1 style="margin:0 0 8px;font-family:'Segoe UI',Arial,sans-serif;font-size:22px;font-weight:800;color:${C.ink};">Welcome to the team, ${escapeHtml(displayName)}.</h1>
    <p style="margin:0 0 22px;font-family:'Segoe UI',Arial,sans-serif;font-size:15px;color:${C.muted};line-height:1.6;">You've been invited${inviter ? ` by ${escapeHtml(inviter)}` : ""} to the PYRAX Team Portal — your secure home for the work we're building together.</p>
    <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:10px;background:${C.brand};">
      <a href="https://team.pyraxchain.com/" style="display:inline-block;padding:13px 26px;font-family:'Segoe UI',Arial,sans-serif;font-size:15px;font-weight:700;color:#1a0f06;text-decoration:none;border-radius:10px;">Sign in to get started →</a>
    </td></tr></table>
    <p style="margin:24px 0 0;font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:${C.muted};line-height:1.6;">When you sign in, we'll email you a one-time code — no password to remember. You can finish your profile once you're in.</p>
    <div style="height:1px;background:${C.line};margin:26px 0;font-size:0;line-height:0;">&nbsp;</div>
    <p style="margin:0;font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:${C.faint};line-height:1.6;">This invitation is for ${escapeHtml(displayName)} only. If you weren't expecting it, you can ignore this email.</p>`;
  return shell("You're invited to PYRAX Team", inner);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

/** Send via Brevo. Returns true on success; logs + returns false on failure (never throws into
 *  the auth path — a slow/down mailer must not break sign-in). */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!API_KEY) { console.warn("[email] BREVO_API_KEY not set — skipping send to", to); return false; }
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": API_KEY, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ sender: { email: SENDER_EMAIL, name: SENDER_NAME }, to: [{ email: to }], subject, htmlContent: html }),
    });
    if (!res.ok) { console.error("[email] Brevo", res.status, await res.text().catch(() => "")); return false; }
    return true;
  } catch (e) {
    console.error("[email] send failed:", e);
    return false;
  }
}

/** Send a Brevo stored template by id, substituting {{params.*}}. */
export async function sendTemplate(to: string, templateId: number, params: Record<string, unknown>): Promise<boolean> {
  if (!API_KEY) { console.warn("[email] BREVO_API_KEY not set — skipping template send to", to); return false; }
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": API_KEY, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ templateId, params, to: [{ email: to }] }),
    });
    if (!res.ok) { console.error("[email] Brevo template", res.status, await res.text().catch(() => "")); return false; }
    return true;
  } catch (e) { console.error("[email] template send failed:", e); return false; }
}

// Prefer the stylized Brevo template; fall back to the inline HTML if no template id is configured.
// `expiresAt` is epoch ms; we send the template both the code and a friendly absolute expiry time.
export const sendOtp = (to: string, code: string, expiresAt: number) => {
  const expires = formatExpiry(expiresAt);
  return OTP_TEMPLATE_ID
    ? sendTemplate(to, OTP_TEMPLATE_ID, { otp: code, expires })
    : sendEmail(to, "Your PYRAX Team sign-in code", renderOtpEmail(code, expires));
};
export const sendInvite = (to: string, displayName: string, inviter?: string) => sendEmail(to, "You're invited to PYRAX Team", renderInviteEmail(displayName, inviter));

// ---- Devnet closed-alpha invite (sent from the team-site Devnet Users page) ----
const DEVNET_URL = process.env.DEVNET_PUBLIC_URL || "https://devnet.pyraxchain.com";
const CDN = "https://pyrax.tor1.cdn.digitaloceanspaces.com/email";
function renderDevnetInvite(token: string): string {
  const year = new Date().getFullYear();
  const link = `${DEVNET_URL}/join?token=${encodeURIComponent(token)}`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>PYRAX Devnet invite</title></head>
<body style="margin:0;padding:0;background:${C.bg};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:32px 12px;"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
    <tr><td align="center" style="padding:6px 0 22px;"><img src="${CDN}/pyrax-logo.png" width="148" alt="PYRAX" style="display:block;border:0;width:148px;max-width:60%;height:auto;"></td></tr>
    <tr><td style="background:${C.card};border:1px solid ${C.line};border-radius:16px;overflow:hidden;">
      <img src="${CDN}/flame-bar-v2.png" width="560" height="6" alt="" style="display:block;width:100%;height:6px;border:0;">
      <div style="padding:36px 34px;">
        <h1 style="margin:0 0 10px;font-family:'Segoe UI',Arial,sans-serif;font-size:23px;font-weight:800;color:${C.ink};">You're in the closed Alpha.</h1>
        <p style="margin:0 0 22px;font-family:'Segoe UI',Arial,sans-serif;font-size:15px;color:${C.muted};line-height:1.65;">You've been invited to help test the <strong style="color:${C.ink};">PYRAX network</strong> as a closed-alpha tester. Click below to set up your tester account — it takes a minute.</p>
        <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:10px;background:${C.brand};"><a href="${link}" style="display:inline-block;padding:14px 28px;font-family:'Segoe UI',Arial,sans-serif;font-size:15px;font-weight:700;color:#1a0f06;text-decoration:none;border-radius:10px;">Accept your invite →</a></td></tr></table>
        <p style="margin:22px 0 0;font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:${C.muted};line-height:1.6;">You'll run a node via the Inferno app or the CLI, file bug reports, and help shape the network before mainnet.</p>
        <p style="margin:14px 0 0;font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:${C.faint};line-height:1.6;">This invite link is personal to you and expires in 14 days.</p>
      </div>
    </td></tr>
    <tr><td align="center" style="padding:22px 8px;font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:${C.faint};line-height:1.7;"><strong style="color:${C.muted};">PYRAX Devnet — Closed Alpha</strong> &nbsp;·&nbsp; <a href="${DEVNET_URL}" style="color:${C.brand};text-decoration:none;font-weight:600;">devnet.pyraxchain.com</a><br>© ${year} PYRAX LLC · Authorized testers only</td></tr>
  </table>
</td></tr></table></body></html>`;
}
export const sendDevnetInvite = (to: string, token: string) => sendEmail(to, "Your PYRAX Devnet closed-alpha invite", renderDevnetInvite(token));
