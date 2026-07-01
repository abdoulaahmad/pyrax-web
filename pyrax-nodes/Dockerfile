# SPDX-License-Identifier: LicenseRef-Proprietary
#
# Production image for PYRAX Nodes (nodes.pyraxchain.com) — Astro SSR, @astrojs/node standalone.
# Built by pyrax-infra from the pyrax-web source and pushed to GHCR; run on the websites droplet
# behind Caddy. Runtime config comes from the environment (see .env.example): PYRAX_DIRECTORY_SECRET,
# NODES_ADMIN_SECRET, VAPID_*, BREVO_*, DATABASE_URL_NODES, TRUSTED_PROXY, etc.

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4323
# Copy the resolved modules + built server (the standalone adapter externalizes node_modules).
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
# Run as the non-root `node` user baked into the official image.
USER node
EXPOSE 4323
# Liveness check for the orchestrator — hits the in-process /healthz route (always 200 while up).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:4323/healthz || exit 1
CMD ["node", "./dist/server/entry.mjs"]
