# SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
#
# The PYRAX public test-token faucet: a tiny Node HTTP server (faucet.mjs) that
# dispenses test PYRX by shelling out to the bundled `pyrax` CLI. Base = ubuntu:24.04
# to match the CLI's build runner glibc (2.39); the CLI is pulled from the public OTA
# feed (no token), same as the relay image.
FROM ubuntu:24.04

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates jq nodejs \
  && rm -rf /var/lib/apt/lists/*

# Install the latest published CLI (resolve the linux filename from the manifest).
RUN set -eux; \
  f=$(curl -fsSL https://updates.pyraxchain.com/cli/manifest.json | jq -r .files.linux); \
  test -n "$f" && test "$f" != "null"; \
  curl -fsSL "https://updates.pyraxchain.com/cli/$f" -o /tmp/cli.tgz; \
  tar -xzf /tmp/cli.tgz -C /usr/local/bin; \
  chmod +x /usr/local/bin/pyrax; \
  rm /tmp/cli.tgz; \
  /usr/local/bin/pyrax --version

COPY faucet/faucet.mjs /usr/local/bin/faucet.mjs
COPY faucet/entrypoint.sh /usr/local/bin/faucet-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/faucet-entrypoint.sh && chmod +x /usr/local/bin/faucet-entrypoint.sh

EXPOSE 8800
ENTRYPOINT ["/usr/local/bin/faucet-entrypoint.sh"]
