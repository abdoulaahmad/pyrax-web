// SPDX-License-Identifier: LicenseRef-Proprietary
import type { AstroCookies } from "astro";
import { sessionTester, SESSION_COOKIE } from "./auth";
import type { TesterRow } from "./db";
import type { AccessSubject } from "../lib/permissions";

export async function requireTester(cookies: AstroCookies): Promise<TesterRow | null> {
  return sessionTester(cookies.get(SESSION_COOKIE)?.value);
}
export function subjectOf(t: TesterRow): AccessSubject {
  return { isSuperuser: t.is_superuser, permissions: t.permissions };
}
