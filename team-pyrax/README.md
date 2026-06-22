<!-- SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary -->
# team-pyrax · team-pyrax.pyraxchain.com

The gated PYRAX **team portal** — a magic-link-authenticated, role-based internal
hub. v1 ships the **Download Center** (always-newest Ember / Inferno / CLI
installers for Windows, macOS and Linux) and **User Management** (whitelist
`@pyraxchain.com` teammates and assign their module roles). It's built to grow:
new modules are just a new role + a new tile.

One Node process serves the built SPA **and** the API; state lives in SQLite.

## Access model

- **Passwordless.** A teammate enters their work email → a single-use, 15-minute
  sign-in link is emailed (Brevo) → clicking it starts a 7-day session.
- **Whitelist-only.** Only `@pyraxchain.com` addresses that an admin has added can
  sign in. Requests for any other address get the same generic response (no
  enumeration) and send nothing.
- **Superuser.** `shawn.wilson@pyraxchain.com` is hardcoded — seeded on first boot,
  always all-access, and never removable or demotable. The superuser whitelists the
  first admins.
- **Roles** (a user holds a set; superuser implies all):
  - `superuser` — everything; not hand-assignable.
  - `user-admin` — whitelist teammates + assign roles (only the superuser may grant
    this one).
  - `downloads` — access the Download Center.

## Security

Single-use HMAC-hashed tokens + DB-backed sessions (hashed at rest); HttpOnly +
`SameSite=Lax` + `Secure` cookies; CSRF token required on every mutation **and** a
same-origin `Origin`/`Referer` check; per-IP token-bucket rate limiting; request
size caps; strict CSP + security headers. See `server/auth.js` / `server/index.js`.

## Downloads

"Newest version" is resolved from the OTA feed metadata on DigitalOcean Spaces
(`updates.pyraxchain.com`): electron-updater `latest*.yml` for Ember (`/ember/`) +
Inferno (`/node/`), and a `cli/manifest.json` for the CLI. The download itself is
gated behind a valid session and served either as a **short-lived presigned Spaces
URL** (`DOWNLOAD_MODE=presign`, hand-rolled SigV4 — no AWS SDK) or a redirect to the
public OTA CDN (`public`). The CLI tile shows "coming soon" until its manifest
exists.

## Develop

```bash
pnpm install
# terminal 1 — the API server (writes ./team-pyrax.db; logs the magic link when
# BREVO_API_KEY is unset, so you can sign in locally without Brevo):
PUBLIC_URL=http://localhost:8790 pnpm start
# terminal 2 — the Vite dev server (proxies /api + /auth to :8790):
pnpm dev
```

`pnpm build` runs `tsc --noEmit` + `vite build`. `pnpm serve` builds then starts the
server (serves `dist/` + the API on one port).

## Configuration

All knobs live in `server/config.js`; secrets come from the environment only. See
`.env.example`. In production the secrets are injected by the monorepo deploy
workflow into the droplet's root-only `.env`:

| Secret | Purpose |
| --- | --- |
| `SESSION_SECRET` | pepper for hashing tokens/sessions + CSRF (set it — else sessions reset on restart) |
| `BREVO_API_KEY` | Brevo transactional sends (unset → links are logged, not emailed) |
| `SPACES_KEY` / `SPACES_SECRET` | DO Spaces presign creds (unset → downloads use the public OTA URL) |

Non-secret config (`PUBLIC_URL`, `OTA_BASE`, `BREVO_SENDER_EMAIL`, `SPACES_REGION`,
`SPACES_BUCKET`) is set in `docker-compose.yml`.

## Deploy

Part of the `pyrax-web` monorepo: `docker compose` service `team-pyrax`, image
`ghcr.io/pyrax-network/pyrax-web-team-pyrax`, routed by Caddy at
`team-pyrax.pyraxchain.com`. See the repo's `DEPLOYMENT.md`. Point the DNS A-record
at the websites droplet and Caddy provisions HTTPS automatically.
