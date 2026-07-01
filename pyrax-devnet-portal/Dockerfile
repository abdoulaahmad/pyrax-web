# SPDX-License-Identifier: LicenseRef-Proprietary
#
# Production image for the PYRAX Devnet Tester Portal (Astro SSR, @astrojs/node standalone). Built by
# pyrax-infra from the pyrax-web source and pushed to GHCR; the websites droplet runs it behind Caddy.
# Runtime config comes from the environment (DATABASE_URL_DEVNET, SESSION_SECRET, DEVNET_CHAT_SECRET,
# CHAT_WS_URL, BREVO_*, VAPID_*, SPACES_*, PUBLIC_URL, …) — see .env.example. This one image serves
# BOTH the SSR portal (default CMD) AND the standalone chat WebSocket server: pyrax-infra/web-devnet
# runs a second container from this image with `command: node ./scripts/chat-server.mjs`, so the
# runtime stage bundles scripts/ too.

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4322
# wget (busybox, already in alpine) backs the HEALTHCHECK below.
# Copy the resolved modules + built server (the standalone adapter externalizes node_modules).
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
# The standalone chat WS server runs from this same image (see header) — bundle its source.
COPY --from=build /app/scripts ./scripts
# Drop privileges: run as the built-in unprivileged `node` user, never root.
USER node
EXPOSE 4322
# Liveness: hit the in-process /healthz route (always 200 while up; DB health is a non-fatal field).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:4322/healthz || exit 1
CMD ["node", "./dist/server/entry.mjs"]
