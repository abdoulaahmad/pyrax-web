<!-- SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary -->
# pyrax-website

The marketing site for **PYRAX** (the private Layer-1) and **NEURAX** (the decentralized AI).
Multi-page, **configless Tailwind v4**, a multi-column **mega menu**, live network stats, and a
Brevo-backed waitlist — matched to the `pyrax-peer-directory` / wallet stack.

## Stack

- **Vite 6** + **`@tailwindcss/vite` v4** — configless: the theme lives in `src/styles.css`
  (`@theme` + `@utility`), there is **no `tailwind.config.js`**.
- **TypeScript**, vanilla DOM (no framework). Shared chrome + content rendered once and reused.
- Multi-page: `index.html` (home) + `network` · `neurax` · `token` · `developers` · `node` ·
  `company`. Each HTML shell mounts its page module from `src/pages/`.

## Develop

```bash
pnpm install      # or: npm install
pnpm dev          # vite dev server
pnpm build        # tsc --noEmit && vite build  → dist/
pnpm preview      # preview the production build
```

## Project shape

```
index.html, *.html        # one shell per page (head + #header/#main/#footer + page script)
src/styles.css            # configless Tailwind v4 theme + brand utilities (the design system)
src/lib/
  content.ts              # ALL marketing copy + facts (grounded in the AMA) — edit here
  ui.ts                   # inline stroke-icon set + small render helpers
  chrome.ts               # the mega-menu header + footer + interactions + reveal-on-scroll
  brevo.ts                # the waitlist form + submit handling
  stats.ts                # live-network strip (graceful fallback to static targets)
src/pages/*.ts            # per-page composition (home, network, neurax, token, developers, node, company)
public/                   # brand assets (phoenix icon, logos, favicons, background)
worker/subscribe.js       # Cloudflare Worker — Brevo proxy (holds the API key server-side)
```

## Before launch — confirm these

All external URLs live in **one place**: `src/lib/content.ts` → `LINKS` (and `STATS_ENDPOINT` in
`src/lib/stats.ts`). Items marked `(verify)` should be confirmed:

- `explorer`, `github`, `x`, `discord`, `telegram` — point at the real destinations.
- `docs` is the in-site `/docs.html` page (built into this site); `peers` (`peers.pyraxchain.com`) is the live peer directory.

## Waitlist (Brevo)

The static site cannot hold the Brevo API key, so the form POSTs `{ email }` to **`/api/subscribe`**
(`BREVO_ENDPOINT` in `src/lib/brevo.ts`) — a tiny serverless proxy that holds the key server-side.
A ready-to-deploy Cloudflare Worker is in `worker/subscribe.js`:

```bash
cd worker
wrangler secret put BREVO_API_KEY        # your Brevo v3 API key
# set BREVO_LIST_ID (the waitlist list) + ALLOW_ORIGIN as [vars], and bind a route for /api/subscribe
wrangler deploy
```

Until the worker is deployed, the form validates input and gives honest feedback rather than
silently dropping addresses.

## Live network stats

`src/lib/stats.ts` renders the honest design targets immediately and **upgrades** the tiles
(block height, peers, …) if `STATS_ENDPOINT` returns JSON. A missing/slow endpoint is a no-op — the
static targets stay. Point `STATS_ENDPOINT` at the explorer/peer service when one is available.

## Accuracy

Every figure on the site is grounded in the ratified tokenomics + the vetted community AMA
(`../ama.md`): PYRX, the 50B hard cap, the $0.0025 genesis, capped 12.5B mining emissions, the 25%
fee burn, the CFTC utility-token posture, and **brand-only** NEURAX model names. No price promises.
