// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Transactional email via Brevo for the Devnet Tester Portal. On-brand dark phoenix templates.
// IMPORTANT: pre-login emails (invite, OTP) NEVER mention rewards/PYRX — testers first learn of
// rewards on their dashboard. Stored Brevo template ids are used when configured, else inline HTML.
const API_KEY = process.env.BREVO_API_KEY || "";
const SENDER_EMAIL = process.env.BREVO_SENDER || "no-reply@pyraxchain.com";
const SENDER_NAME = process.env.BREVO_DEVNET_SENDER_NAME || "PYRAX Devnet";
const PUBLIC_URL = process.env.PUBLIC_URL || "https://devnet.pyraxchain.com";
const CDN = "https://pyrax.tor1.cdn.digitaloceanspaces.com/email";
const OTP_TEMPLATE_ID = Number(process.env.BREVO_DEVNET_OTP_TEMPLATE_ID || 0);

const C = { bg: "#06070b", card: "#0e1018", box: "#05060a", line: "#222838", ink: "#f7f9fd", muted: "#9aa4ba", faint: "#6a7286", gold: "#fcd03d", brand: "#f58622" };

function shell(title: string, inner: string): string {
  const year = new Date().getFullYear();
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>${title}</title></head>
<body style="margin:0;padding:0;background:${C.bg};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${title} — PYRAX Devnet.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:32px 12px;"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
    <tr><td align="center" style="padding:6px 0 22px;">
      <img src="${CDN}/pyrax-logo.png" width="148" alt="PYRAX" style="display:block;border:0;width:148px;max-width:60%;height:auto;">
    </td></tr>
    <tr><td style="background:${C.card};border:1px solid ${C.line};border-radius:16px;overflow:hidden;">
      <img src="${CDN}/flame-bar-v2.png" width="560" height="6" alt="" style="display:block;width:100%;height:6px;border:0;">
      <div style="padding:36px 34px;">${inner}</div>
    </td></tr>
    <tr><td align="center" style="padding:22px 8px;font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:${C.faint};line-height:1.7;">
      <strong style="color:${C.muted};">PYRAX Devnet — Closed Alpha</strong> &nbsp;·&nbsp; <a href="https://devnet.pyraxchain.com" style="color:${C.brand};text-decoration:none;font-weight:600;">devnet.pyraxchain.com</a><br>© ${year} PYRAX LLC · Authorized testers only
    </td></tr>
  </table>
</td></tr></table></body></html>`;
}

function renderOtp(code: string, expires: string): string {
  const spaced = code.split("").join("&#8202;");
  return shell("Your Devnet sign-in code", `
    <h1 style="margin:0 0 8px;font-family:'Segoe UI',Arial,sans-serif;font-size:22px;font-weight:800;color:${C.ink};text-align:center;">Your sign-in code</h1>
    <p style="margin:0 0 22px;font-family:'Segoe UI',Arial,sans-serif;font-size:15px;color:${C.muted};line-height:1.6;text-align:center;">Use this one-time code to sign in to the PYRAX Devnet Tester Portal.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="background:${C.box};border:1.5px solid ${C.brand};border-radius:12px;padding:24px 12px;">
      <span style="font-family:'Courier New',monospace;font-size:34px;font-weight:700;letter-spacing:9px;color:${C.gold};">${spaced}</span>
    </td></tr></table>
    <p style="margin:20px 0 0;font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:${C.muted};line-height:1.6;text-align:center;">Expires at <strong style="color:${C.ink};">${expires}</strong> · one-time use</p>
    <p style="margin:18px 0 0;font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:${C.faint};line-height:1.6;text-align:center;">Didn't try to sign in? You can ignore this email.</p>`);
}

function renderInvite(token: string): string {
  const link = `${PUBLIC_URL}/join?token=${encodeURIComponent(token)}`;
  return shell("You're invited to the PYRAX Devnet", `
    <h1 style="margin:0 0 10px;font-family:'Segoe UI',Arial,sans-serif;font-size:23px;font-weight:800;color:${C.ink};">You're in the closed Alpha.</h1>
    <p style="margin:0 0 22px;font-family:'Segoe UI',Arial,sans-serif;font-size:15px;color:${C.muted};line-height:1.65;">You've been invited to help test the <strong style="color:${C.ink};">PYRAX network</strong> as a closed-alpha tester. Click below to set up your tester account — it takes a minute.</p>
    <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:10px;background:${C.brand};">
      <a href="${link}" style="display:inline-block;padding:14px 28px;font-family:'Segoe UI',Arial,sans-serif;font-size:15px;font-weight:700;color:#1a0f06;text-decoration:none;border-radius:10px;">Accept your invite →</a>
    </td></tr></table>
    <p style="margin:22px 0 0;font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:${C.muted};line-height:1.6;">You'll run a node via the Inferno app or the CLI, file bug reports, and help shape the network before mainnet.</p>
    <p style="margin:14px 0 0;font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:${C.faint};line-height:1.6;">This invite link is personal to you and expires in 14 days. If it wasn't meant for you, ignore this email.</p>`);
}

function renderRelease(version: string, title: string, notes: string, downloadUrl?: string): string {
  const dl = downloadUrl ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:18px;"><tr><td style="border-radius:10px;background:${C.brand};"><a href="${downloadUrl}" style="display:inline-block;padding:13px 26px;font-family:'Segoe UI',Arial,sans-serif;font-size:15px;font-weight:700;color:#1a0f06;text-decoration:none;border-radius:10px;">Update now →</a></td></tr></table>` : "";
  return shell(`New build: ${version}`, `
    <div style="font-family:'Segoe UI',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:1px;color:${C.brand};text-transform:uppercase;">New release · ${version}</div>
    <h1 style="margin:6px 0 10px;font-family:'Segoe UI',Arial,sans-serif;font-size:22px;font-weight:800;color:${C.ink};">${title || "A new build is available"}</h1>
    <p style="margin:0;font-family:'Segoe UI',Arial,sans-serif;font-size:14px;color:${C.muted};line-height:1.7;white-space:pre-wrap;">${notes}</p>
    ${dl}
    <p style="margin:18px 0 0;font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:${C.faint};line-height:1.6;">Please update promptly + keep your node online so we get clean test data.</p>`);
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!API_KEY) { console.warn("[email] BREVO_API_KEY not set — skipping", subject, "->", to); return false; }
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST", headers: { "api-key": API_KEY, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ sender: { email: SENDER_EMAIL, name: SENDER_NAME }, to: [{ email: to }], subject, htmlContent: html }),
    });
    if (!res.ok) { console.error("[email] Brevo", res.status, await res.text().catch(() => "")); return false; }
    return true;
  } catch (e) { console.error("[email] send failed:", e); return false; }
}
async function sendTemplate(to: string, templateId: number, params: Record<string, unknown>): Promise<boolean> {
  if (!API_KEY) return false;
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST", headers: { "api-key": API_KEY, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ templateId, params, to: [{ email: to }] }),
    });
    return res.ok;
  } catch { return false; }
}

function fmtExpiry(ms: number): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(ms)) + " UTC";
}

export const sendOtp = (to: string, code: string, expiresAt: number) =>
  OTP_TEMPLATE_ID ? sendTemplate(to, OTP_TEMPLATE_ID, { otp: code, expires: fmtExpiry(expiresAt) }) : sendEmail(to, "Your PYRAX Devnet sign-in code", renderOtp(code, fmtExpiry(expiresAt)));
export const sendInvite = (to: string, token: string) => sendEmail(to, "Your PYRAX Devnet closed-alpha invite", renderInvite(token));
export const sendReleaseAlert = (to: string, version: string, title: string, notes: string, downloadUrl?: string) => sendEmail(to, `PYRAX Devnet — new build ${version}`, renderRelease(version, title, notes, downloadUrl));
