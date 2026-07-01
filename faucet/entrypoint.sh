#!/bin/sh
# SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
#
# Ensure the faucet's per-network dispensing keys exist, then start the HTTP faucet. Idles
# if PYRAX_KEY_PASSPHRASE is unset (so the service can deploy before it's configured).
#
# The dispensing keys are the CONTROLLED, genesis-funded welcome-faucet wallets for each
# network — so the faucet can dispense immediately with NO post-genesis funding tx. The
# deploy passes each network's secret from the root .env vault (NEVER logged; only the
# derived address is printed), imported under the keystore NAME the faucet signs with:
#   FAUCET_SK        -> Seed  (881109) under $FAUCET_KEY        (default seed-faucet;  SEED_FAUCET_KEY)
#   FAUCET_SK_710823 -> Forge (710823) under $FAUCET_KEY_710823 (default forge-faucet; FORGE_FAUCET_KEY)
# The faucet is NEVER wired to mainnet.
set -eu

if [ -z "${PYRAX_KEY_PASSPHRASE:-}" ]; then
  echo "[faucet] idle — set PYRAX_KEY_PASSPHRASE and redeploy to activate."
  exec sleep infinity
fi

export PYRAX_HOME=/data

# SECURITY (finding M16): the faucet is ALWAYS deployed behind the shared Caddy edge, which
# OVERWRITES X-Forwarded-For with the real client IP as the rightmost hop (see the faucet
# route in pyrax-web/Caddyfile). Turn on proxy trust by default so the per-IP anti-automation
# caps read that trusted, attacker-uncontrollable IP instead of collapsing every caller into
# one shared bucket. Overridable: set TRUST_PROXY explicitly (e.g. 0) if the faucet is ever
# run WITHOUT the single-proxy topology, so a client-spoofed XFF is never trusted as identity.
export TRUST_PROXY="${TRUST_PROXY:-1}"

# Import one network's genesis-funded welcome-faucet key under its keystore name (idempotent:
# skipped if it already exists). The secret is read from the environment and never echoed.
import_key() {
  name="$1"; secret="$2"
  [ -n "$secret" ] || return 0
  if ! pyrax keys show "$name" >/dev/null 2>&1; then
    echo "[faucet] importing genesis-funded dispensing key '$name'…"
    pyrax keys import "$name" "$secret" || true
  fi
  echo "[faucet] '$name' dispensing address: $(pyrax keys show "$name" 2>/dev/null || echo '?')"
}

# Seed (881109) welcome-faucet key (SEED_FAUCET_KEY in the vault → FAUCET_SK in the deploy).
FAUCET_KEY="${FAUCET_KEY:-seed-faucet}"
import_key "$FAUCET_KEY" "${FAUCET_SK:-}"

# Forge (710823) welcome-faucet key (FORGE_FAUCET_KEY in the vault → FAUCET_SK_710823 in the
# deploy). Only imported when the Forge secret is configured, so a Seed-only deploy is unchanged.
FAUCET_KEY_710823="${FAUCET_KEY_710823:-forge-faucet}"
import_key "$FAUCET_KEY_710823" "${FAUCET_SK_710823:-}"

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
