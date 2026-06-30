// SPDX-License-Identifier: LicenseRef-Proprietary
//
// PYRAX email-signature renderer. Produces the official operator-card signature (the exact design
// from pyrax-branding/email-signature/pyrax-signature.html), personalized from a member's profile:
//   • name / title / email / phone come from their profile
//   • the "Find Me Here" personal-social row shows ONLY the platforms they filled in (hidden entirely
//     if none)
//   • the "Book a Meeting With Me" banner appears ONLY if they set a Microsoft Bookings link
// The company-static blocks (spec readout, Community, Office, disclaimer) are fixed brand content.
import { SOCIAL_FIELDS, socialUrl, type SocialKey } from "../lib/profile";

const CDN = "https://pyrax.tor1.cdn.digitaloceanspaces.com/email";

export interface SignatureUser {
  displayName: string;
  position: string;
  email: string;
  phone: string | null;
  bookingUrl: string | null;
  socials: Record<string, string>;
}

function esc(s: string): string {
  return (s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

// Per-platform icon cell (matches the source signature's "Find Me Here" sizing + dark-mode swaps).
const ICONS: Record<SocialKey, string> = {
  facebook: `<img src="${CDN}/social/v2/icon-facebook.png" width="16" height="16" alt="Facebook" title="Facebook" style="display:block; width:16px; height:16px; border:0; outline:none;">`,
  x: `<img class="px-ico-l" src="${CDN}/social/v2/icon-x.png" width="18" height="16" alt="X" title="X" style="display:block; width:18px; height:16px; border:0; outline:none;"><img class="px-ico-d" src="${CDN}/social/v2/icon-x-dark.png" width="18" height="16" alt="X" title="X" style="display:none; width:18px; height:16px; border:0; outline:none;">`,
  telegram: `<img src="${CDN}/social/v2/icon-telegram.png" width="16" height="16" alt="Telegram" title="Telegram" style="display:block; width:16px; height:16px; border:0; outline:none;">`,
  discord: `<img src="${CDN}/social/v2/icon-discord.png" width="21" height="16" alt="Discord" title="Discord" style="display:block; width:21px; height:16px; border:0; outline:none;">`,
  youtube: `<img src="${CDN}/social/v2/icon-youtube.png" width="23" height="16" alt="YouTube" title="YouTube" style="display:block; width:23px; height:16px; border:0; outline:none;">`,
  github: `<img class="px-ico-l" src="${CDN}/social/v2/icon-github.png" width="16" height="16" alt="GitHub" title="GitHub" style="display:block; width:16px; height:16px; border:0; outline:none;"><img class="px-ico-d" src="${CDN}/social/v2/icon-github-dark.png" width="16" height="16" alt="GitHub" title="GitHub" style="display:none; width:16px; height:16px; border:0; outline:none;">`,
  linkedin: `<img src="${CDN}/social/v2/icon-linkedin.png" width="16" height="16" alt="LinkedIn" title="LinkedIn" style="display:block; width:16px; height:16px; border:0; outline:none;">`,
};

/** The personal-social row — only platforms the member filled in; empty ⇒ "" (row omitted). */
function findMeHere(socials: Record<string, string>): string {
  const present = SOCIAL_FIELDS.filter((f) => socials?.[f.key] && socials[f.key].trim());
  if (!present.length) return "";
  const spacer = `<td style="width:13px; font-size:0; line-height:0;">&nbsp;</td>`;
  const icons = present
    .map((f) => `<td style="vertical-align:middle;"><a href="${esc(socialUrl(f.key, socials[f.key]))}" style="text-decoration:none;">${ICONS[f.key]}</a></td>`)
    .join(spacer);
  return `
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse; margin-top:9px;">
              <tr>
                <td style="font-size:9.5px; font-weight:700; color:#f58622; text-transform:uppercase; letter-spacing:1px; vertical-align:middle; padding-right:12px; white-space:nowrap;">&#9656;&nbsp;Find&nbsp;Me&nbsp;Here</td>
                ${icons}
              </tr>
            </table>`;
}

/** The phone fragment of the DIRECT line — omitted (with its separator) when there's no phone. */
function phoneFragment(phone: string | null): string {
  if (!phone || !phone.trim()) return "";
  const tel = phone.replace(/[^\d+]/g, "");
  return `<span class="px-sep" style="color:#c4cad4;">&nbsp;&nbsp;|&nbsp;&nbsp;</span><a class="px-link" href="tel:${esc(tel)}" style="color:#1c63a6; text-decoration:none;">${esc(phone)}</a>`;
}

/** The "Book a Meeting With Me" banner — only when a Bookings link is set. */
function bookingBanner(url: string | null): string {
  if (!url || !url.trim()) return "";
  return `
  <tr>
    <td style="padding:16px 4px 2px 4px;">
      <a href="${esc(url)}" style="text-decoration:none;"><img src="${CDN}/book-meeting-v2.png" width="592" height="48" alt="Book a Meeting With Me" title="Book a Meeting With Me" style="display:block; width:100%; max-width:592px; height:auto; border:0; outline:none;"></a>
    </td>
  </tr>`;
}

/** The signature itself: the <table class="px-wrap"> block users paste into their email client. */
export function renderSignatureInner(u: SignatureUser): string {
  return `<table class="px-wrap" role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px; max-width:600px; border-collapse:collapse; background-color:transparent; font-family:'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">

  <tr>
    <td style="padding:0; font-size:0; line-height:0;">
      <img class="px-bar" src="${CDN}/pyrax-divider.png" width="600" height="4" alt="" style="display:block; width:600px; height:4px; border:0; outline:none;">
    </td>
  </tr>

  <tr>
    <td style="padding:15px 4px 11px 4px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        <tr>
          <td valign="top" style="padding:2px 15px 0 0;">
            <img src="${CDN}/pyrax-badge.png" width="74" height="74" alt="PYRAX" style="display:block; width:74px; height:74px; border:0; outline:none;">
          </td>
          <td valign="top" style="padding:0;">
            <div class="px-name" style="font-family:'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size:18px; font-weight:800; color:#11161f; line-height:1.1; letter-spacing:.2px;">${esc(u.displayName)}</div>
            <div style="padding-top:5px; font-size:0; line-height:0;">
              <img src="${CDN}/pyrax-divider.png" width="104" height="3" alt="" style="display:block; width:104px; height:3px; border:0; outline:none;">
            </div>
            <div style="padding-top:7px; font-family:'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size:11.5px; line-height:1.3;">
              <span style="color:#f58622;">&#9670;</span>
              <span style="color:#f58622; font-weight:700;">${esc(u.position)}</span>
              <span class="px-sep" style="color:#9aa3b1;">&nbsp;&middot;&nbsp;</span>
              <span class="px-co" style="color:#5b6573; font-weight:600;">PYRAX&nbsp;LLC</span>
            </div>
${findMeHere(u.socials)}
            <div class="px-tag px-tagw" style="padding-top:6px; white-space:nowrap; font-family:'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size:11px; font-style:italic; line-height:1.4; color:#5b6573;">
              A privacy first Layer&#8209;1 that doubles as a decentralized AI supercomputer.
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <tr>
    <td style="padding:2px 4px 0 4px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; border-collapse:collapse; table-layout:fixed;">
        <tr>
          <td class="px-spec" width="25%" valign="top" style="width:25%; text-align:center; padding:0 6px;">
            <div style="font-family:'Segoe UI', Arial, sans-serif; font-size:8px; font-weight:700; letter-spacing:1px; color:#f58622; text-transform:uppercase;">Token</div>
            <div class="px-tileval" style="padding-top:2px; font-family:'Consolas','SF Mono',monospace; font-size:12.5px; font-weight:700; color:#11161f;">$PYRX</div>
          </td>
          <td class="px-vrule px-spec" width="25%" valign="top" style="width:25%; text-align:center; padding:0 6px; border-left:1px solid #e6e9f0;">
            <div style="font-family:'Segoe UI', Arial, sans-serif; font-size:8px; font-weight:700; letter-spacing:1px; color:#f58622; text-transform:uppercase;">Consensus</div>
            <div class="px-tileval" style="padding-top:2px; font-family:'Consolas','SF Mono',monospace; font-size:12.5px; font-weight:700; color:#11161f;">GhostDAG</div>
          </td>
          <td class="px-vrule px-spec" width="25%" valign="top" style="width:25%; text-align:center; padding:0 6px; border-left:1px solid #e6e9f0;">
            <div style="font-family:'Segoe UI', Arial, sans-serif; font-size:8px; font-weight:700; letter-spacing:1px; color:#f58622; text-transform:uppercase;">Shielded&nbsp;by</div>
            <div class="px-tileval" style="padding-top:2px; font-family:'Consolas','SF Mono',monospace; font-size:12.5px; font-weight:700; color:#11161f;">zk&#8209;SNARKs</div>
          </td>
          <td class="px-vrule px-spec" width="25%" valign="top" style="width:25%; text-align:center; padding:0 6px; border-left:1px solid #e6e9f0;">
            <div style="font-family:'Segoe UI', Arial, sans-serif; font-size:8px; font-weight:700; letter-spacing:1px; color:#f58622; text-transform:uppercase;">Compute&nbsp;&amp;&nbsp;Inference</div>
            <div class="px-tileval" style="padding-top:2px; font-family:'Consolas','SF Mono',monospace; font-size:12.5px; font-weight:700; color:#11161f;">NEURAX</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <tr>
    <td style="padding:10px 4px 0 4px; font-size:0; line-height:0;">
      <img class="px-bar" src="${CDN}/pyrax-divider.png" width="592" height="3" alt="" style="display:block; width:592px; height:3px; border:0; outline:none;">
    </td>
  </tr>

  <tr>
    <td style="padding:11px 4px 4px 4px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        <tr>
          <td style="padding:0 0 13px 0; font-family:'Segoe UI', Arial, sans-serif; font-size:11.5px; line-height:1.4;">
            <span style="display:inline-block; width:84px; font-size:9.5px; font-weight:700; color:#f58622; text-transform:uppercase; letter-spacing:1px;">&#9656;&nbsp;Direct</span>
            <a class="px-link" href="mailto:${esc(u.email)}" style="color:#1c63a6; text-decoration:none; font-weight:600;">${esc(u.email)}</a>${phoneFragment(u.phone)}
          </td>
        </tr>
        <tr>
          <td style="padding:0 0 13px 0; font-family:'Segoe UI', Arial, sans-serif; font-size:11.5px; line-height:1.4;">
            <span style="display:inline-block; width:84px; font-size:9.5px; font-weight:700; color:#f58622; text-transform:uppercase; letter-spacing:1px;">&#9656;&nbsp;Network</span>
            <a class="px-link" href="https://pyraxchain.com" style="color:#1c63a6; text-decoration:none; font-weight:600;">pyraxchain.com</a>
            <span class="px-sep" style="color:#c4cad4;">&nbsp;&middot;&nbsp;</span>
            <a class="px-link2" href="https://explorer.pyraxchain.com" style="color:#3a4453; text-decoration:none;">Explorer</a>
            <span class="px-sep" style="color:#c4cad4;">&nbsp;&middot;&nbsp;</span>
            <a class="px-link2" href="https://nodes.pyraxchain.com" style="color:#3a4453; text-decoration:none;">Nodes</a>
            <span class="px-sep" style="color:#c4cad4;">&nbsp;&middot;&nbsp;</span>
            <a class="px-link2" href="https://pyraxchain.com/docs.html" style="color:#3a4453; text-decoration:none;">Docs</a>
          </td>
        </tr>
        <tr>
          <td style="padding:1px 0 13px 0; font-family:'Segoe UI', Arial, sans-serif;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
              <tr>
                <td style="width:84px; font-size:9.5px; font-weight:700; color:#f58622; text-transform:uppercase; letter-spacing:1px; vertical-align:middle;">&#9656;&nbsp;Community</td>
                <td style="vertical-align:middle;"><a href="https://www.facebook.com/groups/pyraxchain" style="text-decoration:none;"><img src="${CDN}/social/v2/icon-facebook.png" width="18" height="18" alt="Facebook" title="PYRAX on Facebook" style="display:block; width:18px; height:18px; border:0; outline:none;"></a></td>
                <td style="width:16px; font-size:0; line-height:0;">&nbsp;</td>
                <td style="vertical-align:middle;"><a href="https://x.com/PYRAX_Official" style="text-decoration:none;"><img class="px-ico-l" src="${CDN}/social/v2/icon-x.png" width="20" height="18" alt="X" title="PYRAX on X" style="display:block; width:20px; height:18px; border:0; outline:none;"><img class="px-ico-d" src="${CDN}/social/v2/icon-x-dark.png" width="20" height="18" alt="X" title="PYRAX on X" style="display:none; width:20px; height:18px; border:0; outline:none;"></a></td>
                <td style="width:16px; font-size:0; line-height:0;">&nbsp;</td>
                <td style="vertical-align:middle;"><a href="https://t.me/+3DreJAHGxqhjYWQx" style="text-decoration:none;"><img src="${CDN}/social/v2/icon-telegram.png" width="18" height="18" alt="Telegram" title="PYRAX on Telegram" style="display:block; width:18px; height:18px; border:0; outline:none;"></a></td>
                <td style="width:16px; font-size:0; line-height:0;">&nbsp;</td>
                <td style="vertical-align:middle;"><a href="https://discord.gg/cEX6uQn24" style="text-decoration:none;"><img src="${CDN}/social/v2/icon-discord.png" width="24" height="18" alt="Discord" title="PYRAX on Discord" style="display:block; width:24px; height:18px; border:0; outline:none;"></a></td>
                <td style="width:16px; font-size:0; line-height:0;">&nbsp;</td>
                <td style="vertical-align:middle;"><a href="https://www.youtube.com/@PYRAXNETWORK" style="text-decoration:none;"><img src="${CDN}/social/v2/icon-youtube.png" width="26" height="18" alt="YouTube" title="PYRAX on YouTube" style="display:block; width:26px; height:18px; border:0; outline:none;"></a></td>
                <td style="width:16px; font-size:0; line-height:0;">&nbsp;</td>
                <td style="vertical-align:middle;"><a href="https://github.com/PYRAX-NETWORK" style="text-decoration:none;"><img class="px-ico-l" src="${CDN}/social/v2/icon-github.png" width="19" height="18" alt="GitHub" title="PYRAX on GitHub" style="display:block; width:19px; height:18px; border:0; outline:none;"><img class="px-ico-d" src="${CDN}/social/v2/icon-github-dark.png" width="19" height="18" alt="GitHub" title="PYRAX on GitHub" style="display:none; width:19px; height:18px; border:0; outline:none;"></a></td>
                <td style="width:16px; font-size:0; line-height:0;">&nbsp;</td>
                <td style="vertical-align:middle;"><a href="https://www.linkedin.com/company/pyrax-llc/" style="text-decoration:none;"><img src="${CDN}/social/v2/icon-linkedin.png" width="18" height="18" alt="LinkedIn" title="PYRAX on LinkedIn" style="display:block; width:18px; height:18px; border:0; outline:none;"></a></td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0; font-family:'Segoe UI', Arial, sans-serif; font-size:11.5px; line-height:1.4;">
            <span style="display:inline-block; width:84px; font-size:9.5px; font-weight:700; color:#f58622; text-transform:uppercase; letter-spacing:1px;">&#9656;&nbsp;Office</span>
            <a class="px-link2" href="https://maps.google.com/?q=30+N+Gould+St+Ste+N,+Sheridan,+WY+82801" style="color:#3a4453; text-decoration:none;">30 N Gould St Ste N, Sheridan, WY 82801</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
${bookingBanner(u.bookingUrl)}
  <tr>
    <td style="padding:11px 4px 0 4px; font-size:0; line-height:0;">
      <div class="px-hair" style="border-top:1px solid #e6e9f0; font-size:0; line-height:0;">&nbsp;</div>
    </td>
  </tr>

  <tr>
    <td class="px-disc" style="padding:9px 4px 0 4px; font-family:'Segoe UI', Arial, sans-serif; font-size:9.5px; line-height:1.5; color:#8a94a3;">
      <p style="margin:0 0 5px 0;">
        <strong class="px-disc-strong" style="color:#6b7482;">Confidentiality</strong> &mdash; This email and any attachments are confidential and intended only for the named recipient. If you received it in error, please notify the sender and delete it; do not copy, forward, or act on its contents.
      </p>
      <p style="margin:0 0 5px 0;">
        <strong class="px-disc-strong" style="color:#6b7482;">No financial advice</strong> &mdash; Nothing here is financial, investment, legal, or tax advice, nor an offer or solicitation to buy or sell any digital asset. PYRX is a utility token of the PYRAX network; digital assets are volatile and carry the risk of total loss. PYRAX&nbsp;LLC makes no price or market&#8209;cap predictions &mdash; do your own research.
      </p>
      <p style="margin:0 0 5px 0;">
        <strong class="px-disc-strong" style="color:#6b7482;">Security</strong> &mdash; PYRAX may contact you through official channels, including email and, where the law permits, direct outreach such as a phone call. We will never ask for your seed phrase or private keys, request funds, or send unsolicited social&#8209;media direct messages asking you to connect a wallet, send crypto, or share private credentials &mdash; treat any message that does as a scam. Verify every link against <span class="px-disc-strong" style="color:#6b7482;">pyraxchain.com</span> before acting; our only official channels are the ones listed above.
      </p>
      <p style="margin:0; color:#aab2bf;">&copy; 2026 PYRAX&nbsp;LLC. All rights reserved.</p>
    </td>
  </tr>

</table>`;
}

// The dark-mode color overrides (light text + dark-variant icons). Used inside the adaptive
// media query for the real signature, OR applied unconditionally for a forced dark preview.
const DARK_RULES = `
    .px-name{color:#f7f9fd!important;}.px-co{color:#c4cad4!important;}.px-tag{color:#aab2bf!important;}
    .px-vrule{border-left-color:#2a313c!important;}.px-tileval{color:#f7f9fd!important;}.px-link{color:#5aa6e0!important;}
    .px-link2{color:#c4cad4!important;}.px-sep{color:#3a4453!important;}.px-hair{border-color:#2a313c!important;}
    .px-disc{color:#9aa3b1!important;}.px-disc-strong{color:#c4cad4!important;}.px-ico-l{display:none!important;}.px-ico-d{display:block!important;}`;
const OGSC_RULES = `
  [data-ogsc] .px-name{color:#f7f9fd!important;}[data-ogsc] .px-co{color:#c4cad4!important;}[data-ogsc] .px-tag{color:#aab2bf!important;}
  [data-ogsc] .px-vrule{border-left-color:#2a313c!important;}[data-ogsc] .px-tileval{color:#f7f9fd!important;}[data-ogsc] .px-link{color:#5aa6e0!important;}
  [data-ogsc] .px-link2{color:#c4cad4!important;}[data-ogsc] .px-sep{color:#3a4453!important;}[data-ogsc] .px-hair{border-color:#2a313c!important;}
  [data-ogsc] .px-disc{color:#9aa3b1!important;}[data-ogsc] .px-disc-strong{color:#c4cad4!important;}[data-ogsc] .px-ico-l{display:none!important;}[data-ogsc] .px-ico-d{display:block!important;}`;
const MOBILE = `
  @media screen and (max-width:480px){
    .px-wrap{width:100%!important;}.px-bar{width:100%!important;}
    .px-spec{display:block!important;width:auto!important;text-align:left!important;border-left:0!important;padding:6px 0 0 0!important;}
    .px-tagw{white-space:normal!important;}.px-name{font-size:17px!important;}.px-link,.px-link2{word-break:break-word!important;}}`;

export type SignatureTheme = "auto" | "light" | "dark";

// "auto" = the real, OS-adaptive signature (used for copy + the downloaded .htm). "light"/"dark"
// FORCE a fixed look — used only by the portal preview so it never depends on the viewer's OS.
function styleBlock(theme: SignatureTheme): string {
  if (theme === "light") return `:root{color-scheme:light;}${MOBILE}`;
  if (theme === "dark") return `:root{color-scheme:dark;}${DARK_RULES}${MOBILE}`;
  return `:root{color-scheme:light dark;}
  @media (prefers-color-scheme: dark){${DARK_RULES}}${OGSC_RULES}${MOBILE}`;
}

/** Full standalone HTML document. Background is transparent (the signature sits on the email's own
 *  background). `theme`: "auto" for the real adaptive signature; "light"/"dark" force the preview. */
export function renderSignatureDoc(u: SignatureUser, theme: SignatureTheme = "auto"): string {
  const cs = theme === "auto" ? "light dark" : theme;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="${cs}">
<meta name="supported-color-schemes" content="${cs}">
<title>PYRAX&trade; — Email Signature</title>
<link rel="icon" type="image/png" href="${CDN}/favicon.png">
<style>${styleBlock(theme)}</style>
</head>
<body style="margin:0; padding:24px; background:transparent;">
${renderSignatureInner(u)}
</body>
</html>`;
}
