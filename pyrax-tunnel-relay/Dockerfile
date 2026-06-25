# SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
# Self-hosted PYRAX node-portal tunnel relay. Zero runtime deps (pure Node built-ins),
# so there is no `npm install` step — just the source. Runs behind Caddy on the websites
# droplet; reachable at wss://nodes.pyraxchain.com/__tunnel/register and proxies
# https://<id>.nodes.pyraxchain.com to each node's local portal.
FROM node:24-alpine
WORKDIR /app
COPY package.json ./
COPY protocol.mjs ws.mjs relay.mjs ./
# Persisted registry (killed flags + last-known meta) lives on a mounted volume.
VOLUME ["/data"]
EXPOSE 8792
ENV PORT=8792
CMD ["node", "relay.mjs"]
