# SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
#
# Production image for the PYRAX public test-token faucet (faucet.pyraxchain.com +
# pyrax-<net>.faucet.pyraxchain.com). The faucet is a dependency-free Node HTTP server
# (faucet.mjs) that dispenses test PYRX by shelling out to the bundled `pyrax` CLI, so this
# image must ship BOTH the CLI binary and the Node runtime.
#
# ── BUILD CONTEXT (assembled by pyrax-infra/.github/workflows/faucet-image.yml) ─────────────
# The `pyrax` CLI is a Rust project in a DIFFERENT repo (pyrax-node-suite) than the faucet
# (pyrax-web), and it path-depends on the PYRAX core crates in a THIRD repo (pyrax-core, the
# `pyrax/` sibling). The image workflow checks out all three and lays them out at the build
# context ROOT so this recipe can build the CLI and copy the faucet:
#
#   <context-root>/
#     ├── faucet/        (from PYRAX-NETWORK/pyrax-web  — this dir contains this Dockerfile)
#     ├── pyrax-cli/     (from PYRAX-NETWORK/pyrax-node-suite, its pyrax-cli/ subdir)
#     └── pyrax/         (from PYRAX-NETWORK/pyrax-core  — the core crates pyrax-cli path-deps)
#
# pyrax-cli/Cargo.toml path-depends on ../pyrax/crates/* (verified), so pyrax-cli and pyrax
# MUST sit as SIBLINGS. Locally that relation is a symlink (pyrax-node-suite/pyrax -> ../pyrax);
# in CI the workflow materializes it as real sibling directories in the context.
#
#   docker build -f faucet/Dockerfile -t pyrax-faucet <context-root>

# ---- Rust builder: compile the `pyrax` CLI from source -------------------------------------
# rust:1-bookworm ships stable, but pyrax-cli/rust-toolchain.toml pins nightly-2026-06-10
# (the core workspace's ZK prover, plonky2, is in the default build and needs nightly). rustup
# in this base auto-installs that pinned channel on first `cargo` invocation inside pyrax-cli/.
FROM rust:1-bookworm AS cli-builder

# Native build deps the CLI's dependency graph pulls transitively:
#   - clang/cmake/pkg-config: libp2p/jsonrpsee/crypto build scripts
#   - perl: blst (BLS12-381) build (compiles C/assembly via `cc`)
#   - libssl-dev: generous safety net for any transitive C dep (TLS is rustls, but harmless)
#   - protobuf-compiler: pyrax-proto uses a VENDORED protoc, so this is only a belt-and-braces
#     fallback; the vendored binary is what actually runs.
# Storage is pure-Rust redb (no RocksDB), so no extra C DB toolchain is required.
RUN apt-get update && apt-get install -y --no-install-recommends \
      cmake clang pkg-config libssl-dev protobuf-compiler perl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
# Copy the core crates and the CLI as siblings so pyrax-cli's `../pyrax/crates/*` path deps
# resolve exactly as they do locally. The build then runs from inside pyrax-cli, which is where
# its pinned rust-toolchain.toml lives (so rustup selects nightly-2026-06-10 for this build).
COPY pyrax ./pyrax
COPY pyrax-cli ./pyrax-cli

WORKDIR /build/pyrax-cli
# Release build of the `pyrax` binary. The CLI embeds `pyrax-node` with the `full` feature
# (RPC + live libp2p mesh) — the same node the desktop apps run — so the faucet's `wallet
# send` / `wallet shielded-send` / `wallet shield` calls have everything they need.
# NOTE: no `--locked`. pyrax-cli, pyrax-core and pyrax-web are three INDEPENDENTLY-versioned
# repos; pinning the lockfile would fail the build whenever the checked-out core `main` has
# drifted from pyrax-cli/Cargo.lock. The committed lockfile still guides resolution; this
# mirrors the proven pyrax-infra/node/Dockerfile (which also builds core with a plain `cargo
# build`). Pin `cli_ref`/`core_ref` in the image workflow for a fully reproducible build.
RUN cargo build --release --bin pyrax \
    && cp target/release/pyrax /usr/local/bin/pyrax \
    && /usr/local/bin/pyrax --version

# ---- Node 24 runtime: the faucet HTTP server -----------------------------------------------
FROM node:24-bookworm-slim AS runtime

# The entrypoint uses `curl` to probe the node RPC before pre-shielding; the CLI needs
# ca-certificates for outbound HTTPS RPC. Nothing else is required (the faucet is dependency-free).
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# The `pyrax` CLI on PATH — the faucet shells out to it via spawnSync("pyrax", ...).
COPY --from=cli-builder /usr/local/bin/pyrax /usr/local/bin/pyrax

# The faucet server + its entrypoint. `faucet/` is the build-context path (see header).
WORKDIR /app
COPY faucet/faucet.mjs   /usr/local/bin/faucet.mjs
COPY faucet/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# PYRAX_HOME=/data — the CLI keystore + the faucet's rate-limit/welcomed state files live here.
# entrypoint.sh also exports PYRAX_HOME=/data; set it in the image so a bare run agrees.
ENV PYRAX_HOME=/data \
    PORT=4325
VOLUME ["/data"]

EXPOSE 4325

# Liveness: the faucet always answers /healthz 200 while the process is up (see faucet.mjs).
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -fsS http://127.0.0.1:4325/healthz >/dev/null || exit 1

# entrypoint.sh imports the per-network genesis-funded keys (idempotent), best-effort
# pre-shields, then `exec node /usr/local/bin/faucet.mjs`.
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
