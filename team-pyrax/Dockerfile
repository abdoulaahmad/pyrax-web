# syntax=docker/dockerfile:1
# SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
# team-pyrax -> team-pyrax.pyraxchain.com. ONE container: a Node server serves the
# built SPA (dist/) AND the magic-link-gated API on :8790. SQLite persists in /data.
# Build context = this directory (team-pyrax/); it is self-contained (no @pyrax/shared).
#   docker build -f team-pyrax/Dockerfile -t ghcr.io/pyrax-network/pyrax-web-team-pyrax ./team-pyrax

# --- build the SPA (Vite + configless Tailwind v4) ---
FROM node:24-slim AS build
RUN npm install -g pnpm@10
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --no-frozen-lockfile
COPY . .
RUN pnpm run build

# --- runtime: Node server + better-sqlite3 (linux-x64 prebuild, no compile) ---
# If a future base image lacks a prebuild, add:
#   RUN apt-get update && apt-get install -y --no-install-recommends python3 build-essential
FROM node:24-slim
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY server ./server
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8790 \
    DATA_DIR=/data \
    TRUST_PROXY=1
VOLUME ["/data"]
EXPOSE 8790
CMD ["node", "server/index.js"]
