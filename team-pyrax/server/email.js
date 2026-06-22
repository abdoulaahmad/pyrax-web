// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// team-pyrax — transactional email via Brevo (the magic-link send). Uses Brevo's
// REST SMTP endpoint with the api-key header; no SDK. If BREVO_API_KEY is unset
// (local dev) the link is logged instead so sign-in still works.

import { BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME } from "./config.js";

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

/** Mail the sign-in link. Throws on a hard send failure so the caller can log it —
 *  the HTTP layer still returns the generic "if allowed, a link is on its way" so
 *  the outcome never reveals whether the address is whitelisted. */
export async function sendMagicLink(email, url) {
  if (!BREVO_API_KEY) {
    console.warn(`[team-pyrax] BREVO_API_KEY unset — sign-in link for ${email}:\n  ${url}`);
    return;
  }
  const res = await fetch(BREVO_ENDPOINT, {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { email: BREVO_SENDER_EMAIL, name: BREVO_SENDER_NAME },
      to: [{ email }],
      subject: "Your PYRAX Team sign-in link",
      htmlContent: htmlBody(url),
      textContent:
        `Sign in to the PYRAX Team portal:\n\n${url}\n\n` +
        `This link expires in 15 minutes and can be used once.\n` +
        `If you didn't request it, you can safely ignore this email.`,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`brevo send failed: ${res.status} ${body.slice(0, 300)}`);
  }
}

/** A minimal, dark, on-brand HTML email (inline styles — email clients ignore
 *  <style>/external CSS). */
function htmlBody(url) {
  const safe = String(url).replace(/"/g, "%22");
  return `<!doctype html>
<html><body style="margin:0;background:#050609;font-family:Inter,Segoe UI,Arial,sans-serif;color:#f7f9fd">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050609;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#0c0e16;border:1px solid #232838;border-radius:16px;overflow:hidden">
        <tr><td style="padding:28px 32px 8px">
          <div style="font-family:Sora,Inter,Arial,sans-serif;font-weight:800;font-size:18px;letter-spacing:.04em;color:#f5a623">PYRAX&nbsp;TEAM</div>
        </td></tr>
        <tr><td style="padding:8px 32px 4px;font-family:Sora,Inter,Arial,sans-serif;font-size:22px;font-weight:700;color:#f7f9fd">Sign in</td></tr>
        <tr><td style="padding:6px 32px 20px;font-size:14px;line-height:1.6;color:#9aa4ba">
          Click the button below to sign in to the PYRAX Team portal. This link expires in <strong style="color:#f7f9fd">15 minutes</strong> and can be used once.
        </td></tr>
        <tr><td style="padding:0 32px 28px">
          <a href="${safe}" style="display:inline-block;padding:13px 22px;border-radius:11px;background:linear-gradient(100deg,#fcd03d,#f58622 58%,#d75427);color:#1a0f02;font-weight:700;font-size:15px;text-decoration:none">Sign in to PYRAX Team</a>
        </td></tr>
        <tr><td style="padding:0 32px 26px;font-size:12px;line-height:1.6;color:#6a7286;border-top:1px solid #171b27">
          <div style="padding-top:16px">If the button doesn't work, paste this URL into your browser:</div>
          <div style="word-break:break-all;color:#9aa4ba;margin-top:6px">${safe}</div>
          <div style="margin-top:16px">If you didn't request this, you can safely ignore this email — no one can sign in without the link.</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
