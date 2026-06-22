# syntax=docker/dockerfile:1
# SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
# pyrax-nodes-website -> nodes.pyraxchain.com (static Vite). Build context = monorepo ROOT.
#   docker build -f pyrax-nodes-website/Dockerfile -t ghcr.io/pyrax-network/pyrax-web-nodes-website .
FROM node:24-slim AS build
WORKDIR /repo
COPY pyrax-shared ./pyrax-shared
COPY pyrax-nodes-website ./pyrax-nodes-website
WORKDIR /repo/pyrax-nodes-website
RUN npm install
RUN npm run build

FROM nginx:alpine
COPY pyrax-nodes-website/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/pyrax-nodes-website/dist /usr/share/nginx/html
EXPOSE 80
