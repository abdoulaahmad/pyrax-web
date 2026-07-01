<!-- SPDX-License-Identifier: LicenseRef-Proprietary -->

# PYRAX Product Tests — Cross-Surface Contract (v1)

**This document is the single source of truth for the Product Tests feature.** Three surfaces
integrate against it, and they must not drift:

1. **devnet-portal** (`pyrax-web/pyrax-devnet-portal`) — owns the `devnet_tester` schema, the tester
   submit + catalog UI, and the internal observer endpoints. **Phase 1 (this doc) is built here.**
2. **team-website** — implements the staff **review UI** (assign / review / comment) against the team
   review API defined below, gated by a **new team permission `devnet.tests`**.
3. **nova / Sentinel** — the AI observer that screens submissions, writes a `sentinel_assessment`, and
   (within guardrails) drives auto-award + the weekly consistency award.

Phase 1 delivered: the DB schema, the reward economics, the seeded test suite, and this contract.
The submit/list/detail/observer **endpoints are specified here and implemented in later devnet-portal
phases**; team-website + nova build to these shapes. Any change to a field, endpoint, status, or reward
parameter is a change to THIS file first.

Conventions: all timestamps are **ms since epoch** (BIGINT). All PYRX amounts are **whole-PYRX
integers** (BIGINT). Price is fixed at **$0.0025 / PYRX**. JSON bodies; responses are
`{ ok: boolean, ... }` with `no-store`.

---

## 1. Data model (devnet_tester, Postgres)

The `campaigns` table is repurposed as **TESTS** and `reports` as **SUBMISSIONS**. All new columns are
added with guarded, additive `ALTER TABLE … ADD COLUMN IF NOT EXISTS` in `src/server/db.ts init()`, so
re-running is idempotent. Existing test/submission rows keep their ids across re-seeds.

### 1.1 `campaigns` = **TESTS**

| Column | Type | Meaning |
|---|---|---|
| `id` | TEXT PK | Stable test id (`test_…`). Submissions reference this; survives re-seeds. |
| `slug` | TEXT UNIQUE (partial, non-null) | Stable human id (e.g. `inferno-staking`). Used by prereqs + the boot seed's upsert key. |
| `track` | TEXT | `'cli'` \| `'inferno'`. Default `'inferno'`. |
| `title` | TEXT | Test title. |
| `body` | TEXT | One-paragraph "what this covers / why it matters". |
| `steps` | JSONB | Ordered array of `Step` (see 1.3). |
| `prereq_slugs` | JSONB | Array of test **slugs** that must be ACCEPTED (by this tester) before the test unlocks. |
| `order_idx` | INT | Progression + display order within the track. |
| `est_minutes` | INT | Rough time to complete. |
| `weight_pyrx` | BIGINT | The per-test reward (install ~1000 … validating ~5000). |
| `app_version` | TEXT | Build the steps were authored against (informational). |
| `status` | TEXT | `'open'` (accepting submissions) \| `'closed'`. |
| `opens_at` / `closes_at` | BIGINT null | Optional window. `closes_at` unset ⇒ always "on time". |
| `created_by` | TEXT | `'seed'` for pre-authored tests, else the staff id. |
| `created_at` | BIGINT | ms. |

Indexes: `idx_campaigns_slug` (unique, non-null), `idx_campaigns_track_order (track, order_idx)`.

### 1.2 `reports` = **SUBMISSIONS**

| Column | Type | Meaning |
|---|---|---|
| `id` | TEXT PK | Submission id (`sub_…`). |
| `campaign_id` | TEXT | The test id this submission is for. |
| `tester_id` | TEXT | The submitting tester (`testers.id`). |
| `results` | JSONB | Array of `{ stepIndex, pass:boolean, note? }` mirroring the test's steps. |
| `attachments` | JSONB | Array of `{ url, type, stepIndex?, name?, size?, contentHash? }` — proof uploads. `contentHash` is a client-computed **SHA-256 hex** of the file bytes (anti-fraud dedup — see §7.1); it is advisory metadata, never an access-control input (the url-prefix check is). |
| `notes` | TEXT | Free-text tester notes (≤4000). |
| `logs` | TEXT null | The big paste-your-errors field (≤**16000** chars). |
| `review_status` | TEXT | State machine (see 3). Default `'submitted'`. |
| `reviewer_verdict` | TEXT null | `'accept'` \| `'reject'` \| `'needs_more'` (last human/auto verdict). |
| `reviewer_notes` | TEXT null | Reviewer's rationale (≤8000). |
| `sentinel_assessment` | JSONB null | Sentinel's machine assessment (see 4). |
| `assigned_to` / `assigned_by` | TEXT null | Reviewer id / who assigned. |
| `assigned_at` | BIGINT null | ms. |
| `awarded_pyrx` | BIGINT | PYRX paid on acceptance (0 until accepted). |
| `accepted` | BOOLEAN null | Legacy flag; set TRUE on accept, mirrors `review_status='accepted'`. |
| `accepted_at` | BIGINT null | ms of acceptance. |
| `created_at` / `updated_at` | BIGINT | ms. |

Indexes: `(review_status, created_at)`, `(assigned_to)`, `(tester_id, created_at)`, `(campaign_id)`.

### 1.3 `Step` shape (in `campaigns.steps`)

```ts
interface Step {
  title: string;
  instruction: string;                       // clear, numbered actions
  proof: 'photo' | 'video' | 'either' | 'none';
  logsPrompt?: string;                        // if set, ask the tester to paste relevant logs
}
```

### 1.4 `report_comments` — submission review thread (mirrors `bug_comments`)

| Column | Type | Meaning |
|---|---|---|
| `id` | TEXT PK | Comment id (`rc_…`). |
| `report_id` | TEXT | The submission. |
| `author_id` / `author_name` / `author_user` | TEXT | Author identity. |
| `author_admin` | BOOLEAN | True for staff (renders differently). |
| `body` | TEXT | ≤4000. |
| `created_at` | BIGINT | ms. |

Index: `(report_id, created_at)`.

### 1.5 Earnings ledger (`earnings_ledger`)

`reason` is plain TEXT (no CHECK constraint) — two new reasons are used:

- **`test`** — an accepted product-test submission. Idempotent ref **`test:{submissionId}`**.
- **`consistency`** — the sustained-participation bonus. Idempotent ref **`consistency:{isoWeek}`**
  (e.g. `consistency:2026-W27`).

The idempotent `ref` is the single guarantee against double-pay; a re-accept or replayed observer call
can never pay twice.

---

## 2. Reward + consistency economics (`src/lib/rewards.ts`)

Fixed price **$0.0025 / PYRX**. Only **reward-eligible** testers (non-`@pyraxchain.com`) accrue; staff
test but never earn.

### 2.1 Per-test reward

```
perTestReward(test, onTime) = test.weight_pyrx + (onTime ? ON_TIME_TEST_BONUS_PYRX : 0)
ON_TIME_TEST_BONUS_PYRX = 800
```

`onTime` = the submission was created at/before the test's `closes_at` (unset ⇒ always on time). This is
the **only** per-test payout. Staff may override the computed amount with `awardPyrx` at review time.

### 2.2 Consistency bonus

```
CONSISTENCY = {
  minAcceptedTestsPerWeek: 3,
  minAcceptedIssueReportsPerWeek: 2,
  sustainedWeeks: 3,
  bonusPyrx: 12000,
  accuracyFloor: 0.6,
}
```

A tester **qualifies for a week** when **EITHER** cadence bar is met (≥3 accepted tests **OR** ≥2
accepted issue reports that ISO week) **AND** rolling accept-rate ≥ `accuracyFloor` (0.6). Sustaining
that for `sustainedWeeks` (3) consecutive weeks pays `bonusPyrx` (12000), **scaled by accuracy** within
`[accuracyFloor, 1]` → payout in `[0.6·12000, 12000]`. Helper: `consistencyBonus(stats)`. Idempotent
per ISO week (ref above).

`stats` is `testerTestStats(testerId)` → `{ acceptedThisWeek, acceptedIssueReportsThisWeek,
rollingAcceptRate, weeklyStreak }`. `rollingAcceptRate` = accepted/decided over the last 20 decided
submissions (1.0 if none decided yet, so new testers aren't penalized pre-review).

---

## 3. `review_status` state machine

```
submitted ──(Sentinel assesses)──► ai_screening ──► in_review ──► accepted   (terminal, pays once)
    │                                    │              │      └─► rejected   (terminal, no pay)
    │                                    │              └────────► needs_more ──► (tester resubmits → new submission)
    └──(staff assigns)──────────────────┴──► in_review
```

- **`submitted`** — tester just submitted; nothing has looked at it.
- **`ai_screening`** — Sentinel attached an assessment (set by `setSentinelAssessment` / the observer
  `assess` endpoint) but no terminal decision.
- **`in_review`** — a human picked it up (assignment moves `submitted`/`ai_screening` → `in_review`).
- **`needs_more`** — reviewer asked for more proof; the tester addresses it via a NEW submission (the
  old one stays `needs_more` for the audit trail).
- **`accepted`** — terminal. Pays `perTestReward` (or the staff override) exactly once via ledger ref
  `test:{submissionId}`; sets `accepted=true`, `accepted_at`, `awarded_pyrx`.
- **`rejected`** — terminal, no payment. Not clawed back if a prior accept existed (the ledger ref makes
  re-accept safe either way).

Verdicts map: `accept → accepted`, `reject → rejected`, `needs_more → needs_more`.

---

## 4. Sentinel assessment JSONB shape

Stored in `reports.sentinel_assessment`; written server-to-server. Sentinel MUST emit exactly:

```ts
interface SentinelAssessment {
  verdict: 'accept' | 'reject' | 'escalate';   // 'escalate' ⇒ always human review
  confidence: number;                           // 0..1
  perStep: Array<{ stepIndex: number; ok: boolean; flag?: string }>;
  chainChecks?: Array<{ name: string; ok: boolean; detail?: string }>; // e.g. tx-hash exists, height, validator active
  reason: string;                               // short human-readable rationale
  model: string;                                // model id/version that produced this
  at: number;                                   // ms
}
```

`chainChecks` is where Sentinel cross-references the tester's claims against the chain + the portal's
`nodes`/`node_heartbeats` (e.g. "validator active at claimed height", "stake tx exists"). A missing or
failing chain check should lower `confidence` and/or set `verdict:'escalate'`.

---

## 5. Tester-facing API (devnet-portal implements)

All require a tester session; catalog/detail require `campaigns.view`, submit requires
`campaigns.view` too (tester baseline). Attachments are validated against the tester's own presigned
CDN prefix (`devnet/issues/{testerId}/…`, see `attachments.ts`) — the client `url`/`type` are never
trusted.

### `GET /api/tests`
List the tester's catalog. Returns each test with the tester's per-test status + unlock computation
(backed by `listTestsForTester`).
```jsonc
{ "ok": true, "tests": [ {
  "id","slug","track","title","body","steps","prereqSlugs","orderIdx","estMinutes","weightPyrx",
  "appVersion","status","myStatus","mySubmissionId","locked","missingPrereqs"
} ] }
```
`myStatus` ∈ `not_started` | `submitted` | `ai_screening` | `in_review` | `needs_more` | `accepted` |
`rejected`. `locked` = a prereq slug lacks an accepted submission by this tester.

### `GET /api/tests/:id`
One test + this tester's submission history for it (from `getTest` + `listSubmissions({tester,…})`).

### `POST /api/tests/:id/submit`
Body:
```jsonc
{
  "results":     [ { "stepIndex": 0, "pass": true, "note": "..." } ],
  "attachments": [ { "url": "https://…cdn…/devnet/issues/{tester}/…", "type": "image|video|log", "stepIndex": 0 } ],
  "logs":        "optional ≤16000-char paste"
}
```
Server: enforces `canTesterSubmit` (test open + all prereqs accepted), sanitizes attachments, caps
`logs` at 16000, creates the submission at `review_status:'submitted'`. Rate-limited per tester.
Returns `{ ok:true, submissionId }` (201) or `{ ok:false, reason:'prereq'|'closed'|'not_found', missingPrereqs }`.

### `GET /api/tests/submissions` (tester's own)
The signed-in tester's submissions (`listSubmissions({ tester: me.id })`), for their dashboard history.

---

## 6. Team-side review API (team-website implements)

**Gate: a NEW team permission `devnet.tests`** (add to the team-website permissions registry, in the
"Devnet" group, `elevated: true`). Grant to devnet reviewers/admins. These call the same
`devnet_tester` DB via the devnet-portal DB layer (or the portal proxies them — implementation choice,
but the shapes below are fixed).

### `GET /api/devnet/tests`
The review queue. Query filters: `status`, `assignee`, `track`, `tester`, `limit`. Backed by
`listSubmissions(filter)`. Returns submissions with joined test + tester fields (see `Submission` in
`db.ts`): `id, testId, testSlug, testTitle, track, weightPyrx, testerId, testerName, testerHandle,
results, attachments, notes, logs, reviewStatus, reviewerVerdict, reviewerNotes, sentinelAssessment,
assignedTo, assignedBy, assignedAt, awardedPyrx, acceptedAt, createdAt, updatedAt`.

### `GET /api/devnet/tests/:id`
One submission (`getSubmission`) + its `report_comments` thread (`listReportComments`).

### `POST /api/devnet/tests/:id/assign`
Body `{ "assigneeId": "t_…" }` → `assignSubmission`. Moves `submitted`/`ai_screening` → `in_review`.

### `PUT /api/devnet/tests/:id/review`
Body `{ "verdict": "accept"|"reject"|"needs_more", "notes"?: string, "awardPyrx"?: number }` →
`reviewTestSubmission`. On `accept`, pays `perTestReward` (or the **bounded** `awardPyrx` override — see
§8.4) once via ledger ref `test:{id}`. The transition is an atomic state-machine claim (409
`already_decided` if terminal) and the reviewer cannot accept their own tester account (403
`self_review`). Returns `{ ok:true, submission, awarded }`.

### `POST /api/devnet/tests/:id/comment`
Body `{ "body": "≤4000" }` → `addReportComment` (author = the staff member, `author_admin:true`).

### `GET /api/devnet/rewards` — airdrop accounting (gate: **new permission `devnet.rewards`**)
Every non-staff tester's lifetime accrued PYRX (paid at the mainnet airdrop), split by ledger reason
(`test`/`bug`/`consistency`/`uptime`/`founding`/`other`) with their payout wallet, plus grand totals (the
airdrop liability) at the fixed **$0.0025/PYRX** reference. `?format=csv` streams the same data as a CSV
download. Read-only (`testerRewardAccounting` / `rewardAccountingCsv`). Because it exposes payout wallets
+ financial totals, it is gated on `devnet.rewards` (elevated), separate from `devnet.tests`.

---

## 7. Internal / observer API (Sentinel → devnet-portal, server-to-server)

**Auth: bearer `NOVA_AGENT_SECRET`** (the same server-operated secret pattern as `sentinel.ts` uses to
push telemetry, but INBOUND here). Constant-time compare; fail-closed (401 if unset/mismatch). These are
NOT tester/session gated and are never exposed to the browser. (Implemented in
`src/server/internal-auth.ts`; the `/api/internal/*` prefix is CSRF-exempt in `middleware.ts` because it
is cookie-free, bearer-authenticated, server-to-server.)

**Trigger model: nova POLLS the portal for new work.** The portal does not push to nova; nova pulls the
pending queue, assesses each item, and pushes the assessment back via `assess`.

### `GET /api/internal/tests/pending?limit=`
The observer work queue. Returns each `submitted` submission that has **no `sentinel_assessment` yet**,
oldest-first, each enriched with the full CONTEXT nova needs for its chain cross-checks so it never has
to call back for more. `limit` defaults to 25 (clamped 1..100). Returns `{ ok:true, pending:[…] }` where
each entry is:

```jsonc
{
  "submissionId": "sub_…",
  "testSlug": "inferno-staking",
  "testTitle": "Stake to become a validator",
  "track": "inferno",
  "steps":   [ { "title","instruction","proof","logsPrompt?" } ],   // the test's authored steps
  "results": [ { "stepIndex": 0, "pass": true, "note?": "…" } ],     // the tester's per-step claims
  "logs":    "…tester's pasted logs, ≤16000… | null",
  "attachments": [ { "url","type","stepIndex?","name?","size?","contentHash?" } ],
  "tester": {
    "id": "t_…", "handle": "…", "displayName": "…",
    "payoutWallet": "0x… | null", "rewardEligible": true,
    "decidedCount": 7,           // total decided submissions ever  → §8(1) new-tester grace input
    "autoAwardsThisWeek": 2      // auto-awards already granted this ISO week → §8(2) weekly-cap input
  },
  "nodes": [ { "nodePk","height","lastHeartbeat","app","appVersion","online" } ], // for height/validator cross-checks
  "dupProof": [ { "hash":"<sha256>", "otherCount": 2, "otherSubmissions": ["sub_…","sub_…"] } ],
  "createdAt": 0
}
```

**§7.1 Anti-fraud dup-proof.** `dupProof` lists any of *this* submission's attachment `contentHash`es
that also appear on **other** submissions (with the count + a small sample of those submission ids).
It's an anti-farming signal — reused photo/video across submissions — computed by
`duplicateProofHashes(submissionId)`. It is **advisory**: Sentinel should lower `confidence` and/or
`escalate` on a hit, and human reviewers see the same flag, but the portal never auto-rejects on it
alone. An empty array ⇒ all of this submission's proof is unique.

### `POST /api/internal/tests/:id/assess`
Body = the `SentinelAssessment` (see 4). Server: validates the shape, stores it via
`setSentinelAssessment` (moves `submitted` → `ai_screening`), and — **only within the guardrails in
§8** — MAY auto-drive `reviewSubmission({ verdict, auto:true })`. Returns `{ ok:true, submission }`.

### `POST /api/internal/consistency/run`
Body `{ "testerId"?: "t_…" }` (omit ⇒ sweep all active eligible testers). Awards the weekly consistency
bonus via `awardConsistencyForWeek` (idempotent per ISO week). Returns `{ ok:true, awards:[{testerId,
pyrx}] }`. Intended to be called on a weekly cron by nova.

---

## 8. Auto-award guardrails (non-negotiable)

Auto-acceptance is a convenience, never a bypass. The observer path MUST honor **all** of:

1. **New-tester grace** — a tester's first `AUTO_HUMAN_FIRST_N` (**= 3**) *decided* submissions are
   **always human-reviewed**; Sentinel may screen but never auto-accept them
   (`testerDecidedSubmissionCount` < N ⇒ force human). This is the anti-farming floor.
2. **Weekly auto-award cap** — at most `AUTO_WEEKLY_CAP` (**= 5**) auto-awards per tester per ISO week
   (`testerAutoAwardsThisWeek` ≥ cap ⇒ force human). Excess submissions still queue for a person.
3. **Confidence + verdict gate** — auto-accept only when `sentinel_assessment.verdict === 'accept'`
   **and** `confidence ≥ AUTO_CONFIDENCE` (**= 0.85**) **and** no `perStep.ok === false` and no failing
   `chainChecks`. `verdict:'escalate'` (or any `reject` where the tester disputes) ⇒ human.
4. **Only the test's weight** — auto-award pays exactly `perTestReward(test, onTime)`; the observer never
   sets `awardPyrx`. The `awardPyrx` override is a **staff-only** field and is itself **bounded**
   (`boundedAward`): an override may exceed the computed reward but never above `MAX_OVERRIDE_FACTOR`
   (**= 4**) × the test weight, and never above `MAX_MANUAL_AWARD_PYRX` (**= 50,000**). A larger award is
   a tokenomics decision (contract change), not a single review click — no reviewer can mint unbounded PYRX.
5. **Reversible + audited** — every award is a ledger row with an idempotent ref and a notification;
   the review row records `reviewer_verdict='accept'`, `auto` provenance in `reviewer_notes`, and
   `awarded_pyrx`. A wrongful accept is corrected with an `adjustment` ledger entry (never a silent
   delete). Idempotency is a **DB invariant** — a partial `UNIQUE(ref)` index on `earnings_ledger` plus
   `INSERT … ON CONFLICT (ref) DO NOTHING` makes exactly-once a database guarantee, not a racy
   check-then-insert. The auto-award critical section additionally runs under a **per-tester advisory
   lock** so concurrent assessments can't collectively exceed the weekly cap.
6. **Kill-switch** — a single env/setting (`TESTS_AUTO_AWARD_ENABLED`, default **off** until the review
   UI + Sentinel are proven) disables ALL auto-award; the observer still stores assessments and queues
   everything for humans. Consistency awards are separately gated by `TESTS_CONSISTENCY_ENABLED`.
7. **Objective on-chain proof (`AUTO_AWARD.requireChainProof`, default on)** — auto-award requires at
   least one **passing** chain check in the assessment (an on-chain fact the observer derived from RPC).
   A prompt-injected / steered model can inflate `confidence` and mark every `perStep.ok`, but it cannot
   forge a chain check. Consequently a test with **no verifiable on-chain outcome** (install / UI /
   onboarding) is **always** human-reviewed. NOVA mirrors this producer-side (its `buildAssessment`
   downgrades any model `accept` with no passing chain check to `escalate`), and the untrusted tester
   text it feeds the model is fenced as inert data — but the portal's server-side check here is the
   sole non-bypassable backstop.

**Human-review path.** The team-portal review (`devnet.tests`) is trusted (no §8 gates), but is still
guarded: the review is an **atomic state-machine claim** (only a non-terminal submission may be decided,
one winner) so a rejected row can't be resurrected into a pay and a terminal decision can't be
overwritten; a reviewer **cannot accept a submission from their own tester account** (self-dealing block,
email match); and the `awardPyrx` override obeys the same `boundedAward` ceiling as above.

Guardrail constants live next to the economics and are surfaced to §7's handlers. Values above are the
Phase-1 defaults; tuning them is a change to this file.

---

## 9. Seeded test suite (authored on boot, idempotent by slug)

Two tracks, install → … → validating, prereq-chained. Weights: install ~1000, wallet/mining ~2500,
staking ~4000, validating ~5000. Full content in `src/server/tests-seed.ts`.

**Inferno track** (11): `inferno-install` → `inferno-onboard` → `inferno-wallet` → `inferno-sync` →
`inferno-peers` → `inferno-mining` → `inferno-staking` → `inferno-validating`; plus `inferno-stream`,
`inferno-neurax`, `inferno-logs` (prereq: `inferno-sync`).

**CLI track** (11): `cli-install` → `cli-init-config` → `cli-keys-wallet` → `cli-node-run` → `cli-mine`
→ `cli-stake-pool` → `cli-validator`; plus `cli-peers`, `cli-stream`, `cli-neurax-relay`, `cli-doctor`
(prereq: `cli-node-run`).

Staking steps reference the real flow (**260,000 PYRX solo bond** OR **join a pool from 10,000 PYRX**);
validating requires the active 260,000 bond.

---

## 10. Change control

Any surface changing a field name, endpoint path/body, status value, verdict, reward parameter, or
guardrail updates **this file in the same PR**. The devnet-portal `db.ts` types (`ProductTest`,
`Submission`, `ReviewStatus`, `ReviewVerdict`) and `rewards.ts` constants are the machine-checkable
mirror of §1–§2; keep them in sync.

---

## 11. Deferred hardening follow-ups

- **Producer/seal proof beyond liveness.** NOVA's `height` chain check currently verifies a node is
  *caught up to the live tip* (within 50 blocks) — proof of live participation, not of block authorship.
  A stricter producer/seal proof (the node actually *authored* a block during the test window) needs a
  height-at-submission baseline recorded by the portal so a real delta can be measured. Until then, such
  tests still reach a human via the §8.7 objective-proof gate (a liveness check alone is not treated as
  producer proof for auto-award). Tracked here so it isn't lost.
