// SPDX-License-Identifier: LicenseRef-Proprietary
import type { APIRoute } from "astro";
import { sessionUser, SESSION_COOKIE } from "../../server/auth";
import { updateUserProfile } from "../../server/db";
import { json, publicUser } from "../../server/http";
import { SOCIAL_FIELDS, validateProfile, validatePhone, validateBookingUrl, type SocialKey } from "../../lib/profile";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const user = await sessionUser(cookies.get(SESSION_COOKIE)?.value);
  if (!user) return json({ ok: false, user: null });
  return json({ ok: true, user: publicUser(user) });
};

/** Update the signed-in member's OWN profile. Email, permissions and superuser status are never
 *  editable here. All input is re-validated server-side, then phone + booking link are normalized. */
export const PUT: APIRoute = async ({ request, cookies }) => {
  const user = await sessionUser(cookies.get(SESSION_COOKIE)?.value);
  if (!user) return json({ ok: false, error: "Not signed in." }, 401);

  const body = await request.json().catch(() => ({}));
  const displayName = String(body?.displayName ?? "").trim();
  const position = String(body?.position ?? "").trim();
  const phoneRaw = body?.phone == null ? "" : String(body.phone).trim();
  const bookingRaw = body?.bookingUrl == null ? "" : String(body.bookingUrl).trim();

  // Keep only known social keys with non-empty string values.
  const socialsIn = body?.socials && typeof body.socials === "object" ? body.socials : {};
  const socials: Partial<Record<SocialKey, string>> = {};
  for (const f of SOCIAL_FIELDS) {
    const v = socialsIn[f.key];
    if (typeof v === "string" && v.trim()) socials[f.key] = v.trim();
  }

  // Single source of truth: the shared validator (covers required fields, phone, booking, socials).
  const v = validateProfile({ displayName, position, email: user.email, phone: phoneRaw, bookingUrl: bookingRaw, socials }, { enforceDomain: false });
  if (!v.ok) return json({ ok: false, errors: v.errors }, 422);

  const phone = phoneRaw ? validatePhone(phoneRaw).formatted : null;
  const booking = validateBookingUrl(bookingRaw).url || null;
  // Chat username (for the Devnet community chat) — handle-safe; empty allowed.
  const chatUsername = String(body?.chatUsername ?? "").trim().replace(/^@/, "").replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20) || null;
  const updated = await updateUserProfile(user.id, { display_name: displayName, position, phone, booking_url: booking, chat_username: chatUsername, socials });
  if (!updated) return json({ ok: false, error: "Could not save your profile." }, 500);
  return json({ ok: true, user: publicUser(updated) });
};
