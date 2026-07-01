# SPDX-License-Identifier: LicenseRef-Proprietary
#
# Production image for the PYRAX Explorer (Astro SSR, @astrojs/node standalone). Built by pyrax-infra
# and pushed to GHCR; run behind Caddy on the websites droplet. Runtime config comes from the
# environment (RPC_<chainId>, EXPLORER_DATABASE_URL / DATABASE_URL, DATABASE_SSL/DATABASE_CA, …) —
# see .env.example. The data layer is fail-safe: with no DB it serves live-RPC → PYRAX-native sample.

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4324
# Copy the resolved modules + built server (the standalone adapter externalizes node_modules).
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
# Drop root: run as the built-in unprivileged `node` user.
USER node
EXPOSE 4324
# Liveness: the SSR server answers GET / (always 200 with sample data, even with no DB/RPC).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4324)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "./dist/server/entry.mjs"]
