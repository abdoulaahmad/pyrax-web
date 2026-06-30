# SPDX-License-Identifier: LicenseRef-Proprietary
#
# The PYRAX holding / security.txt origin: a tiny Caddy static server for pyraxchain.com that
# serves the apex placeholder + /.well-known/security.txt (RFC 9116) while the full site is
# rebuilt. Sits behind the Cloudflare proxy (SSL "Full", internal self-signed origin cert).

FROM caddy:2
COPY Caddyfile /etc/caddy/Caddyfile
COPY site /srv
EXPOSE 80 443
