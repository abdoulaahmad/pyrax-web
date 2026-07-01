# SPDX-License-Identifier: LicenseRef-Proprietary
#
# Production image for the PYRAX Explorer indexer + read API (Node 24, pg + solc + ws). Ingests
# blocks/txns/logs/transfers/tokens per network into DigitalOcean Managed PostgreSQL and serves a
# JSON read API + realtime WebSocket on :8788 (/api/ws). Built by pyrax-infra → GHCR; run behind Caddy.
# Runtime config comes from the environment (EXPLORER_DATABASE_URL/DATABASE_URL, RPC_<chainId>,
# INGEST_*, ALLOW_ORIGIN, PORT/HOST) — see ../.env.example.

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8788
# Install from the lockfile (reproducible), production-only.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY . .
# Drop root: run as the built-in unprivileged `node` user.
USER node
EXPOSE 8788
# Liveness: the read API answers GET /api/health with { ok: true }.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8788)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "index.js"]
