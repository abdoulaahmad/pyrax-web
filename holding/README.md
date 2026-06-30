<!-- SPDX-License-Identifier: LicenseRef-Proprietary -->
# holding/ — pyraxchain.com holding page + security.txt origin

A tiny self-hosted Caddy static server for the apex `pyraxchain.com` while the full site is
rebuilt. Self-hosted on our own infrastructure (the main droplet, 147.182.148.233) — **not** a
Cloudflare Worker — so all infrastructure stays first-party.

Serves:
- `/.well-known/security.txt` (RFC 9116) — the Cloudflare "security.txt not configured" fix.
- `/` — a minimal branded "under construction" placeholder so the apex returns 200 instead of a
  Cloudflare 5xx (the previous site origin was decommissioned).

| File | Purpose |
|------|---------|
| `site/.well-known/security.txt` | the published security policy contact |
| `site/index.html` | the apex placeholder |
| `Caddyfile` | static file server; `tls internal` (Cloudflare "Full" accepts the self-signed origin cert) |
| `Dockerfile` | `caddy:2` + the site |

## Deploy

Built + rolled out by the centralized infra repo:
`gh workflow run holding-image.yml -R PYRAX-NETWORK/pyrax-infra` then
`gh workflow run holding-deploy.yml -R PYRAX-NETWORK/pyrax-infra` (target = main droplet).
See `pyrax-infra/holding/`.

When the full site returns, repoint the apex origin to it and retire this service.
