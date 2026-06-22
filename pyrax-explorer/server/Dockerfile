# SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
# PYRAX Explorer indexer — Node 24. better-sqlite3 ships linux-x64 prebuilds (no compile); solc is
# pure JS. If a future base lacks a prebuild, add: RUN apt-get update && apt-get install -y --no-install-recommends python3 build-essential
FROM node:24-slim
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force

COPY . .

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8788 \
    DATA_DIR=/data
VOLUME ["/data"]
EXPOSE 8788

CMD ["node", "index.js"]
