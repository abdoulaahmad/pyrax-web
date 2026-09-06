# SPDX-License-Identifier: LicenseRef-Proprietary
#
# Production image for the PYRAX marketing site (pyraxnetwork.org — Astro 5 SSR, @astrojs/node
# standalone). Built by pyrax-infra (.github/workflows/web-website-image.yml) from the pyrax-web
# source and pushed to GHCR; pyrax-infra/web-website/docker-compose.yml runs it on the websites
# droplet behind the shared websites Caddy edge. The site is stateless: it reads only optional,
# non-secret env (network TTLs, TEAM_URL) with safe defaults — no database, no secrets.

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4325
# Copy the resolved modules + built server (the standalone adapter externalizes node_modules).
# Own the files as the unprivileged `node` user so the process can read them while running non-root.
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json ./package.json
# Drop root: run the server as the unprivileged `node` user (defense-in-depth).
USER node
EXPOSE 4325
# Liveness: the /healthz endpoint returns 200 without any external dependency.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:4325/healthz || exit 1
CMD ["node", "./dist/server/entry.mjs"]
