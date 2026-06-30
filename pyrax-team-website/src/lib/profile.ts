// SPDX-License-Identifier: LicenseRef-Proprietary
//
// The team-member profile schema: which fields are mandatory, the @pyraxchain.com email rule,
// and the social-handle uniqueness rule (a member's personal handle must not collide with the
// company's official handle). Shared by the onboarding form + the server validation.

export const COMPANY_EMAIL_DOMAIN = "pyraxchain.com";

/** The company's OFFICIAL social handles. A member's personal handle must differ from these.
 *  Configure to the real handles; comparison is case-insensitive and ignores a leading '@'. */
export const COMPANY_SOCIALS: Record<SocialKey, string> = {
  facebook: "pyraxnetwork",
  x: "pyraxnetwork",
  telegram: "pyraxnetwork",
  discord: "pyraxnetwork",
  youtube: "pyraxnetwork",
  github: "pyrax-network",
  linkedin: "pyrax-network",
};

export type SocialKey = "facebook" | "x" | "telegram" | "discord" | "youtube" | "github" | "linkedin";

export interface SocialField {
  key: SocialKey;
  label: string;
  placeholder: string;
  hint: string;
}

export const SOCIAL_FIELDS: SocialField[] = [
  { key: "facebook", label: "Facebook", placeholder: "facebook.com/yourprofile", hint: "Profile URL or username" },
  { key: "x", label: "X (Twitter)", placeholder: "@yourhandle", hint: "@handle" },
  { key: "telegram", label: "Telegram", placeholder: "@yourname", hint: "@username" },
  { key: "discord", label: "Discord", placeholder: "yourname", hint: "Username" },
  { key: "youtube", label: "YouTube", placeholder: "youtube.com/@yourchannel", hint: "Channel URL or @handle" },
  { key: "github", label: "GitHub", placeholder: "github.com/yourprofile", hint: "Profile URL or username" },
  { key: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/yourprofile", hint: "Profile URL" },
];

export interface MemberProfile {
  displayName: string;
  email: string;
  position: string; // job title / position — REQUIRED
  phone?: string;
  bookingUrl?: string; // Microsoft Bookings / "Book with me" link (optional)
  socials: Partial<Record<SocialKey, string>>;
}

/** Allowed hosts for a Microsoft Bookings / "Book with me" link. Keeps the signature CTA safe. */
const BOOKING_HOSTS = ["outlook.office.com", "outlook.office365.com", "outlook.live.com", "book.ms", "bookings.microsoft.com"];

/** Validate + normalize a Microsoft Bookings link. Empty is allowed (optional). Must be https and
 *  a real Microsoft Bookings host — this both blocks junk and keeps the rendered href HTML-safe. */
export function validateBookingUrl(input: string): { ok: boolean; url?: string; error?: string } {
  const s = (input || "").trim();
  if (!s) return { ok: true, url: "" };
  let u: URL;
  try { u = new URL(s); } catch { return { ok: false, error: "Enter a full link starting with https://" }; }
  if (u.protocol !== "https:") return { ok: false, error: "The link must start with https://" };
  const host = u.hostname.toLowerCase();
  if (!BOOKING_HOSTS.some((h) => host === h || host.endsWith("." + h))) {
    return { ok: false, error: "Use your Microsoft Bookings link (e.g. outlook.office.com/bookwithme/…)." };
  }
  return { ok: true, url: u.toString() };
}

/* ============================================================== Phone number =====
 * Enforced display format: +<country code> (XXX) XXX-XXXX  e.g.  +1 (825) 882-5915.
 * The leading country code is VERIFIED against the real ITU-T E.164 calling-code list — a made-up
 * code like +999 is rejected. +1 (North American Numbering Plan) numbers use the (NPA) NXX-XXXX
 * grouping; other valid codes use spaced groups. No '+' typed ⇒ assume +1 (the default locale). */

/** Real ITU-T E.164 country calling codes (geographic). Prefix-free, so the correct code is the
 *  shortest matching prefix. Pure non-geographic service codes (800/870/882…) are intentionally
 *  excluded — we want an actual country code. */
export const COUNTRY_CALLING_CODES = new Set<string>([
  "1", "7",
  "20", "27", "30", "31", "32", "33", "34", "36", "39", "40", "41", "43", "44", "45", "46", "47", "48", "49",
  "51", "52", "53", "54", "55", "56", "57", "58", "60", "61", "62", "63", "64", "65", "66",
  "81", "82", "84", "86", "90", "91", "92", "93", "94", "95", "98",
  "211", "212", "213", "216", "218", "220", "221", "222", "223", "224", "225", "226", "227", "228", "229",
  "230", "231", "232", "233", "234", "235", "236", "237", "238", "239", "240", "241", "242", "243", "244", "245", "246", "247", "248", "249",
  "250", "251", "252", "253", "254", "255", "256", "257", "258", "260", "261", "262", "263", "264", "265", "266", "267", "268", "269",
  "290", "291", "297", "298", "299",
  "350", "351", "352", "353", "354", "355", "356", "357", "358", "359", "370", "371", "372", "373", "374", "375", "376", "377", "378", "380", "381", "382", "383", "385", "386", "387", "389",
  "420", "421", "423", "500", "501", "502", "503", "504", "505", "506", "507", "508", "509",
  "590", "591", "592", "593", "594", "595", "596", "597", "598", "599",
  "670", "672", "673", "674", "675", "676", "677", "678", "679", "680", "681", "682", "683", "685", "686", "687", "688", "689", "690", "691", "692",
  "850", "852", "853", "855", "856", "880", "886",
  "960", "961", "962", "963", "964", "965", "966", "967", "968", "970", "971", "972", "973", "974", "975", "976", "977", "992", "993", "994", "995", "996", "998",
]);

const MAX_E164_DIGITS = 15;
const onlyDigits = (s: string): string => (s || "").replace(/\D/g, "");

function detectCallingCode(digits: string): string | null {
  for (const len of [1, 2, 3]) {
    const cc = digits.slice(0, len);
    if (COUNTRY_CALLING_CODES.has(cc)) return cc;
  }
  return null;
}

/** Split raw input into { cc, national }. No leading '+' ⇒ assume NANP (+1). */
export function parsePhone(input: string): { cc: string | null; national: string; hadPlus: boolean } {
  const hadPlus = (input || "").trim().startsWith("+");
  const digits = onlyDigits(input);
  if (hadPlus) {
    const cc = detectCallingCode(digits);
    return { cc, national: cc ? digits.slice(cc.length) : digits, hadPlus };
  }
  return { cc: "1", national: digits, hadPlus };
}

/** Graceful display formatter — works on partial input as the user types. */
export function formatPhone(input: string): string {
  const { cc, national } = parsePhone(input);
  if (!cc) return "+" + onlyDigits(input); // unknown code: keep digits visible so it can be fixed
  const d = national.slice(0, cc === "1" ? 10 : MAX_E164_DIGITS - cc.length);
  if (cc === "1") {
    const a = d.slice(0, 3), b = d.slice(3, 6), c = d.slice(6, 10);
    let out = "+1";
    if (a) out += " (" + a + (a.length === 3 ? ")" : "");
    if (b) out += " " + b;
    if (c) out += "-" + c;
    return out;
  }
  // groups of 3, but the final group absorbs the remainder so we never show a lone digit
  const groups: string[] = [];
  for (let i = 0; i < d.length;) {
    if (d.length - i > 4) { groups.push(d.slice(i, i + 3)); i += 3; }
    else { groups.push(d.slice(i)); break; }
  }
  return "+" + cc + (d ? " " + groups.join(" ") : "");
}

export interface PhoneCheck { ok: boolean; error?: string; e164?: string; formatted: string; }

/** Strict validation: the country code must be a real ITU calling code and the number a sane
 *  E.164 length. Returns the canonical formatted + E.164 forms. */
export function validatePhone(input: string): PhoneCheck {
  const formatted = formatPhone(input);
  const { cc, national, hadPlus } = parsePhone(input);
  if (!cc) return { ok: false, error: hadPlus ? "That isn't a real country calling code (try +1, +44, +91…)." : "Include a valid country code, e.g. +1.", formatted };
  if (cc === "1" && national.length !== 10) return { ok: false, error: "A +1 number needs 10 digits — e.g. +1 (825) 882-5915.", formatted };
  if (cc !== "1" && (national.length < 4 || national.length > MAX_E164_DIGITS - cc.length)) return { ok: false, error: `That number length looks off for +${cc}.`, formatted };
  return { ok: true, e164: "+" + cc + national, formatted };
}

/** Mandatory fields set by the admin when whitelisting (the rest the member can fill later). */
export const REQUIRED_FIELDS = ["displayName", "email", "position"] as const;

const EMAIL_RE = /^[a-z0-9](?:[a-z0-9._%+-]{0,62}[a-z0-9])?@([a-z0-9.-]+\.[a-z]{2,})$/i;

/** Normalize a handle for comparison: lowercase, strip a leading '@' and any URL prefix/host. */
function normHandle(v: string): string {
  let s = v.trim().toLowerCase().replace(/\/+$/, "");
  s = s.replace(/^https?:\/\/(www\.)?[^/]+\//, ""); // drop scheme+host -> keep the path
  s = s.replace(/^@/, "").replace(/^in\//, "").replace(/^@?/, "");
  const lastSeg = s.split("/").filter(Boolean).pop() || s;
  return lastSeg.replace(/^@/, "");
}

/** Build a full profile URL for a personal social handle (used by the email signature). Accepts a
 *  full URL (kept as-is) or a bare handle/@handle and expands it per platform. */
export function socialUrl(key: SocialKey, raw: string): string {
  const v = (raw || "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  const h = v.replace(/^@/, "");
  switch (key) {
    case "facebook": return `https://facebook.com/${h}`;
    case "x": return `https://x.com/${h}`;
    case "telegram": return `https://t.me/${h}`;
    case "discord": return `https://discord.com/users/${h}`;
    case "youtube": return `https://youtube.com/@${h}`;
    case "github": return `https://github.com/${h}`;
    case "linkedin": return `https://www.linkedin.com/in/${h}`;
    default: return v;
  }
}

export interface ValidationResult {
  ok: boolean;
  errors: Record<string, string>;
}

/** Validate a profile against the rules. `enforceDomain` = the @pyraxchain.com hard rule. */
export function validateProfile(p: Partial<MemberProfile>, opts: { enforceDomain?: boolean } = {}): ValidationResult {
  const errors: Record<string, string> = {};
  const enforceDomain = opts.enforceDomain ?? true;

  if (!p.displayName || !p.displayName.trim()) errors.displayName = "Display name is required.";
  if (!p.position || !p.position.trim()) errors.position = "Position / title is required.";

  if (!p.email || !p.email.trim()) {
    errors.email = "Email is required.";
  } else {
    const m = p.email.trim().toLowerCase().match(EMAIL_RE);
    if (!m) errors.email = "Enter a valid email address.";
    else if (enforceDomain && m[1] !== COMPANY_EMAIL_DOMAIN) errors.email = `Only @${COMPANY_EMAIL_DOMAIN} addresses are allowed.`;
  }

  // Phone: optional, but if provided it must use a real country code + valid length.
  if (p.phone && p.phone.trim()) {
    const ph = validatePhone(p.phone);
    if (!ph.ok) errors.phone = ph.error!;
  }

  // Bookings link: optional, but if provided must be a valid Microsoft Bookings https URL.
  if (p.bookingUrl && p.bookingUrl.trim()) {
    const bk = validateBookingUrl(p.bookingUrl);
    if (!bk.ok) errors.bookingUrl = bk.error!;
  }

  // Socials: optional, but a provided handle must not equal the company's official handle.
  const socials = p.socials || {};
  for (const f of SOCIAL_FIELDS) {
    const v = socials[f.key];
    if (!v || !v.trim()) continue;
    if (normHandle(v) === normHandle(COMPANY_SOCIALS[f.key])) {
      errors[`social.${f.key}`] = `This must be your personal ${f.label}, not the company account.`;
    }
  }
  return { ok: Object.keys(errors).length === 0, errors };
}
