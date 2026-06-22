# syntax=docker/dockerfile:1
# SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
# team-pyrax -> team-pyrax.pyraxchain.com. ONE container: a Node server serves the
# built SPA (dist/) AND the magic-link-gated API on :8790. State lives in DigitalOcean
# Managed PostgreSQL (DATABASE_URL), so the container itself is stateless.
# Build context = this directory (team-pyrax/); self-contained (no @pyrax/shared).
#   docker build -f team-pyrax/Dockerfile -t ghcr.io/pyrax-network/pyrax-web-team-pyrax ./team-pyrax

# --- build the SPA (Vite + configless Tailwind v4) ---
FROM node:24-slim AS build
RUN npm install -g pnpm@10
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --no-frozen-lockfile
COPY . .
RUN pnpm run build

# --- runtime: Node server + `pg` (pure JS, no native build step) ---
FROM node:24-slim
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY server ./server
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8790 \
    TRUST_PROXY=1
EXPOSE 8790
CMD ["node", "server/index.js"]
