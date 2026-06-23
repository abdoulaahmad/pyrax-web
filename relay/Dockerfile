# SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
#
# The PYRAX on-chain events relayer (`pyrax relay`) as a container for the websites
# stack. It installs the LATEST published `pyrax` CLI from the public OTA feed
# (updates.pyraxchain.com/cli) — no private registry/token needed — and runs the
# relayer, which records team-pyrax logins + curated app notifications as gas-only
# event transactions on the newest live network.
#
# Base = ubuntu:24.04 to match the CLI's build runner (ubuntu-latest, glibc 2.39);
# an older glibc (e.g. debian bookworm's 2.36) can't load the binary.
FROM ubuntu:24.04

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates jq \
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

ENV PYRAX_HOME=/data
COPY relay/relay.json /etc/pyrax/relay.json
COPY relay/entrypoint.sh /usr/local/bin/relay-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/relay-entrypoint.sh && chmod +x /usr/local/bin/relay-entrypoint.sh

EXPOSE 8799
ENTRYPOINT ["/usr/local/bin/relay-entrypoint.sh"]
