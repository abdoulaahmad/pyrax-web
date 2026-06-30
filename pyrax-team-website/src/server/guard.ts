// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Server-side authorization helpers. Every protected endpoint resolves the session to a real user
// and checks a permission against the SAME `can()` used by the UI — the server is the source of
// truth (the UI only hides what you can't see; the server enforces it).
import type { AstroCookies } from "astro";
import { sessionUser, SESSION_COOKIE } from "./auth";
import type { UserRow } from "./db";
import { type AccessSubject } from "../lib/permissions";

/** Resolve the signed-in user from the session cookie (or null). */
export async function requireUser(cookies: AstroCookies): Promise<UserRow | null> {
  return sessionUser(cookies.get(SESSION_COOKIE)?.value);
}

/** The access subject (superuser flag + permission set) for authorization checks. */
export function subjectOf(u: UserRow): AccessSubject {
  return { isSuperuser: u.is_superuser, permissions: u.permissions };
}
