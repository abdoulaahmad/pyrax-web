<!-- SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary -->

# pyrax-peer-directory

The **peers.pyraxchain.com** service + website: a real-time, self-cleaning list of
reachable PYRAX nodes, **per network**, fed by a hardened **app-only** announce
API. It powers zero-config peer discovery for the **Inferno Node** and **Ember**
desktop apps.

- **Live per network** — a dropdown selects **Pyrax Seed Network · Pyrax Forge
  Network · Pyrax Rise Network · Pyrax One Network** (plain `devnet` / chain
  id 70001 was retired — `forge` is our only public dev network). The list updates in
  **real time** over Server-Sent Events: a node goes
  offline → it disappears at TTL; comes back → it reappears. No refresh.
- **Ultra-modern, HD, mobile-first** — a configless **Tailwind CSS v4** frontend
  (Vite), the PYRAX fire/bolt brand, glass surfaces, fully responsive.
- **Zero runtime dependencies** — the server is pure Node built-ins (smaller
  attack surface). Tailwind/Vite are dev-only (build the static site).

## Security model — the API is **not publicly accessible; only via the app**

| Path | Who | How it's enforced |
|---|---|---|
| `POST /api/announce` (**write**) | PYRAX apps **only** | Every announce must carry `Authorization: PYRAX-HMAC ts=…,sig=…` — an **HMAC-SHA256** over `${method}\n${pathname}\n${ts}\n${sha256(body)}` keyed by a shared secret, inside a **±90 s** clock window, **not previously seen** (replay cache). The public cannot inject or alter peers. |
| `GET /api/peers`, `GET /api/peers/stream` (**read**) | The official website (same-origin browser) **or** apps with a valid HMAC | Anything else → **401**. The listing is shown on the public site by design; the read API itself is gated, **CORS-locked**, and rate-limited to deter scraping/abuse. |

Defense in depth: strict input validation, per-IP **token-bucket rate limiting**,
request-size caps, path-traversal-safe static serving, and a full set of
**security headers** (CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy`, `Permissions-Policy`).

> **Provision the secret.** Set `PYRAX_DIRECTORY_SECRET` to a long random value in
> production and configure the apps with the same value. A known dev default is
> used otherwise (the server logs a warning). A shared secret shipped in a client
> is extractable; combined with replay/tamper protection + rate limiting this is
> strong defense-in-depth. **Next hardening:** bind each announce to the node's
> Ed25519 identity key (so a `peerId` can't be announced by anyone but its owner).

## Run

```bash
pnpm install        # dev tools only (Tailwind v4 + Vite); the server needs none
pnpm build          # tsc --noEmit && vite build  → dist/
pnpm start          # node server/index.js  (serves dist/ + the hardened API)
# dev: pnpm dev (Vite HMR) in one shell, pnpm start in another
```

Open `http://localhost:8787`.

| Env | Default | Purpose |
|---|---|---|
| `PORT` | `8787` | Listen port. |
| `TTL_MS` | `30000` | A node is "online" this long after its last heartbeat. |
| `SITE_ORIGIN` | `http://localhost:$PORT` | The public site origin (same-origin read access + CORS). Set to `https://peers.pyraxchain.com`. |
| `PYRAX_DIRECTORY_SECRET` | dev default | HMAC key shared with the apps. **Set in production.** |
| `PYRAX_ENABLED_NETWORKS` | `seed` | **Network enablement gate** — comma-separated. Only these networks accept announces / serve reads; everything else is rejected (announce → **403**, read → **400**) and hidden from the website dropdown. **Add a network here only when it launches** (e.g. `forge,rise`). |
| `TRUST_PROXY` | unset | When set, trust `X-Forwarded-For` (only behind a known proxy/load balancer). The forwarded value is validated as an IP (`net.isIP`); junk falls back to the socket address. |
| `PYRAX_GEO_URL` | `http://ip-api.com/json` | Country-flag geolocation provider. Each **public** peer IP is sent once (cached, TTL'd) to this third party to resolve its country; private/loopback IPs are never sent. Point at a paid/HTTPS provider if you prefer. |
| `PYRAX_GEO_DISABLE` | unset | Set to `1` (or set `PYRAX_GEO_URL=""`) to disable geolocation entirely — no peer IP is ever sent to a third party. |

### Network enablement

So the public can never discover/join a network that isn't running yet, the
directory only handles the networks in `PYRAX_ENABLED_NETWORKS` (default
**`seed`** only). The apps mirror this independently
(`NETWORK_STATUS` in `pyrax-node-app/shared/variant.ts`) — flip a network to
`"live"` **and** add it to `PYRAX_ENABLED_NETWORKS` when it launches.

## HTTP API

| Method · Path | Auth | Purpose |
|---|---|---|
| `POST /api/announce` | HMAC | `{ network, port, peerId, [relayPubkey], [kind] }` heartbeat (`kind` = `"seed"`/`"operator"`). The dial multiaddr is built from the **request source IP** (NAT-friendly), which is also geolocated to country + lat/lon. Returns `{ ok, address, ttlMs }`. |
| `GET /api/peers?network=…` | same-origin / HMAC | `{ network, ttlMs, peers: [{ address, lastSeen, since, relayPubkey, country, countryName, lat, lon, kind }] }` (`country`/`lat`/`lon` omitted for loopback/unknown; `kind` is `"seed"`/`"operator"` — colors the node-app globe). |
| `GET /api/peers/stream?network=…` | same-origin / HMAC | The same set pushed over SSE as nodes come/go. |
| `GET /api/health` | public | `{ ok, networks, live }`. |

`network` ∈ `seed · forge · rise · one`.

## Test

```bash
pnpm test           # node --test: HMAC accept-once/replay, tamper/expiry rejection, presence + TTL
```

## Deploy (peers.pyraxchain.com)

Build, then run `node server/index.js` behind a TLS terminator (Caddy/nginx/Fly)
with `SITE_ORIGIN=https://peers.pyraxchain.com`, `PYRAX_DIRECTORY_SECRET=<random>`, and
`TRUST_PROXY=1` if behind a proxy. For horizontal scale, swap the in-memory
presence map for Redis with per-key TTLs — the API shape is unchanged.
