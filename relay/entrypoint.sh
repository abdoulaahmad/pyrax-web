#!/bin/sh
# SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
#
# Start the relayer ONLY when it's configured. Until PYRAX_RELAY_SECRET (the HMAC
# key, shared with team-pyrax) and PYRAX_KEY_PASSPHRASE (unlocks the spender keys)
# are both set, the container idles instead of crash-looping — so the service can be
# deployed before those secrets exist, then activated by setting them + redeploying.
#
# The spender for every dev/test network is the MARKETING account, which the uniform
# dev/test genesis pre-funds (1 B PYRX). "Notifications come from marketing", so the
# relayer signs its gas-only event txs with this one key. We import the well-known,
# PUBLIC Hardhat/Anvil account #1 private key (0x70997970…C79C8) under the name
# `marketing` so NO post-genesis funding transaction is ever needed. This key is a
# documented throwaway used ONLY on dev/test networks (mainnet's relay.json entry has
# an empty RPC and a real custodied key) — it MUST NEVER be reused on mainnet.
set -eu

if [ -z "${PYRAX_RELAY_SECRET:-}" ] || [ -z "${PYRAX_KEY_PASSPHRASE:-}" ]; then
  echo "[relay] idle — set PYRAX_RELAY_SECRET + PYRAX_KEY_PASSPHRASE (GitHub secrets) and redeploy to activate."
  exec sleep infinity
fi

export PYRAX_HOME=/data
# Anvil/Hardhat account #1 (mnemonic "test test … junk"). PUBLIC dev key — dev/test only.
MARKETING_SK="0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
# Import the marketing spender once (idempotent: skipped if it already exists). Done
# before `pyrax relay` starts so the relayer finds it and never auto-creates a random,
# unfunded spender in its place.
if ! pyrax keys show marketing >/dev/null 2>&1; then
  echo "[relay] importing genesis-funded marketing spender (Anvil #1)…"
  pyrax keys import marketing "$MARKETING_SK" || true
fi
echo "[relay] marketing spender address: $(pyrax keys show marketing 2>/dev/null || echo '?')"

echo "[relay] starting pyrax relay (newest-live network; gas-only event txs)…"
exec pyrax relay --config /etc/pyrax/relay.json
