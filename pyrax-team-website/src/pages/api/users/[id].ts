// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Single-member admin API.
//   PUT    /api/users/:id  → set permissions   (requires users.assign_permissions)
//   DELETE /api/users/:id  → remove member      (requires users.remove)
// Privilege-escalation safe: an admin may only change permissions THEY can grant; a target's
// out-of-scope permissions are preserved. The superuser is immutable; you can't remove yourself.
import type { APIRoute } from "astro";
import { userById, setUserPermissions, removeUser } from "../../../server/db";
import { requireUser, subjectOf } from "../../../server/guard";
import { json, publicUser } from "../../../server/http";
import { can, canGrant, sanitizePermissions, ALL_PERMISSIONS, type Permission } from "../../../lib/permissions";

export const prerender = false;

export const PUT: APIRoute = async ({ params, request, cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);
  const subj = subjectOf(me);
  if (!can(subj, "users.assign_permissions")) return json({ ok: false, error: "Forbidden." }, 403);

  const target = await userById(String(params.id));
  if (!target) return json({ ok: false, error: "Member not found." }, 404);
  if (target.is_superuser) return json({ ok: false, error: "The superuser's access can't be changed." }, 403);

  // Only the permissions the inviter can grant are under their control; everything else on the
  // target is preserved exactly as-is, so a mid-level admin can't add OR strip out-of-scope access.
  const grantable = new Set(ALL_PERMISSIONS.filter((p) => canGrant(subj, p)));
  const incoming = new Set(sanitizePermissions((await request.json().catch(() => ({})))?.permissions));
  const next: Permission[] = ALL_PERMISSIONS.filter((p) =>
    grantable.has(p) ? incoming.has(p) : target.permissions.includes(p),
  );

  const updated = await setUserPermissions(target.id, next);
  if (!updated) return json({ ok: false, error: "Could not update permissions." }, 500);
  return json({ ok: true, user: publicUser(updated) });
};

export const DELETE: APIRoute = async ({ params, cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);
  if (!can(subjectOf(me), "users.remove")) return json({ ok: false, error: "Forbidden." }, 403);

  const id = String(params.id);
  if (id === me.id) return json({ ok: false, error: "You can't remove your own account." }, 400);
  const target = await userById(id);
  if (!target) return json({ ok: false, error: "Member not found." }, 404);
  if (target.is_superuser) return json({ ok: false, error: "The superuser can't be removed." }, 403);

  const gone = await removeUser(id);
  return gone ? json({ ok: true }) : json({ ok: false, error: "Could not remove member." }, 500);
};
