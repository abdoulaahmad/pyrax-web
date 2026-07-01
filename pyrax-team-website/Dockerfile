# SPDX-License-Identifier: LicenseRef-Proprietary
#
# Production image for the PYRAX Team Portal (Astro SSR, @astrojs/node standalone). Built by
# pyrax-infra (.github/workflows/team-website-image.yml) from the pyrax-web source and pushed to
# GHCR; pyrax-infra/web-team/docker-compose.yml runs it on the websites droplet behind Caddy.
# Runtime config comes from the environment (DATABASE_URL_TEAM_PYRAX, SESSION_SECRET, BREVO_*).

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4321
# Copy the resolved modules + built server (the standalone adapter externalizes node_modules).
# Own the files as the unprivileged `node` user (built into the base image) so the process can read
# them while running non-root.
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json ./package.json
# Drop root: run the server as the unprivileged `node` user (defense-in-depth).
USER node
EXPOSE 4321
# Liveness: the /healthz endpoint returns 200 without touching the DB.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:4321/healthz || exit 1
CMD ["node", "./dist/server/entry.mjs"]
