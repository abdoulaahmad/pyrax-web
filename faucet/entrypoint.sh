#!/bin/sh
# SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
#
# Ensure the faucet's dispensing keystore key exists (auto-created on first run;
# its address is logged so it can be funded), then start the HTTP faucet. Idles if
# PYRAX_KEY_PASSPHRASE is unset (so the service can deploy before it's configured).
set -eu

if [ -z "${PYRAX_KEY_PASSPHRASE:-}" ]; then
  echo "[faucet] idle — set PYRAX_KEY_PASSPHRASE and redeploy to activate."
  exec sleep infinity
fi

export PYRAX_HOME=/data
# Create the faucet key if it doesn't exist yet; print its address to fund.
if ! pyrax keys show faucet >/dev/null 2>&1; then
  echo "[faucet] generating dispensing key 'faucet'…"
  pyrax keys new faucet || true
fi
echo "[faucet] dispensing address (FUND THIS): $(pyrax keys show faucet 2>/dev/null || echo '?')"
exec node /usr/local/bin/faucet.mjs
