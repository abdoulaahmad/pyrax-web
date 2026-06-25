# SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
# Caddy with the Cloudflare-DNS module, so it can issue the `*.nodes.pyraxchain.com`
# wildcard origin certificate via the ACME DNS-01 challenge (HTTP-01 can't do wildcards).
# A drop-in superset of stock Caddy — every existing HTTP-01 site keeps working unchanged;
# only the wildcard `*.nodes` site uses `tls { dns cloudflare {env.CLOUDFLARE_DNS_TOKEN} }`.
FROM caddy:2-builder AS builder
RUN xcaddy build --with github.com/caddy-dns/cloudflare

FROM caddy:2-alpine
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
