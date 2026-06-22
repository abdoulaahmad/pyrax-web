# CLAUDE.md — team-pyrax

Context for future Claude Code sessions working in this package (part of the
`pyrax-web` monorepo).

## What this is

**team-pyrax.pyraxchain.com** — the gated, magic-link-authenticated PYRAX team
portal with role-based modules. v1 modules: **Downloads** (always-newest Ember /
Inferno / CLI installers) and **User Management** (whitelist + roles). Designed to
grow — add a module by adding a role to `ROLES`/`MODULES` and a view in `main.ts`.

## Layout

- `server/` — the Node service (one stateless process serves the SPA `dist/` + the
  API on `:8790`). Runtime dep: `pg` (DigitalOcean Managed PostgreSQL). Files:
  - `config.js` — all config + the role/module catalogue. Secrets from env only.
  - `db.js` — the `pg` Pool + Postgres schema (users/whitelist, magic_tokens,
    sessions). All access is async; `init()` creates the schema + idempotently seeds
    the hardcoded superuser (force-keeps it `superuser`) and MUST be awaited on boot.
  - `auth.js` — magic-link issue/consume, sessions, RBAC (`hasRole`), CSRF, cookies.
    Tokens + session ids are stored only as HMACs; comparisons are constant-time.
  - `email.js` — Brevo transactional send (no SDK). Logs the link if no API key.
  - `downloads.js` — resolves newest from OTA `latest*.yml` / `manifest.json`;
    serves via hand-rolled **SigV4 presign** or a public-OTA redirect.
  - `admin.js` — User Management handlers (guards: superuser immutable, no priv-esc,
    only superuser grants `user-admin`).
  - `index.js` — the HTTP router: security headers, rate limiting, all routes,
    static SPA serving. **Mutations require session + CSRF token + same-origin.**
- `src/` — the configless **Tailwind v4** SPA (vanilla TS, no framework, no
  `@pyrax/shared`): `main.ts` (views: login / dashboard / downloads / users),
  `api.ts` (fetch client + CSRF), `styles.css` (self-contained brand theme + a
  minimal internal header — NOT the public mega-menu nav).
- `index.html`, `vite.config.ts`, `Dockerfile`, `.env.example`, `public/` (brand).

## Conventions

- **SPDX header** on every source file; license `LicenseRef-PYRAX-Proprietary`.
- Server is plain Node ESM (`.js`); the frontend is strict TS (`tsc --noEmit`
  checks `src/` only). `pnpm build` = typecheck + Vite build.
- **Security is the product here.** Never weaken: the single-use/TTL token + hashed
  storage, the SameSite+CSRF+Origin triple on mutations, the anti-enumeration
  generic login response, the `@pyraxchain.com`-only + whitelist gate, or the
  superuser-immutability guards. Validate all input.
- The superuser is `shawn.wilson@pyraxchain.com` (hardcoded in `config.js`).

## Gotchas

- `DATABASE_URL` is **required** (the only non-graceful secret) — `init()` fails fast
  and the process exits if it can't reach Postgres. Local dev defaults to a local
  Postgres on `:5544` (`docker run … postgres:16`). On the DO VPC, TLS is encrypted
  but unverified unless `DATABASE_CA` (PEM) is supplied.
- Other secrets degrade gracefully: no `SESSION_SECRET` → ephemeral key (sessions
  reset on restart); no `BREVO_API_KEY` → links logged, not mailed; no Spaces creds →
  downloads fall back to the public OTA URL. Set them in production.
- The CLI download needs `updates.pyraxchain.com/cli/manifest.json`
  (`{ version, files: { win, mac, linux } }`); until it exists the CLI tile shows
  "coming soon".
- Adding a role: update `ROLES`/`ALL_ROLES`/`ROLE_META`/`MODULES` in `config.js`,
  the `assignableRolesFor` policy in `admin.js`, and `roleLabel`/tiles in `main.ts`.
