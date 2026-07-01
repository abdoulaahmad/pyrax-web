<!-- SPDX-License-Identifier: LicenseRef-Proprietary -->

# pyrax-web fuzz workspace

Coverage-guided ([Jazzer.js](https://github.com/CodeIntelligenceTesting/jazzer.js), libFuzzer under the
hood) fuzzing of the **untrusted-input parsers / verifiers** in the PYRAX web portals
(`pyrax-team-website`, `pyrax-devnet-portal`, `pyrax-nodes`).

Every harness imports the **real production function** (never a reimplementation) through the `tsx` ESM
loader, feeds it Jazzer's bytes via `FuzzedDataProvider`, and asserts the function's **security
contract** — it never throws on hostile input, never hangs, and never violates its trust-boundary
guarantee (a bad HMAC is rejected, malformed XML does not crash, a malformed OTP is not accepted, a
manifest cannot point a download at a non-existent object). Assertions are strict: a real finding fails
the run loudly and is **never** weakened to hide it.

## Targets

| script | harness | real function(s) fuzzed | source | security property asserted |
|---|---|---|---|---|
| `fuzz:spaces-xml` | `spaces-xml.target.mjs` | `parseListObjectsV2`, `parseListKeysPage` | `pyrax-devnet-portal/src/server/s3presign.ts`, `pyrax-nodes/src/server/spaces.ts`, `pyrax-team-website/src/server/spaces.ts` | ListObjectsV2 XML parsing is **total** (never throws on any bytes) and well-typed; folder placeholders dropped; a continuation token only when `IsTruncated=true`. |
| `fuzz:announce-hmac` | `announce-hmac.target.mjs` | `verifyHmac` | `pyrax-nodes/src/server/hmac.ts` | **Soundness**: a signature that isn't the genuine HMAC over the canonical string is **rejected** (no forgery/bypass). **Completeness**: a genuine, in-window, never-seen signature is accepted. Total (always returns a boolean). |
| `fuzz:announce-body` | `announce-body.target.mjs` | `validateAnnounce` | `pyrax-nodes/src/server/announce-validate.ts` | Total on any parsed JSON; on accept, every field honors the rule (enabled net, port ∈ [1,65535], `peerId` ∈ `[0-9A-Za-z]{6,128}`, kind ∈ {operator,seed,rpc}, relayPubkey ≤128, peers ≤64 peerId-shaped); on reject, a string error + 4xx status. |
| `fuzz:otp-code` | `otp-code.target.mjs` | `normalizeOtpCode`, `isWellFormedOtp` | `pyrax-devnet-portal/src/server/otp-code.ts`, `pyrax-team-website/src/server/otp-code.ts` | Normalization is total and yields **only ASCII digits**; acceptance ⇒ exactly `OTP_LEN` digits (no punctuation/whitespace/unicode-look-alike can smuggle a mis-sized code past the gate); idempotent; the two portals agree on every input. |
| `fuzz:release-feed` | `release-feed.target.mjs` | `infernoPlatform`, `cliPlatform`, `versionFromName`, `versionFromManifest`, `versionFromFilename`, `matchDesktop`, `selectCliDownloads` | `pyrax-devnet-portal/src/server/releases-feed.ts`, `pyrax-nodes/src/server/feeds.ts`, `pyrax-team-website/src/server/feeds.ts` | Total on any filename / key array / manifest body (incl. non-object JSON + `__proto__`/`constructor` keys); classifiers return `win|mac|linux|null`; versions are null or non-empty strings; **selection soundness** — a picked filename must actually exist in the feed keys (no "phantom download"). |

## Install & run

```sh
cd pyrax-web/fuzz
npm install                    # @jazzer.js/core + tsx

# one short local campaign (persists new coverage into corpus/<target>/)
npm run fuzz:spaces-xml -- -- -runs=20000
npm run fuzz:announce-hmac -- -- -max_total_time=15

# load + briefly campaign EVERY target and print a PASS/FAIL table (CI preflight)
npm run smoke                  # SMOKE_RUNS=<n> to change the per-target budget
```

Anything after the **second** `--` is passed straight to libFuzzer (e.g. `-runs=N`,
`-max_total_time=SECONDS`, `-max_len=N`, `-jobs=N`). The first `--` ends the npm-script args; the
`scripts/run.mjs` launcher forwards the rest. The launcher registers `tsx` as the ESM loader so the
harness can `import` the real `.ts` production parsers on both Windows dev and the Linux farm.

Running a target directly (no npm):

```sh
node scripts/run.mjs release-feed.target.mjs corpus/release-feed -- -max_total_time=900
```

## Persistent corpus

`corpus/<target>/` is a **committed, persistent** seed + coverage corpus. Jazzer/libFuzzer reads it on
start and writes every newly-interesting input back into it, so coverage **accumulates across runs and
across the farm**. Do not delete it — it is the fuzzer's accumulated knowledge. Seed inputs
(hand-written valid/invalid/boundary examples) live alongside the machine-found ones.

## Continuous fuzzing on the farm

The fuzz droplet runs each target on a long budget against the shared corpus, then commits any corpus
growth back (coverage compounds over time). A minimal per-target loop:

```sh
cd pyrax-web/fuzz && npm ci
for t in spaces-xml announce-hmac announce-body otp-code release-feed; do
  node scripts/run.mjs "$t.target.mjs" "corpus/$t" -- \
    -max_total_time=3600 -print_final_stats=1 -artifact_prefix="findings/$t/" \
  || echo "FUZZ FINDING in $t — see findings/$t/ (crash-* reproducer). DO NOT ignore."
done
```

- `-max_total_time=3600` fuzzes each target for an hour per cycle; raise it or use `-jobs`/`-workers`
  for parallel libFuzzer instances.
- On a finding, libFuzzer writes a `crash-<sha1>` reproducer (redirected here to `findings/<target>/`).
  Reproduce deterministically with:
  `node scripts/run.mjs <target>.target.mjs corpus/<target> -- findings/<target>/crash-<sha1>`.
- A finding means a **real** contract violation (a crash on valid-ish input, or an accepted bad
  signature / malformed code). Triage the reproducer and fix the production parser — never relax the
  harness assertion to make it pass.

## Notes on production changes

To fuzz the real parsers without duplicating logic, a few functions were made importable (behavior
unchanged — pure extraction / added `export`, wired back into the original call sites):

- **`s3presign.ts`** — extracted the ListObjectsV2 XML loop into an exported pure `parseListObjectsV2`.
- **`spaces.ts`** (nodes + team) — extracted the XML loop into an exported pure `parseListKeysPage`.
- **`announce.ts`** — moved the already-exported pure `validateAnnounce` into a new side-effect-free
  `announce-validate.ts` (the route re-exports + calls it) so it imports without the route's background
  timers.
- **`otp-code.ts`** (new, devnet + team) — extracted `verifyLoginCode`'s code normalization + length
  gate into exported pure `normalizeOtpCode` / `isWellFormedOtp` / `OTP_LEN`; `auth.ts` now uses them.
- **`releases-feed.ts`** — exported `infernoPlatform` / `cliPlatform` / `versionFromName`; extracted
  the untrusted-manifest version read into an exported pure `versionFromManifest`.
- **`feeds.ts`** (nodes + team) — exported `base` / `versionFromFilename` / `matchDesktop`; extracted
  the untrusted-manifest → download selection into an exported pure `selectCliDownloads`.
