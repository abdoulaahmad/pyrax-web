# SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
#
# PYRAX self-hosted node-portal tunnel relay (replaces the retired Cloudflare Worker).
# Pure-Node service with ZERO runtime dependencies (all built-ins), so this is a minimal
# single-stage image: copy the sources + assets and run relay.mjs. It sits behind the shared
# Caddy web edge (web-edge/Caddyfile), which terminates TLS and reverse-proxies
# nodes.pyraxchain.com/__tunnel/* + *.nodes.pyraxchain.com to this container's port.
#
#   register (agent, WS):  wss://nodes.pyraxchain.com/__tunnel/register?id=&key=
#   browser portal:        https://<id>.nodes.pyraxchain.com/...
#   admin control plane:   /__admin/*  (HMAC via PYRAX_TUNNEL_ADMIN_SECRET)
#   health:                GET /healthz  (200 while up)
#
# Killed/registry state persists to /data/registry.json (a Docker volume) so a kill/key
# binding survives a relay restart — see the compose `state` volume.

FROM node:24-alpine

ENV NODE_ENV=production
WORKDIR /app

# No `npm install`: the service has no dependencies (package.json declares none). Copy the
# manifest first for the version/healthz read, then the sources + the offline-splash asset.
COPY package.json ./
COPY relay.mjs protocol.mjs ws.mjs logo-vertical.svg ./

# The relay listens on this port (overridable via PORT). Caddy reaches it by service name.
ENV PORT=8792
EXPOSE 8792

# Registry/kill state lives here (mounted as a volume in compose) so it survives restarts.
ENV PYRAX_TUNNEL_STATE=/data/registry.json

# Run as the built-in non-root `node` user; ensure it owns the state dir.
RUN mkdir -p /data && chown -R node:node /data /app
USER node

# Container health: the relay's own self-test proves the module loads + the health payload
# assembles WITHOUT binding the port, which is a fast, side-effect-free liveness signal.
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node relay.mjs --check || exit 1

CMD ["node", "relay.mjs"]
