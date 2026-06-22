# syntax=docker/dockerfile:1
# SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
# pyrax-peer-directory -> peers.pyraxchain.com. ONE container: the zero-dependency Node server serves
# the built frontend (dist) AND the hardened announce/SSE API on :8787. Build context = monorepo ROOT.
#   docker build -f pyrax-peer-directory/Dockerfile -t ghcr.io/pyrax-network/pyrax-web-peer-directory .
FROM node:24-slim AS build
RUN npm install -g pnpm@10
WORKDIR /repo
COPY pyrax-shared ./pyrax-shared
COPY pyrax-peer-directory ./pyrax-peer-directory
WORKDIR /repo/pyrax-peer-directory
RUN pnpm install --no-frozen-lockfile
RUN pnpm run build

FROM node:24-alpine
WORKDIR /app
# server/index.js is pure Node built-ins (zero deps) and serves ../dist + /api.
COPY --from=build /repo/pyrax-peer-directory/server ./server
COPY --from=build /repo/pyrax-peer-directory/dist ./dist
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8787 \
    TRUST_PROXY=1
EXPOSE 8787
CMD ["node", "server/index.js"]
