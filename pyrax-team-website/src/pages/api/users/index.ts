// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Team roster API.
//   GET  /api/users  → list members            (requires users.view)
//   POST /api/users  → invite/whitelist a member (requires users.invite)
// Invite enforces the @pyraxchain.com rule + email uniqueness (exactly one account per address),
// and only grants permissions the inviter is actually allowed to grant (no privilege escalation).
import type { APIRoute } from "astro";
import { listUsers, createInvitedUser, audit } from "../../../server/db";
import { requireUser, subjectOf } from "../../../server/guard";
import { json, publicUser } from "../../../server/http";
import { can, canGrant, sanitizePermissions, type Permission } from "../../../lib/permissions";
import { validateProfile } from "../../../lib/profile";
import { sendInvite } from "../../../server/email";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);
  if (!can(subjectOf(me), "users.view")) return json({ ok: false, error: "Forbidden." }, 403);
  const users = await listUsers();
  return json({ ok: true, users: users.map(publicUser) });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);
  const subj = subjectOf(me);
  if (!can(subj, "users.invite")) return json({ ok: false, error: "Forbidden." }, 403);

  const body = await request.json().catch(() => ({}));
  const displayName = String(body?.displayName ?? "").trim();
  const position = String(body?.position ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();

  const v = validateProfile({ displayName, position, email, socials: {} }, { enforceDomain: true });
  if (!v.ok) return json({ ok: false, errors: v.errors }, 422);

  // Only grant permissions the inviter can actually grant (drops anything out of their scope).
  const requested = sanitizePermissions(body?.permissions);
  const granted = requested.filter((p) => canGrant(subj, p)) as Permission[];

  const res = await createInvitedUser({ email, display_name: displayName, position, permissions: granted, created_by: me.id });
  if (!res.ok) return json({ ok: false, errors: { email: "A member with that email already exists." } }, 409);

  await audit({ actorId: me.id, actorEmail: me.email, action: "user.invite", targetId: res.user.id, targetEmail: res.user.email, detail: { displayName, position, permissions: granted } });
  void sendInvite(email, displayName, me.display_name); // fire-and-forget branded invite
  return json({ ok: true, user: publicUser(res.user) }, 201);
};
