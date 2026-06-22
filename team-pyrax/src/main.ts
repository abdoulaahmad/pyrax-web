// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// team-pyrax SPA. A small hand-rolled view layer (no framework): on boot it asks
// /api/me; signed-out users get the magic-link login, signed-in users get the
// dashboard + their role-gated modules (Downloads, User Management).

import "./styles.css";
import { api, setCsrf, type ApiError } from "./api";

// --- types ------------------------------------------------------------------

interface User { email: string; roles: string[]; isSuperuser: boolean; lastLogin: number | null; }
interface Module { key: string; title: string; desc: string; role: string; icon: string; }
interface Me { user: User | null; modules?: Module[]; csrf?: string; }
interface AdminUser { id: number; email: string; roles: string[]; isSuperuser: boolean; createdAt: number; createdBy: string | null; lastLogin: number | null; }
interface RoleMeta { key: string; label: string; desc: string; }
interface PlatformState { label: string; available: boolean; }
interface Product { key: string; name: string; tagline: string; version: string | null; available: boolean; platforms: Record<string, PlatformState>; }

// --- icons ------------------------------------------------------------------

const ICONS: Record<string, string> = {
  download: '<path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M5 21h14"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  back: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>',
};
function icon(name: string, cls = "h-5 w-5"): string {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] ?? ""}</svg>`;
}

// --- utils ------------------------------------------------------------------

const app = document.getElementById("app") as HTMLElement;
const toastEl = document.getElementById("toast") as HTMLElement;
let me: Me = { user: null };

function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
function fmtDate(ts: number | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
let toastTimer = 0;
function toast(msg: string, kind: "ok" | "err" = "ok"): void {
  toastEl.textContent = msg;
  toastEl.className = `show ${kind}`;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (toastEl.className = ""), 3600);
}
const hasModule = (key: string): boolean => !!me.modules?.some((m) => m.key === key);
const roleLabel = (r: string): string => ({ superuser: "Superuser", "user-admin": "User Admin", downloads: "Downloads" }[r] ?? r);

// --- login ------------------------------------------------------------------

function renderLogin(): void {
  const linkError = new URLSearchParams(location.search).get("error") === "link";
  app.innerHTML = `
    <main class="min-h-dvh grid place-items-center px-5 py-10">
      <div class="w-full max-w-md animate-[rise]">
        <div class="flex flex-col items-center text-center">
          <img src="/logo-horizontal.svg" alt="PYRAX" class="h-8" />
          <div class="mt-3 chip chip-brand">${icon("shield", "h-3.5 w-3.5")} Team portal · restricted</div>
          <h1 class="mt-5 text-2xl font-bold">Sign in to <span class="brand-text">PYRAX Team</span></h1>
          <p class="mt-2 text-sm text-[var(--color-muted)]">Enter your work email and we'll send a one-time sign-in link.</p>
        </div>
        <div class="card p-6 sm:p-7 mt-6">
          ${linkError ? `<div class="mb-4 rounded-lg border border-[color-mix(in_oklab,var(--color-negative)_45%,var(--color-line))] bg-[color-mix(in_oklab,var(--color-negative)_10%,transparent)] px-3.5 py-2.5 text-sm text-[var(--color-negative)]">That sign-in link was invalid or expired. Request a new one below.</div>` : ""}
          <form id="loginform" novalidate>
            <label class="block text-xs font-semibold uppercase tracking-wider text-[var(--color-faint)] mb-1.5">Work email</label>
            <input class="input" name="email" type="email" autocomplete="email" inputmode="email" placeholder="you@pyraxchain.com" required />
            <button class="btn btn-primary w-full mt-3" type="submit">${icon("mail", "h-4 w-4")} Send sign-in link</button>
          </form>
          <p class="mt-4 text-xs leading-relaxed text-[var(--color-faint)]">Only whitelisted <strong class="text-[var(--color-muted)]">@pyraxchain.com</strong> addresses can sign in. No password — the link signs you in for 7 days.</p>
        </div>
        <p class="mt-6 text-center text-xs text-[var(--color-faint)]">© ${new Date().getFullYear()} PYRAX · internal use only</p>
      </div>
    </main>`;

  const form = document.getElementById("loginform") as HTMLFormElement;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = form.elements.namedItem("email") as HTMLInputElement;
    const btn = form.querySelector("button") as HTMLButtonElement;
    const email = input.value.trim();
    if (!email) return;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> Sending…`;
    try {
      await api("/api/auth/request", { method: "POST", body: JSON.stringify({ email }) });
      showSent(email);
    } catch {
      // The endpoint is generic by design; a thrown error here is a transport issue.
      showSent(email);
    }
  });
}

function showSent(email: string): void {
  const card = document.querySelector(".card") as HTMLElement;
  card.innerHTML = `
    <div class="text-center py-2">
      <div class="mx-auto icon-orb icon-orb-bolt !h-12 !w-12">${icon("mail", "h-6 w-6")}</div>
      <h2 class="mt-4 text-lg font-bold">Check your inbox</h2>
      <p class="mt-2 text-sm text-[var(--color-muted)]">If <strong class="text-[var(--color-ink)]">${esc(email)}</strong> is on the team, a sign-in link is on its way. It expires in 15 minutes.</p>
      <button id="backbtn" class="btn btn-ghost btn-sm mt-5">${icon("back", "h-4 w-4")} Use a different email</button>
    </div>`;
  document.getElementById("backbtn")?.addEventListener("click", () => renderLogin());
}

// --- app shell --------------------------------------------------------------

function navTabs(active: string): string {
  const tab = (key: string, href: string, label: string, ic: string) =>
    `<a class="tab ${active === key ? "is-on" : ""}" href="#${href}">${icon(ic, "h-4 w-4")} ${label}</a>`;
  let out = tab("dashboard", "/", "Dashboard", "grid");
  if (hasModule("downloads")) out += tab("downloads", "/downloads", "Downloads", "download");
  if (hasModule("users")) out += tab("users", "/users", "Users", "users");
  return out;
}

function shell(active: string, body: string): void {
  const u = me.user as User;
  const roleline = u.isSuperuser ? "Superuser" : u.roles.map(roleLabel).join(" · ") || "No roles assigned";
  const tabs = navTabs(active);
  app.innerHTML = `
    <header class="app-header">
      <div class="container-x flex h-16 items-center justify-between gap-3" style="max-width:72rem">
        <a class="logo-link" href="#/"><img src="/logo-horizontal.svg" alt="PYRAX" /><span class="chip chip-brand">Team</span></a>
        <nav class="hidden sm:flex items-center gap-1">${tabs}</nav>
        <div class="flex items-center gap-3">
          <div class="hidden md:flex flex-col items-end leading-tight">
            <span class="text-sm font-semibold">${esc(u.email)}</span>
            <span class="text-xs text-[var(--color-faint)]">${esc(roleline)}</span>
          </div>
          <button id="signout" class="btn btn-ghost btn-sm">${icon("logout", "h-4 w-4")} Sign out</button>
        </div>
      </div>
      <nav class="sm:hidden container-x flex gap-1 pb-2 overflow-x-auto" style="max-width:72rem">${tabs}</nav>
    </header>
    <main id="view" class="container-x py-8" style="max-width:72rem">${body}</main>`;

  document.getElementById("signout")?.addEventListener("click", async () => {
    try { await api("/api/auth/logout", { method: "POST" }); } catch { /* ignore */ }
    me = { user: null };
    location.hash = "";
    renderLogin();
  });
}

const loading = (): string => `<div class="grid place-items-center py-24"><span class="spinner"></span></div>`;
const setView = (html: string): void => { const v = document.getElementById("view"); if (v) v.innerHTML = html; };

// --- dashboard --------------------------------------------------------------

function renderDashboard(): void {
  const mods = me.modules ?? [];
  const tiles = mods.length
    ? mods
        .map(
          (m) => `
          <a href="#/${m.key === "users" ? "users" : m.key}" class="card card-hover p-6 block">
            <div class="icon-orb ${m.key === "users" ? "icon-orb-bolt" : ""} !h-12 !w-12">${icon(m.icon, "h-6 w-6")}</div>
            <h3 class="mt-4 text-lg font-bold">${esc(m.title)}</h3>
            <p class="mt-1.5 text-sm leading-relaxed text-[var(--color-muted)]">${esc(m.desc)}</p>
            <span class="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-brand-soft)]">Open ${icon("back", "h-4 w-4 rotate-180")}</span>
          </a>`,
        )
        .join("")
    : `<div class="card p-8 text-center text-[var(--color-muted)]">You're signed in, but no modules have been assigned to your account yet. An admin can grant you access.</div>`;
  shell(
    "dashboard",
    `
    <div class="mb-7">
      <h1 class="text-2xl font-bold">Welcome back</h1>
      <p class="mt-1.5 text-sm text-[var(--color-muted)]">Signed in as ${esc((me.user as User).email)}. Pick a module to get started.</p>
    </div>
    <div class="grid gap-5 sm:grid-cols-2">${tiles}</div>`,
  );
}

// --- downloads --------------------------------------------------------------

async function renderDownloads(): Promise<void> {
  shell("downloads", loading());
  try {
    const { products } = await api<{ products: Product[] }>("/api/downloads");
    const cards = products
      .map((p) => {
        const plats = (["win", "mac", "linux"] as const)
          .map((pl) => {
            const st = p.platforms[pl];
            if (!st) return "";
            return st.available
              ? `<a class="btn btn-ghost btn-sm" href="/api/downloads/${esc(p.key)}/${pl}">${icon("download", "h-4 w-4")} ${esc(st.label)}</a>`
              : `<span class="btn btn-ghost btn-sm" style="opacity:.45;cursor:not-allowed" title="No build yet">${esc(st.label)}</span>`;
          })
          .join("");
        return `
          <div class="card p-6">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 class="text-lg font-bold">${esc(p.name)}</h3>
                <p class="mt-1 text-sm text-[var(--color-muted)]">${esc(p.tagline)}</p>
              </div>
              ${p.version ? `<span class="chip chip-brand shrink-0">v${esc(p.version)}</span>` : `<span class="chip shrink-0">Coming soon</span>`}
            </div>
            ${p.available ? `<div class="mt-5 flex flex-wrap gap-2">${plats}</div>` : `<p class="mt-5 text-sm text-[var(--color-faint)]">No release published yet — it'll appear here automatically.</p>`}
          </div>`;
      })
      .join("");
    setView(`
      <div class="mb-7">
        <h1 class="text-2xl font-bold">Downloads</h1>
        <p class="mt-1.5 text-sm text-[var(--color-muted)]">Always the latest signed installers, straight from the release feed.</p>
      </div>
      <div class="grid gap-5 md:grid-cols-2">${cards}</div>`);
  } catch (e) {
    setView(errorBox(e as ApiError, "Couldn't load the download catalogue."));
  }
}

// --- user management --------------------------------------------------------

async function renderUsers(): Promise<void> {
  shell("users", loading());
  try {
    const { users, assignableRoles } = await api<{ users: AdminUser[]; assignableRoles: RoleMeta[] }>("/api/admin/users");
    const myEmail = (me.user as User).email;

    const addRoleChecks = assignableRoles
      .map((r) => `<label class="rolepick"><input type="checkbox" value="${esc(r.key)}" />${esc(r.label)}</label>`)
      .join("");

    const rows = users
      .map((u) => {
        const tags = `${u.email === myEmail ? '<span class="chip chip-bolt">you</span>' : ""}${u.isSuperuser ? '<span class="chip chip-brand">superuser</span>' : ""}`;
        const locked = u.isSuperuser; // the hardcoded superuser is immutable
        const checks = locked
          ? u.roles.map((r) => `<span class="chip">${esc(roleLabel(r))}</span>`).join(" ")
          : assignableRoles
              .map((r) => `<label class="rolepick"><input type="checkbox" data-uid="${u.id}" value="${esc(r.key)}" ${u.roles.includes(r.key) ? "checked" : ""} />${esc(r.label)}</label>`)
              .join("");
        const actions = locked
          ? ""
          : `<div class="flex gap-2 justify-end">
               <button class="btn btn-ghost btn-sm" data-save="${u.id}">${icon("save", "h-4 w-4")} Save</button>
               ${u.email === myEmail ? "" : `<button class="btn btn-danger btn-sm" data-del="${u.id}" data-email="${esc(u.email)}">${icon("trash", "h-4 w-4")}</button>`}
             </div>`;
        return `
          <tr>
            <td><div class="font-semibold">${esc(u.email)}</div><div class="mt-1 flex gap-1.5">${tags}</div></td>
            <td><div class="flex flex-wrap gap-1.5">${checks}</div></td>
            <td class="text-[var(--color-muted)] whitespace-nowrap">${fmtDate(u.lastLogin)}</td>
            <td class="text-[var(--color-faint)] whitespace-nowrap">${esc(u.createdBy ?? "—")}</td>
            <td>${actions}</td>
          </tr>`;
      })
      .join("");

    setView(`
      <div class="mb-7">
        <h1 class="text-2xl font-bold">User Management</h1>
        <p class="mt-1.5 text-sm text-[var(--color-muted)]">Whitelist @pyraxchain.com teammates and assign their module roles.</p>
      </div>

      <div class="card p-6 mb-7">
        <h3 class="font-bold">${icon("plus", "h-4 w-4 inline -mt-0.5")} Add a teammate</h3>
        <form id="addform" class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input class="input sm:max-w-xs" name="email" type="email" placeholder="name@pyraxchain.com" required />
          <div class="flex flex-wrap gap-2">${addRoleChecks}</div>
          <button class="btn btn-primary btn-sm sm:ml-auto" type="submit">${icon("plus", "h-4 w-4")} Add</button>
        </form>
      </div>

      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="tbl">
            <thead><tr><th>Teammate</th><th>Roles</th><th>Last sign-in</th><th>Added by</th><th></th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`);

    wireUsers();
  } catch (e) {
    setView(errorBox(e as ApiError, "Couldn't load users."));
  }
}

function wireUsers(): void {
  // add
  const addform = document.getElementById("addform") as HTMLFormElement | null;
  addform?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = (addform.elements.namedItem("email") as HTMLInputElement).value.trim();
    const roles = Array.from(addform.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked')).map((c) => c.value);
    const btn = addform.querySelector("button") as HTMLButtonElement;
    btn.disabled = true;
    try {
      await api("/api/admin/users", { method: "POST", body: JSON.stringify({ email, roles }) });
      toast("Teammate added.", "ok");
      renderUsers();
    } catch (err) {
      toast((err as ApiError).message, "err");
      btn.disabled = false;
    }
  });
  // save roles
  document.querySelectorAll<HTMLButtonElement>("[data-save]").forEach((b) =>
    b.addEventListener("click", async () => {
      const uid = b.dataset.save!;
      const roles = Array.from(document.querySelectorAll<HTMLInputElement>(`input[data-uid="${uid}"]:checked`)).map((c) => c.value);
      b.disabled = true;
      try {
        await api(`/api/admin/users/${uid}/roles`, { method: "POST", body: JSON.stringify({ roles }) });
        toast("Roles updated.", "ok");
      } catch (err) {
        toast((err as ApiError).message, "err");
      } finally {
        b.disabled = false;
      }
    }),
  );
  // remove
  document.querySelectorAll<HTMLButtonElement>("[data-del]").forEach((b) =>
    b.addEventListener("click", async () => {
      if (!confirm(`Remove ${b.dataset.email}? They lose access immediately.`)) return;
      b.disabled = true;
      try {
        await api(`/api/admin/users/${b.dataset.del}/delete`, { method: "POST" });
        toast("Teammate removed.", "ok");
        renderUsers();
      } catch (err) {
        toast((err as ApiError).message, "err");
        b.disabled = false;
      }
    }),
  );
}

// --- errors / router --------------------------------------------------------

function errorBox(e: ApiError, fallback: string): string {
  const msg = e?.status === 403 ? "You don't have access to this module." : e?.message || fallback;
  return `<div class="card p-8 text-center"><p class="text-[var(--color-negative)] font-semibold">${esc(msg)}</p></div>`;
}

function route(): void {
  const h = (location.hash.replace(/^#/, "") || "/").toLowerCase();
  if (h.startsWith("/downloads") && hasModule("downloads")) return void renderDownloads();
  if (h.startsWith("/users") && hasModule("users")) return void renderUsers();
  renderDashboard();
}

async function boot(): Promise<void> {
  try {
    me = await api<Me>("/api/me");
  } catch {
    me = { user: null };
  }
  if (me.csrf) setCsrf(me.csrf);
  if (!me.user) {
    renderLogin();
    return;
  }
  window.addEventListener("hashchange", route);
  route();
}

void boot();
