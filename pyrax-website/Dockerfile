# syntax=docker/dockerfile:1
# SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
# pyrax-website -> pyraxchain.com (static, multi-page Vite + configless Tailwind v4).
# BUILD CONTEXT = monorepo ROOT so the sibling pyrax-shared/ is available to the Vite/@source build:
#   docker build -f pyrax-website/Dockerfile -t ghcr.io/pyrax-network/pyrax-web-website .
FROM node:24-slim AS build
RUN npm install -g pnpm@10
WORKDIR /repo
COPY pyrax-shared ./pyrax-shared
COPY pyrax-website ./pyrax-website
WORKDIR /repo/pyrax-website
RUN pnpm install --no-frozen-lockfile
RUN pnpm run build

FROM nginx:alpine
COPY pyrax-website/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/pyrax-website/dist /usr/share/nginx/html
EXPOSE 80
