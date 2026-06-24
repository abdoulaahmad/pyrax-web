// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// team-pyrax — User Management module (role: user-admin).
//
// The superuser and any user-admin can whitelist @<domain> teammates and assign
// their module roles. Guard rails:
//   • only @<domain> addresses can ever be added (domain enforced in isValidEmail)
//   • the `superuser` role is never hand-assignable, and the hardcoded superuser
//     can't be demoted or removed (the platform can't lock itself out)
//   • only the superuser may grant/revoke `user-admin` (a user-admin can't mint more
//     admins or escalate); a user-admin may assign the remaining module roles
//   • an admin can't delete their own account out from under themselves
//
// Each handler returns { status, body } for the router to serialise.

import { Users } from "./db.js";
import { isValidEmail } from "./auth.js";
import { ALL_ROLES, ALL_APP_ROLES, ROLES, ROLE_META, APP_ROLE_META, SUPERUSER_EMAIL, EMAIL_DOMAIN } from "./config.js";

/** Combined metadata lookup (module roles + Ember App Roles). */
const ROLE_META_ALL = { ...ROLE_META, ...APP_ROLE_META };

/** Roles a given actor is allowed to assign. `superuser` is never assignable; only
 *  the superuser can hand out `user-admin`. App Roles (Ember admin-tab access) are
 *  assignable by any user-admin/superuser — they grant app-tab access, not platform
 *  admin, so there's no privilege-escalation risk. */
function assignableRolesFor(actor) {
  const moduleRoles = ALL_ROLES.filter((r) => {
    if (r === ROLES.SUPERUSER) return false;
    if (r === ROLES.USER_ADMIN) return !!actor?.isSuperuser;
    return true;
  });
  return [...moduleRoles, ...ALL_APP_ROLES];
}

/** Validate a requested role set against what the actor may assign. Returns the
 *  cleaned array or null if it contains anything disallowed. */
function sanitizeRoles(actor, roles) {
  if (!Array.isArray(roles)) return null;
  const allowed = assignableRolesFor(actor);
  const set = [...new Set(roles.map((r) => String(r)))];
  return set.every((r) => allowed.includes(r)) ? set : null;
}

const publicUser = (u) => ({
  id: u.id,
  email: u.email,
  roles: u.roles,
  isSuperuser: u.isSuperuser,
  createdAt: u.createdAt,
  createdBy: u.createdBy,
  lastLogin: u.lastLogin,
});

export async function listUsers(actor) {
  const roles = assignableRolesFor(actor).map((r) => ({
    key: r,
    kind: ALL_APP_ROLES.includes(r) ? "app" : "module", // group module roles vs Ember App Roles in the UI
    ...ROLE_META_ALL[r],
  }));
  const users = (await Users.all()).map(publicUser);
  return { status: 200, body: { users, assignableRoles: roles } };
}

export async function addUser(actor, body) {
  const email = isValidEmail(body?.email);
  if (!email) return { status: 400, body: { error: `Enter a valid @${EMAIL_DOMAIN} email address.` } };
  if (await Users.byEmail(email)) return { status: 409, body: { error: "That teammate is already on the whitelist." } };
  const roles = sanitizeRoles(actor, body?.roles ?? []);
  if (roles === null) return { status: 403, body: { error: "You can't assign one or more of those roles." } };
  await Users.add(email, roles, actor.email);
  return { status: 201, body: { user: publicUser(await Users.byEmail(email)) } };
}

export async function setRoles(actor, targetId, body) {
  const target = await Users.byId(Number(targetId));
  if (!target) return { status: 404, body: { error: "No such user." } };
  if (target.email === SUPERUSER_EMAIL) return { status: 403, body: { error: "The superuser's roles can't be changed." } };
  const roles = sanitizeRoles(actor, body?.roles ?? []);
  if (roles === null) return { status: 403, body: { error: "You can't assign one or more of those roles." } };
  // A non-superuser actor must not strip a role they couldn't grant (e.g. silently
  // dropping someone's user-admin); preserve roles outside their authority.
  const preserved = target.roles.filter((r) => !assignableRolesFor(actor).includes(r) && r !== ROLES.SUPERUSER);
  await Users.setRoles(target.id, [...new Set([...preserved, ...roles])]);
  return { status: 200, body: { user: publicUser(await Users.byId(target.id)) } };
}

export async function removeUser(actor, targetId) {
  const target = await Users.byId(Number(targetId));
  if (!target) return { status: 404, body: { error: "No such user." } };
  if (target.email === SUPERUSER_EMAIL) return { status: 403, body: { error: "The superuser can't be removed." } };
  if (target.id === actor.id) return { status: 403, body: { error: "You can't remove your own account." } };
  await Users.remove(target.id); // cascades their sessions — access is revoked immediately
  return { status: 200, body: { ok: true } };
}
