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

# Pre-shield a chunk of the operator's transparent balance into the shielded pool so
# that `wallet shielded-send` has notes to spend. Best-effort and never fatal: the node
# RPC may not be reachable yet at boot, in which case we skip and the faucet still serves
# transparent drips. (Shielding is idempotent in effect — re-running just shields more.)
SHIELD_RPC="${FAUCET_RPC:-http://node:8545}"
SHIELD_ASH="${FAUCET_SHIELD_ASH:-100000000000000000000000}" # 100k PYRX
# Probe the node with a raw JSON-RPC call (curl is in the image; works regardless of
# which CLI subcommands exist). Only attempt the shield when the node answers.
if curl -fsS --max-time 4 -H 'content-type: application/json' \
     -d '{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}' \
     "$SHIELD_RPC" >/dev/null 2>&1; then
  echo "[faucet] node reachable — pre-shielding $SHIELD_ASH ash into the shielded pool…"
  if pyrax --rpc-url "$SHIELD_RPC" wallet shield "$SHIELD_ASH" --from "$FAUCET_KEY"; then
    echo "[faucet] shielded pool funded."
  else
    echo "[faucet] WARN: pre-shield failed — shielded-send may have no notes yet (transparent still works)."
  fi
else
  echo "[faucet] node RPC ($SHIELD_RPC) not reachable yet — skipping pre-shield (transparent still works)."
fi

exec node /usr/local/bin/faucet.mjs
