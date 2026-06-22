# SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
# PYRAX Explorer indexer — Node 24. State lives in DigitalOcean Managed PostgreSQL
# (DATABASE_URL); `pg` + `solc` are pure JS, so there is no native build step.
FROM node:24-slim
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force

COPY . .

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8788
EXPOSE 8788

CMD ["node", "index.js"]
