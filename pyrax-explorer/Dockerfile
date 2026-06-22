# syntax=docker/dockerfile:1
# SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
# pyrax-explorer FRONTEND -> explorer.pyraxchain.com (static Vite). The indexer/API is a separate
# image (pyrax-explorer/server). Build context = monorepo ROOT.
#   docker build -f pyrax-explorer/Dockerfile -t ghcr.io/pyrax-network/pyrax-web-explorer .
FROM node:24-slim AS build
WORKDIR /repo
COPY pyrax-shared ./pyrax-shared
COPY pyrax-explorer ./pyrax-explorer
WORKDIR /repo/pyrax-explorer
RUN npm install
RUN npm run build

FROM nginx:alpine
COPY pyrax-explorer/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/pyrax-explorer/dist /usr/share/nginx/html
EXPOSE 80
