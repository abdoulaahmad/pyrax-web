// SPDX-License-Identifier: LicenseRef-Proprietary
import type { UserRow } from "./db";

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}

/** Shape the portal client sees — never leaks internal columns. */
export function publicUser(u: UserRow) {
  return {
    id: u.id, email: u.email, displayName: u.display_name, position: u.position,
    phone: u.phone, bookingUrl: u.booking_url, socials: u.socials, permissions: u.permissions,
    isSuperuser: u.is_superuser, status: u.status,
  };
}
export type PublicUser = ReturnType<typeof publicUser>;
