#!/bin/sh
# SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
#
# Ensure the faucet's dispensing key exists, then start the HTTP faucet. Idles if
# PYRAX_KEY_PASSPHRASE is unset (so the service can deploy before it's configured).
#
# The dispensing key is the FAUCET operator account, which the uniform dev/test
# genesis pre-funds (1 B PYRX) — so the faucet can dispense immediately with NO
# post-genesis funding transaction. We import the well-known, PUBLIC Hardhat/Anvil
# account #2 private key (0x3C44…293BC) under the name `faucet-op`. A fresh name
# (not `faucet`) guarantees we never collide with an older auto-generated key left
# in the data volume. This is a documented throwaway dev key used ONLY on dev/test
# networks (the faucet is never wired to mainnet) — it MUST NEVER be reused on mainnet.
set -eu

if [ -z "${PYRAX_KEY_PASSPHRASE:-}" ]; then
  echo "[faucet] idle — set PYRAX_KEY_PASSPHRASE and redeploy to activate."
  exec sleep infinity
fi

export PYRAX_HOME=/data
FAUCET_KEY="${FAUCET_KEY:-faucet-op}"
# Anvil/Hardhat account #2 (mnemonic "test test … junk"). PUBLIC dev key — dev/test only.
FAUCET_SK="0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
# Import the genesis-funded dispensing key once (idempotent: skipped if it exists).
if ! pyrax keys show "$FAUCET_KEY" >/dev/null 2>&1; then
  echo "[faucet] importing genesis-funded dispensing key '$FAUCET_KEY' (Anvil #2)…"
  pyrax keys import "$FAUCET_KEY" "$FAUCET_SK" || true
fi
echo "[faucet] dispensing address: $(pyrax keys show "$FAUCET_KEY" 2>/dev/null || echo '?')"
exec node /usr/local/bin/faucet.mjs
