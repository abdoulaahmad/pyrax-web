# SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
# Caddy with the Cloudflare-DNS module, so it can issue the `*.nodes.pyraxchain.com`
# wildcard origin certificate via the ACME DNS-01 challenge (HTTP-01 can't do wildcards).
# A drop-in superset of stock Caddy — every existing HTTP-01 site keeps working unchanged;
# only the wildcard `*.nodes` site uses `tls { dns cloudflare {env.CLOUDFLARE_DNS_TOKEN} }`.
FROM caddy:2-builder AS builder
# xcaddy fetches ~30 Go modules from proxy.golang.org on every build; that proxy
# occasionally drops an HTTP/2 stream mid-download (INTERNAL_ERROR), which fails
# the whole build. Retry with backoff and fall back to a direct VCS fetch so a
# single flaky module download can't break the deploy.
ENV GOPROXY=https://proxy.golang.org,direct \
    GOFLAGS=-mod=mod \
    GOTOOLCHAIN=local
RUN set -eu; \
    for attempt in 1 2 3 4 5; do \
      echo "xcaddy build attempt $attempt/5"; \
      if xcaddy build --with github.com/caddy-dns/cloudflare; then \
        exit 0; \
      fi; \
      echo "xcaddy build attempt $attempt failed; retrying after backoff"; \
      go clean -modcache || true; \
      sleep $((attempt * 5)); \
    done; \
    echo "xcaddy build failed after 5 attempts" >&2; \
    exit 1

FROM caddy:2-alpine
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
