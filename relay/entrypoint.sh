#!/bin/sh
# SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
#
# Start the relayer ONLY when it's configured. Until PYRAX_RELAY_SECRET (the HMAC
# key, shared with team-pyrax) and PYRAX_KEY_PASSPHRASE (unlocks the spender keys)
# are both set, the container idles instead of crash-looping — so the service can be
# deployed before those secrets exist, then activated by setting them + redeploying.
# On first real start the relayer auto-creates a spender key per network and prints
# each address to fund (read them with: docker compose logs relay).
set -eu

if [ -z "${PYRAX_RELAY_SECRET:-}" ] || [ -z "${PYRAX_KEY_PASSPHRASE:-}" ]; then
  echo "[relay] idle — set PYRAX_RELAY_SECRET + PYRAX_KEY_PASSPHRASE (GitHub secrets) and redeploy to activate."
  exec sleep infinity
fi

echo "[relay] starting pyrax relay (newest-live network; gas-only event txs)…"
exec pyrax relay --config /etc/pyrax/relay.json
