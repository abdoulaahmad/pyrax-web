<!-- SPDX-License-Identifier: LicenseRef-Proprietary -->

# PYRAX Web — Continuous Red-Team (Adversarial Attack Simulation) Suite

A **continuous red-team** suite for the three Astro SSR portals. Where the Jazzer fuzz farm
(`pyrax-web/fuzz/`) throws *random* input at parsers, this suite codifies **known attack scenarios** and
asserts each one is **BLOCKED**. Every test is an attack an adversary would actually attempt; a **passing
suite means every attack was defeated**. A **failing test is a real vulnerability** — it must be fixed, not
weakened.

The suites exercise the **real** handlers and security functions (RBAC, auth/session, device-token grant,
CSRF, OTP, SigV4 presign, HMAC ingest, SSRF guards, injection). Only the **DB / network boundary** is
mocked — never the security logic. Fakes reproduce the security-relevant DB contract exactly (e.g. the
atomic single-consume `UPDATE ... WHERE used_at IS NULL AND expires_at > now`), so the defense under test
is the production code path.

## Layout

Each portal owns a `redteam/` directory next to its `test/` / `tests/` dir, with its own vitest config so
the farm can loop it independently:

```
pyrax-team-website/redteam/    *.attack.ts + vitest.redteam.config.ts   (41 attacks)
pyrax-devnet-portal/redteam/   *.attack.ts + vitest.redteam.config.ts   (25 attacks)
pyrax-nodes/redteam/           *.attack.ts + vitest.redteam.config.ts   (27 attacks)
pyrax-web/redteam/             this README + run-all.mjs (cross-portal orchestrator)
```

Attack files are named `*.attack.ts` (distinct from the `*.test.ts` invariant tests) so the red-team config
`include: ["redteam/**/*.attack.ts"]` never overlaps the normal `npm test`.

## Running

Per portal:

```bash
npm run redteam         # one-shot: all attacks must be BLOCKED (exit 0) — a fail = a vuln (exit 1)
npm run redteam:watch   # watch mode for the fuzz farm's continuous loop
```

All three at once, from `pyrax-web/`:

```bash
node redteam/run-all.mjs         # runs every portal's `npm run redteam`, aggregates, non-zero on any fail
node redteam/run-all.mjs --loop  # runs forever with a short delay between rounds (24/7 farm mode)
```

## How the fuzz farm loops this 24/7

The farm runs the red-team suite continuously alongside the random Jazzer targets:

1. **Continuous loop** — `node redteam/run-all.mjs --loop` (or a per-portal `npm run redteam:watch`) keeps
   the suite running around the clock. Each round re-imports the real modules and replays every attack.
2. **Deterministic + hermetic** — no live Postgres, Spaces, or network is required; every boundary is
   mocked and every attack is self-contained, so a round is fast (~1–5s/portal) and never flakes on
   infra. This is what makes 24/7 looping viable.
3. **Fail = page** — a non-zero exit means an attack SUCCEEDED (a regression re-opened a hole). The farm
   treats that as a red alert: the failing attack name pinpoints the exact defense that broke.
4. **Complements fuzzing** — Jazzer finds *unknown* crashers in the parsers; this suite guards the *known*
   invariants (a defender's regression net) so a refactor can never silently drop an auth/RBAC/CSRF check.
5. **Regression capture** — when fuzzing (or an audit) finds a NEW attack, codify it here as a new
   `it(...)` that asserts the fix holds, and the farm guards it forever after.

## Attack catalogue

Each row is one scenario → the defense it probes → the expected result (all currently **BLOCKED**).

### Team portal (`pyrax-team-website/redteam/`)

| ID | Attack | Defense probed | Result |
|----|--------|----------------|--------|
| A1 | Unentitled user tries to receive Ember from `/api/downloads` | server-side `can(subject,"downloads.ember")` gate; Ember presign never minted | BLOCKED |
| A2 | User with no download role hits the download center | `downloads.view` base gate (403) | BLOCKED |
| A3 | User without `users.assign_permissions` grants anything | `canGrant()` requires the assign perm | BLOCKED |
| A4 | Admin grants a perm they don't hold / a superuser-only one | `canGrant()` scope + superuser-only guard | BLOCKED |
| A5 | Hostile/unknown/`__proto__` keys injected into a grant | `sanitizePermissions()` allow-list | BLOCKED |
| A6 | Non-superuser grants the node kill-switch while "holding" it | `isSuperuserOnly` hard gate in `canGrant()` | BLOCKED |
| A7 | `/api/users/:id` grant filter exceeds the grantor's scope | grantable-set intersection preserves out-of-scope perms | BLOCKED |
| B1–B6 | Forged / tampered / replayed / expired / cross-account device tokens; HMAC-only storage; live-RBAC tabs | real `ember.ts` device grant | BLOCKED |
| B7 | Un-issued / flipped / destroyed session id resolves to a user | real `auth.ts` `sessionUser`/`destroySession` | BLOCKED |
| C1–C4 | Cross-origin / no-Origin / `null`-Origin / forged-Referer POST | `checkCsrf()` same-origin gate | BLOCKED |
| C5 | Path-confusion (`/api/ember-evil`) evades the CSRF check | exemption is scoped to exactly `/api/ember/*` | BLOCKED |
| C6 | CSRF against the exempt bearer/OTP Ember route | route is cookie-free (bearer token) — nothing to forge | BLOCKED |
| D1 | OTP verify brute-force | 8-try/10-min attempt cap (rate before compare) | BLOCKED |
| D2 | OTP request flooding / email-bomb | 5-code/15-min request cap | BLOCKED |
| D3 | User enumeration via OTP request / `otpStatus` | anti-enumeration: same response for unknown emails | BLOCKED |
| D4 | Unicode / whitespace / punctuation code smuggling | `normalizeOtpCode` + strict length gate | BLOCKED |
| D5 | Reuse of a consumed OTP | atomic single-consume | BLOCKED |
| D6 | Guessed-but-never-issued code | HMAC lookup miss | BLOCKED |
| E1 | Presign steered off-bucket via hostile key | SigV4 host-pinning to the bucket vhost | BLOCKED |
| E2 | Traversal key escapes the bucket / widens scope | key path-encoding + per-key signature | BLOCKED |
| E3 | Presigned URL widened (longer expiry) | expiry is in the signed canonical query | BLOCKED |
| E4 | Hostile ListObjectsV2 XML | total parser (never throws), inert keys | BLOCKED |
| E5 | Stored-XSS via a crafted installer filename | filename treated as opaque data; version = digit-run | BLOCKED |
| E6 | Manifest points at a file not in the listing | `selectCliDownloads` present-in-feed check | BLOCKED |

### Devnet tester portal (`pyrax-devnet-portal/redteam/`)

| ID | Attack | Defense probed | Result |
|----|--------|----------------|--------|
| F1 | Baseline tester reaches staff/admin capabilities | `can()` — baseline set only | BLOCKED |
| F2 | Non-superuser grants `rewards.admin` | superuser-only gate in `canGrant()` | BLOCKED |
| F3 | Forged / tampered / never-issued device token | real `app-device.ts` HMAC lookup | BLOCKED |
| F4 | Token replay after revoke | `revoked = TRUE` re-checked each call | BLOCKED |
| **F5** | **SUSPENDED tester ⇒ `device/status` 401 (immediate lockout)** | `deviceUser` re-checks `status === "suspended"` live | BLOCKED |
| F6 | Cross-account token lift | token binds one tester id | BLOCKED |
| F7 | Hostile permission-key injection | `sanitizePermissions()` allow-list | BLOCKED |
| G1–G3 | CSRF: cross-origin POST; scoped `/api/app/*`, `/api/node/pair`, `/api/node/heartbeat` exemptions | `checkCsrf()` + `csrfExempt()` scoping | BLOCKED |
| G4–G6 | OTP brute-force / flood / reuse | attempt + request caps, atomic consume | BLOCKED |
| G7 | Unicode/whitespace OTP smuggling | `normalizeOtpCode` + length gate | BLOCKED |
| **G8** | **Suspended tester issued a login code** | `requestLoginCode` is a silent no-op for suspended | BLOCKED |
| H1 | Presign steered off-bucket | SigV4 host-pinning (`presignPut`/`presignGet`) | BLOCKED |
| H2 | Upload-key injection / traversal escapes the tester's prefix | filename sanitized (no separator) + `devnet/issues/<id>/` namespace | BLOCKED |
| H3 | Upload presign without `issues.submit` / signed-out | RBAC gate (403/401) | BLOCKED |
| H4 | Oversized / unsupported-type upload | size + kind limits (422) | BLOCKED |
| H5 | Hostile bucket-listing XML | total parser; keys are inert data (render-escaped) | BLOCKED |
| H6 | Node heartbeat with missing / garbage bearer | token lookup (401) | BLOCKED |

### Public nodes hub (`pyrax-nodes/redteam/`)

| ID | Attack | Defense probed | Result |
|----|--------|----------------|--------|
| I1 | Forged announce signature (wrong secret) | `verifyHmac` keyed-HMAC compare | BLOCKED |
| I2 | Body swapped after signing | `sha256(body)` in the canonical string | BLOCKED |
| I3/I4 | Expired / future timestamp (replay of an old capture) | ±90s window | BLOCKED |
| **I5** | **Signature replay (same sig twice)** | one-time-use `seen` cache | BLOCKED |
| I6 | Malformed / missing Authorization header | strict `PYRAX-HMAC` parse | BLOCKED |
| I7 | Cross-route signature reuse | method + path in the canonical string | BLOCKED |
| I8 | Disabled network / bad port / malformed peerId | `validateAnnounce` enum + range + charset | BLOCKED |
| I9 | Over-count `peers[]` / oversized `relayPubkey` (DoS) | 64-cap + 128-char clamp | BLOCKED |
| I10 | Oversized announce body (amplification) | 4096-byte route cap (413) before parse | BLOCKED |
| J1/J2 | SSRF: geo lookup pointed at cloud-metadata / private / IPv4-mapped-IPv6 | `isPublicIp` allow-list + normalization | BLOCKED |
| J3 | IP-spoof: poison the map via body.ip / XFF | `resolveClientIp` default-deny (socket wins) | BLOCKED |
| J4 | Presign steered off-bucket | SigV4 host-pinning | BLOCKED |
| J5 | Admin broadcast without the shared secret | constant-time bearer check (fail-closed) | BLOCKED |
| J6 | Cross-origin read of the peer directory | `sameOrigin()` gate | BLOCKED |
| K1 | Stored-XSS via announce fields on the map/peers page | strict field validation (never stored) | BLOCKED |
| K2 | Injected peerId reaches the multiaddr | multiaddr built from validated IP+port+peerId only | BLOCKED |
| K3 | SQL injection via push-broadcast `kind` | column chosen from a fixed literal set | BLOCKED |
| K4 | Notify email-bomb / bad-email shape | per-IP token-bucket + email-shape validation | BLOCKED |

## Real vulnerabilities discovered

**None.** All 93 codified attacks are currently BLOCKED — every defense held. During construction, three
test *expectations* were corrected to match the code's actual (correct) behavior, and these nuances are
documented inline so the farm keeps testing the true invariant:

- **Presign traversal keys** (`E2`): `..` segments in an S3 object key are *cosmetic* — a single flat
  bucket namespace has no filesystem to traverse. The real, tested guarantee is **host-pinning** (the URL
  can never leave the bucket vhost) plus per-key signatures (no cross-key reuse).
- **Upload-key sanitization** (`H2`): the sanitizer keeps literal `.` chars but strips every path
  separator and control char, and always namespaces under `devnet/issues/<tester.id>/`. The tested
  guarantee is **"no separator survives ⇒ cannot escape the tester's own prefix,"** not "no `.` chars."
- **Bucket-listing XML** (`H5`): the devnet `parseListObjectsV2` returns a markup-bearing bucket key
  *verbatim as inert data*; XSS is prevented at **render time** (React/Astro escaping + CSP), which is the
  correct layering. The test locks that the parser stays total + inert so render-time escaping remains the
  single, sufficient defense.

If any future run turns a row RED, that row is a live vulnerability: read the failing `it(...)` (it names
the exact defense), fix the code, and re-run — do **not** relax the assertion.
