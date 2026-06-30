<!-- SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary -->
# pyrax-web

The PYRAX web monorepo — every public website, plus the shared chrome, built and deployed together.

| Package | Domain | What it is |
| --- | --- | --- |
| `pyrax-website` | **pyraxchain.com** | Marketing site (multi-page Vite + configless Tailwind v4) |
| `pyrax-nodes-website` | **nodes.pyraxchain.com** | Network status + run-a-node hub |
| `pyrax-explorer` | **explorer.pyraxchain.com** | Block explorer (static frontend) |
| `pyrax-explorer/server` | explorer.../api | Indexer + read API (Node 24, better-sqlite3) |
| `pyrax-peer-directory` | **peers.pyraxchain.com** | Real-time peer directory (zero-dep Node server: UI + announce/SSE API) |
| `pyrax-shared` | — | Single-source nav/header/footer/store/`⌘K` chrome (`@pyrax/shared`), consumed by every site |

The sites are siblings so each Vite build resolves `@pyrax/shared` via `../pyrax-shared/src` — the same layout used in development.

## Local dev
Run any site from its own folder: `cd pyrax-website && pnpm install && pnpm dev` (website/peer-directory use **pnpm**; nodes-website/explorer use **npm**). The explorer indexer + peer-directory server run from their `server/` dirs.

## Deploy
GitHub Actions builds one Docker image per package → **private GHCR** → the websites droplet (`64.227.8.153`) pulls them; **Caddy** reverse-proxies all four domains with automatic HTTPS. Push to `main` = a zero-downtime rollout. Full runbook + the one-time secret setup: **[DEPLOYMENT.md](DEPLOYMENT.md)**.

## NOVA observability + remediation
A `nova-agent` service (in `docker-compose.yml`) ships **every** container's logs on this droplet — `caddy`, `website`, `nodes-website`, `explorer-web`, `explorer-indexer`, `peer-directory`, `pyrax-team-website`, `relay`, `faucet`, the write `node`, and `tunnel-relay` — up to NOVA, the ops/observability platform at **[status.pyraxchain.com](https://status.pyraxchain.com)**, authenticated with the shared `NOVA_AGENT_SECRET`. The whole websites droplet is then observable in NOVA's Live Logs + error tracking off the hop.

When `NOVA_AGENT_REMEDIATION=1` (default `0`), NOVA may also **auto-restart stateless containers** on this droplet via its approved-action queue. Chain-affecting restarts (e.g. the write `node`) stay **advisory** and get a **15-minute warning** first.

| Env var | Default | Purpose |
| --- | --- | --- |
| `NOVA_AGENT_SECRET` | _(empty)_ | Shared bearer token; **required** for shipping logs to NOVA |
| `NOVA_AGENT_REMEDIATION` | `0` | `1` lets NOVA auto-restart stateless containers via its approved-action queue |

> Private / proprietary (`LicenseRef-PYRAX-Proprietary`). Keep this repo **Private**.
