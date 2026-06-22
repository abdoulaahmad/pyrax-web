# SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
#
# Builds the PYRAX peer-directory (peers.pyraxchain.com) into a small runtime
# image: the configless-Tailwind v4 / Vite frontend compiled to dist/, served by
# the dependency-free Node presence server (pure Node built-ins, ZERO runtime
# deps — keep it that way; it minimizes attack surface).
#
#   docker build -f deploy/Dockerfile -t pyrax-peer-directory .   # context = repo root

# ---- build: compile the frontend to dist/ --------------------------------
FROM node:22-bookworm-slim AS build
WORKDIR /src
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build        # tsc --noEmit && vite build  ->  dist/

# ---- runtime: just Node + the server + the built dist/ -------------------
FROM node:22-bookworm-slim AS runtime
RUN useradd -m -u 10001 pyrax
WORKDIR /home/pyrax/app
# package.json carries "type": "module" (the server is ESM). No dependencies are
# installed at runtime — the server uses only Node built-ins. The server resolves
# dist/ as a SIBLING of server/ (join(__dirname, "..", "dist")), so preserve that
# layout.
COPY --from=build /src/package.json ./package.json
COPY --from=build /src/server ./server
COPY --from=build /src/dist ./dist
USER pyrax
EXPOSE 8787
# PORT, PYRAX_DIRECTORY_SECRET, PYRAX_ENABLED_NETWORKS, SITE_ORIGIN, TRUST_PROXY
# are supplied by docker-compose. See deploy/.env.example.
CMD ["node", "server/index.js"]
