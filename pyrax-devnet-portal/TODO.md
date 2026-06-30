# Devnet Tester Portal — open items (for Shawn)

Things I deferred / need from you during the autonomous build. Tackle when you're back.

**Status: feature-complete + committed (local, not pushed).** Tester portal (onboarding, 9-digit OTP,
dashboard, node link + founding/uptime rewards, Issue Council with uploads + criticality bounties,
realtime chat with DMs/groups/roster/roles, releases + web push) **and** the team-site Devnet
Management surface (Devnet Users + invites, Issue Council triage, Downloads/status toggle, shared
community chat where team appears as Admin, per-admin chat username). All suites green: foundation
12/12, node 10/10, Issue Council 10/10, chat/DM 10/10, team↔devnet chat 10/10. Both apps build clean.
Remaining items below are config/deploy/integration that need you or a later app rebuild.

## Keys / config you need to add (in the root `.env`)
- **`GIPHY_API_KEY=`** — paste your Giphy key. The chat GIF picker is wired but inert until set.
- **DO Spaces (Issue Council attachments)** — confirm `SPACES_KEY` / `SPACES_SECRET` are present and
  that the bucket/region are `pyrax` / `tor1` (override with `SPACES_BUCKET` / `SPACES_REGION`).
  The SigV4 presigner is built but I couldn't verify a real upload against live Spaces autonomously —
  please test one image upload in the Issue Council. Text-only reports work regardless.
- **VAPID push keys** — auto-generated into `.env` (`VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` /
  `VAPID_SUBJECT=mailto:noreply@pyraxchain.com`). Move the private key to prod secrets at deploy.
- **`DEVNET_CHAT_SECRET`** — auto-generated; the team site uses the SAME value to sign chat tokens.

## Network
- Testers exercise **PYRAX Forge** — chain **710823**, RPC **pyrax-forge.rpc.pyraxchain.com**
  (origin **147.182.148.233**). Set in the devnet defaults; admin-editable from the team-site panel.
  DNS + Caddy route for `pyrax-forge.rpc.pyraxchain.com` → 147.182.148.233 at deploy.

## Integrations to finish later
- **Inferno app + CLI** — pairing + heartbeat to be implemented during the app rebuild. Portal side
  is done + a simulator stands in (`scripts/node-simulator.mjs`, spec in `docs/NODE-INTEGRATION.md`).
- **Reward cron** — `/api/admin/run-rewards` is a manual monthly runner; wire a real cron at deploy.
- **Brevo stored templates** — DONE for ALL transactional email. Every devnet email now sends via an
  on-brand stored template (same premium card/flame-bar/divider design); inline HTML stays only as a
  fallback if an id is unset:
  - sign-in OTP → **id=2** (`{{params.otp}}` / `{{params.expires}}`)
  - closed-alpha invite → **id=3** (`{{params.link}}`) — sent by the team site's `sendDevnetInvite`
  - new-build release alert → **id=4** (`{{params.version}}` / `title` / `notes` / `downloadUrl`, with
    a `{% if params.downloadUrl %}` Update button)
  - Issue Council / activity notify (mention, reply, accepted bug) → **id=5** (`{{params.title}}` /
    `body` / `link`)
  Recorded as `BREVO_DEVNET_{OTP,INVITE,RELEASE,NOTIFY}_TEMPLATE_ID` in `.env`. Source HTML in
  `src/server/*-template.html`; re-run `create-brevo-devnet-templates.mjs` to re-sync after edits.

## Deploy (via pyrax-infra, like the team site)
- New `devnet-portal` image + deploy workflow + compose in pyrax-infra; DNS `devnet.pyraxchain.com`;
  secrets: `DATABASE_URL_DEVNET`, `SESSION_SECRET`, `BREVO_API_KEY`, `SPACES_*`, `VAPID_*`,
  `DEVNET_CHAT_SECRET`, `GIPHY_API_KEY`.
- Provisioned: the `devnet_tester` database already exists on the managed PG cluster.

## Funding
- Tester rewards (the accruing PYRX, paid at mainnet airdrop) are funded from the **marketing
  allocation**. Track the running liability via the earnings ledger / leaderboard totals.

## Decisions for you (none blocking — defaults chosen)
- Reward magnitude = your generous 2× table (founding bonus 50,000 PYRX). Adjust in `src/lib/rewards.ts`.
- Attachment visibility = public-read with unguessable keys. Harden to private + signed-GET if needed.
