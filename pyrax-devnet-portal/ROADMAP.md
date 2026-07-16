# Pyrax DevNet Portal V2 — Detailed Implementation Roadmap

## Current Codebase State
- **Auth System**: OTP-based login, session management with 7-day max
- **DB**: PostgreSQL with testers, sessions, nodes, pairing_codes, telemetry tables
- **Structure**: Astro-based, server-side modules in `/src/server/`, API endpoints in `/src/pages/api/`, components in `/src/components/`
- **Existing Functionality**: Whitelist (invites), login, OTP, node download, node pairing, support tickets
- **User Model** (TesterRow): email, display_name, handle, payout_wallet, reward_eligible, is_staff, permissions, is_superuser, status, session_max_days, founding_rank, created_at, joined_at, last_login

## Implementation Strategy
Incremental, layered approach - build foundation, then features, then UI, with testing validation at each phase.

---

# PHASE 1: Foundation & Data Models (Days 1-2)
**Goal**: Extend the data layer without breaking existing functionality

## Task 1.1: Database Schema Extensions
**Files**: `/src/server/db.ts`
**Changes**:
- Add `onboarding` table with columns:
  - `id` (PK), `tester_id` (FK), `status` (enum), `created_at`, `updated_at`
  - Status values: REGISTERED, PROFILE_COMPLETE, TRAINING, QUIZ, CERTIFIED, NODE_DOWNLOAD, NODE_PAIRED, TESTING, COMPLETED
  
- Extend `testers` table with columns:
  - `onboarding_status` (TEXT, default: 'REGISTERED')
  - `training_completed` (BOOLEAN, default: false)
  - `training_progress` (INT, default: 0) — 0-100%
  - `quiz_passed` (BOOLEAN, default: false)
  - `quiz_score` (INT, default: 0)
  - `quiz_attempts` (INT, default: 0)
  - `certification_id` (TEXT, unique)
  - `certification_issued_at` (BIGINT)
  - `node_downloaded` (BOOLEAN, default: false)
  - `node_paired` (BOOLEAN, default: false)
  - `current_mission` (INT, default: 1)
  - `current_testing_phase` (TEXT, default: null)

- Add `training_lessons` table:
  - `id` (PK), `title`, `content` (JSONB), `order` (INT), `required_for_cert` (BOOLEAN), `created_at`
  - Seed with 5 modules: DevNet Intro, Node Fundamentals, Mining Rules, Consensus Basics, Incident Reporting

- Add `quiz_questions` table:
  - `id` (PK), `question` (TEXT), `options` (JSONB array), `correct_answer` (INT), `explanation` (TEXT), `created_at`
  
- Add `quiz_attempts` table:
  - `id` (PK), `tester_id` (FK), `score` (INT), `answers` (JSONB), `passed` (BOOLEAN), `created_at`

- Add `missions` table:
  - `id` (PK), `mission_number` (INT, 1-8), `title`, `description`, `prerequisites` (JSONB), `completion_criteria` (JSONB), `unlock_conditions` (JSONB)

- Add `mission_progress` table:
  - `id` (PK), `tester_id` (FK), `mission_id` (FK), `status` (enum: not_started, in_progress, completed), `progress_data` (JSONB), `created_at`, `updated_at`

- Add `certifications` table:
  - `id` (PK), `tester_id` (FK), `cert_number` (unique), `issued_at`, `expires_at`, `status` (enum: active, revoked)

- Add `feature_flags` table:
  - `id` (PK), `flag_name` (unique), `global_enabled` (BOOLEAN), `created_at`, `updated_at`

- Add `feature_flag_users` table:
  - `id` (PK), `flag_id` (FK), `tester_id` (FK), `enabled` (BOOLEAN)

- Add `feature_flag_cohorts` table:
  - `id` (PK), `flag_id` (FK), `cohort_name`, `enabled` (BOOLEAN)

- Add `testing_phases` table:
  - `id` (PK), `phase_name`, `phase_order` (INT), `objectives` (JSONB), `start_date` (BIGINT), `end_date` (BIGINT)

**Validation**: Run db.ts and verify all tables are created; check for migration compatibility

---

## Task 1.2: TypeScript Type Definitions
**Files**: New `/src/types/onboarding.ts`
**Create types for**:
- `OnboardingStatus` (union of 9 states)
- `TrainingLesson` (id, title, content, order, completed)
- `QuizAttempt` (id, score, answers, passed, date)
- `Mission` (number, title, description, status, progress)
- `Certification` (id, certNumber, issuedAt, status)
- `FeatureFlag` (name, enabled for user/cohort/global)
- `TestingPhase` (name, order, objectives, dates)
- `UserOnboardingState` (combines all above + tester info)

**Validation**: TypeScript compilation passes

---

## Task 1.3: Constants & Enums
**Files**: New `/src/lib/onboarding.ts`
**Define**:
- ONBOARDING_STATES enum
- MISSIONS array (8 missions with details)
- QUIZ_PASSING_SCORE = 80
- TRAINING_MODULES array (5 modules)
- TESTING_PHASES array
- Validation functions (isValidState, isMissionUnlocked, etc.)

**Validation**: No compilation errors

---

# PHASE 2: State Management & Business Logic (Days 3-4)
**Goal**: Implement onboarding state machine and core business logic

## Task 2.1: Onboarding State Machine
**Files**: New `/src/server/onboarding.ts`
**Implement**:
- `getOnboardingState(tester_id)` → returns full UserOnboardingState
- `transitionState(tester_id, newState)` → validates transition rules
  - REGISTERED → PROFILE_COMPLETE (profile fields populated)
  - PROFILE_COMPLETE → TRAINING (explicit enrollment)
  - TRAINING → QUIZ (all lessons completed)
  - QUIZ → CERTIFIED (80%+ score)
  - CERTIFIED → NODE_DOWNLOAD (explicit request)
  - NODE_DOWNLOAD → NODE_PAIRED (pairing code used)
  - NODE_PAIRED → TESTING (node synced)
  - TESTING → COMPLETED (all missions done)
- `getCurrentMission(tester_id)` → returns Mission + progress
- `advanceMission(tester_id)` → moves to next mission if criteria met
- `canAccessFeature(tester_id, featureName)` → checks flags + state

**Validation**: Unit tests for state transitions; edge cases (downgrade attempts, skipped states)

---

## Task 2.2: Training Engine
**Files**: New `/src/server/training.ts`
**Implement**:
- `getLessons(tester_id)` → returns all lessons with completion status
- `startLesson(tester_id, lesson_id)` → marks lesson as in-progress
- `completeLesson(tester_id, lesson_id)` → validates completion, updates progress
- `getTrainingProgress(tester_id)` → % complete
- `isTrainingComplete(tester_id)` → boolean
- Seed 5 lessons on first run

**Validation**: Training flow can be started, progressed, and completed; progress tracking works

---

## Task 2.3: Certification Quiz Engine
**Files**: New `/src/server/certification.ts`
**Implement**:
- `getQuizQuestions(tester_id)` → randomized set of 10-15 questions
- `submitQuizAnswers(tester_id, answers)` → grade submission
  - Calculate score, compare to 80% threshold
  - Store attempt in quiz_attempts table
  - If passing: generate certification ID, update tester.certification_id, transition to CERTIFIED
  - If failing: allow retry (track attempts)
- `isQuizAvailable(tester_id)` → training_completed && !quiz_passed
- `getQuizHistory(tester_id)` → all past attempts
- Seed 30-40 questions on first run

**Validation**: Quiz questions load, answers grade correctly, passing updates tester state, retry flow works

---

## Task 2.4: Mission System
**Files**: New `/src/server/missions.ts`
**Implement**:
- `getMissions(tester_id)` → array of 8 missions with status/progress
- `getMissionStatus(tester_id, mission_id)` → detailed status
- `completeMission(tester_id, mission_id)` → validates criteria, marks complete, unlocks next
- `getCurrentMissionTarget(tester_id)` → the mission the user should focus on
- Mission prerequisites and unlock logic:
  - Mission 1 (Profile): none (auto-complete if profile filled)
  - Mission 2 (Training): Mission 1 complete
  - Mission 3 (Cert): Mission 2 complete + training done
  - Mission 4 (Download): Mission 3 complete + cert obtained
  - Mission 5 (Pair Node): Mission 4 complete + node downloaded
  - Mission 6 (Sync): Mission 5 complete + node paired
  - Mission 7 (Testing): Mission 6 complete + node synced
  - Mission 8 (Feedback): Mission 7 complete

**Validation**: Missions progress in order, prerequisites block access, completion logic works

---

## Task 2.5: Feature Flag System
**Files**: New `/src/server/feature-flags.ts`
**Implement**:
- `isFeatureEnabled(tester_id, flagName)` → boolean
  - Check: user override → cohort override → global setting (default: true)
- `getEnabledFeatures(tester_id)` → array of available features
- `setFeatureForUser(tester_id, flagName, enabled)` → admin override
- `setFeatureForCohort(cohortName, flagName, enabled)` → cohort-wide
- `setFeatureGlobal(flagName, enabled)` → global toggle
- Initialize default flags: training, quiz, download, mining, consensus_tools, advanced_logs, stress_testing

**Validation**: Flag resolution hierarchy works, admin overrides persist

---

# PHASE 3: Database Access Layer (Days 5-6)
**Goal**: Implement all DB queries/mutations while preserving existing code

## Task 3.1: Onboarding DB Queries
**Files**: Extend `/src/server/db.ts`
**Add functions**:
- `getOnboardingRecord(tester_id)` → onboarding row
- `updateOnboardingStatus(tester_id, newStatus)` → updates both onboarding + testers tables
- `updateTrainingProgress(tester_id, progress)` → 0-100
- `recordTrainingCompletion(tester_id)`
- `recordQuizAttempt(tester_id, score, answers, passed)`
- `issueCertification(tester_id)` → generates cert_id, stores in certifications + testers
- `recordMissionCompletion(tester_id, mission_id)`
- `getCurrentMissionNumber(tester_id)` → int 1-8
- All functions should use prepared statements, handle errors gracefully

**Validation**: All queries execute without errors, data persists correctly, no SQLi vulnerabilities

---

## Task 3.2: Feature Flag DB Queries
**Files**: Extend `/src/server/db.ts`
**Add functions**:
- `getFeatureFlagStatus(flagName)` → global enabled
- `getUserFeatureFlagOverride(tester_id, flagName)` → override or null
- `getCohortFeatureFlagOverride(cohortName, flagName)` → override or null
- `setUserFeatureFlag(tester_id, flagName, enabled)`
- `setCohortFeatureFlag(cohortName, flagName, enabled)`
- `setGlobalFeatureFlag(flagName, enabled)`
- `initializeDefaultFlags()` → seed default flags

**Validation**: Queries execute, overrides resolve correctly

---

# PHASE 4: API Endpoints (Days 7-8)
**Goal**: Expose new functionality via REST API while preserving existing endpoints

## Task 4.1: Onboarding Endpoints
**Files**: New `/src/pages/api/onboarding/`
**Create**:
- `GET /api/onboarding/status` → UserOnboardingState for current tester
- `POST /api/onboarding/transition` → attempt state transition (requires valid transition + auth)
- `GET /api/onboarding/missions` → array of missions with progress
- `POST /api/onboarding/missions/:id/complete` → mark mission complete (if criteria met)
- `GET /api/onboarding/current-mission` → single mission tester should focus on
- All endpoints require authentication

**Validation**: Endpoints respond with correct data, state transitions validated, auth enforced

---

## Task 4.2: Training Endpoints
**Files**: New `/src/pages/api/training/`
**Create**:
- `GET /api/training/lessons` → array of TrainingLesson[]
- `GET /api/training/lessons/:id` → single lesson with content
- `POST /api/training/lessons/:id/start` → mark in-progress
- `POST /api/training/lessons/:id/complete` → validate completion
- `GET /api/training/progress` → training completion %
- All require: authenticated + (training_status === TRAINING or higher)

**Validation**: Lessons load, progress tracks, state checks enforce

---

## Task 4.3: Quiz Endpoints
**Files**: New `/src/pages/api/quiz/`
**Create**:
- `GET /api/quiz/start` → returns randomized quiz questions (if eligible)
- `POST /api/quiz/submit` → grade submission
  - On pass: return score, certification details, auto-transition
  - On fail: return score, retry eligibility, feedback
- `GET /api/quiz/history` → past attempts (score, date, passed)
- Require: authenticated + training_completed + !quiz_passed

**Validation**: Quiz generates, grades correctly, transitions work, retry logic enforced

---

## Task 4.4: Feature Flags Endpoints
**Files**: New `/src/pages/api/admin/feature-flags.ts` (admin-only)
**Create**:
- `GET /api/admin/feature-flags` → all flags + status
- `PUT /api/admin/feature-flags/:name` → update global/user/cohort
  - Requires staff/superuser
- `GET /api/admin/feature-flags/user/:tester_id` → user's active flags
- All require: authenticated + (is_staff || is_superuser)

**Validation**: Admin-only access enforced, updates persist

---

## Task 4.5: Preserve Existing Endpoints
**Critical**: Do NOT break:
- `GET /api/downloads` → existing download endpoint (add certification check)
- `POST /api/node/pair` → existing pairing endpoint (update mission tracking)
- `GET /api/me` → extend response with onboarding_status + current_mission
- `GET /api/admin/*` → existing admin endpoints (add onboarding data)

**Validation**: Existing tests still pass, new auth checks applied correctly

---

# PHASE 5: Route Guards & Middleware (Days 9-10)
**Goal**: Enforce onboarding state at route level without breaking existing access

## Task 5.1: Onboarding Guards
**Files**: Extend `/src/server/guard.ts` and new `/src/server/onboarding-guard.ts`
**Implement**:
- `requireOnboardingState(requiredState: OnboardingStatus)` → middleware that:
  - Gets current tester's state
  - If state < requiredState: block + redirect to onboarding
  - Otherwise: allow
- `requireMission(missionId: int)` → validate mission progression
- `requireCertification()` → check certification_id exists + valid
- `requireNodePaired()` → check node_paired = true

**Validation**: Guards correctly block/allow based on state, redirects work

---

## Task 5.2: Protected Routes
**Files**: Modify `/src/pages/` route handlers
**Apply guards to**:
- `/training/*` → requireOnboardingState('TRAINING') or higher
- `/quiz` → requireOnboardingState('TRAINING_COMPLETE')
- `/download` → requireCertification()
- `/node-status` → requireOnboardingState('NODE_DOWNLOAD')
- `/dashboard` → authenticated only (show based on current state)

**Validation**: Routes properly gate access, unauthenticated users redirected

---

# PHASE 6: UI Components (Days 11-13)
**Goal**: Build React components for new features

## Task 6.1: Training Components
**Files**: New `/src/components/Training.tsx`
**Create**:
- `<LessonCard />` → displays lesson with title, progress, status
- `<LessonView />` → full lesson display with content + completion button
- `<TrainingProgress />` → progress bar + lesson list
- Uses: `/api/training/lessons`, `/api/training/lessons/:id/complete`

**Validation**: Components render, fetch data, state updates

---

## Task 6.2: Quiz Components
**Files**: New `/src/components/Quiz.tsx`
**Create**:
- `<QuizStart />` → intro screen, start button
- `<QuizQuestion />` → single question with options, timer (optional)
- `<QuizReview />` → show results, score, pass/fail, feedback
- `<QuizHistory />` → past attempts table
- Uses: `/api/quiz/start`, `/api/quiz/submit`, `/api/quiz/history`

**Validation**: Quiz flow complete, scoring works, history displays

---

## Task 6.3: Dashboard Redesign
**Files**: Modify `/src/components/Portal.tsx` and new `/src/components/Dashboard.tsx`
**Show**:
- Current onboarding status (banner)
- Current mission (highlighted)
- Mission progress (%) and next action
- All 8 missions with status badges
- Certification status (pending/active/expired)
- Node status if paired
- Announcements section
- Next required action (call-to-action button)

**Validation**: Dashboard displays all required info, responsive design

---

## Task 6.4: Mission Components
**Files**: New `/src/components/Missions.tsx`
**Create**:
- `<MissionList />` → shows all 8 missions with status
- `<MissionDetails />` → expanded view with objectives, criteria, unlock conditions
- `<MissionProgress />` → progress bar for current mission
- Uses: `/api/onboarding/missions`, `/api/onboarding/current-mission`

**Validation**: Missions display with correct status, progression logic respected

---

## Task 6.5: Certification Display
**Files**: New `/src/components/Certification.tsx`
**Create**:
- `<CertificationBadge />` → displays cert ID, issue date, status
- `<CertificationPending />` → shows requirements before eligible
- Uses: `/api/onboarding/status`

**Validation**: Cert displays correctly based on state

---

# PHASE 7: Admin Tools (Days 14-15)
**Goal**: Extend admin portal with onboarding management

## Task 7.1: Admin Endpoints Extension
**Files**: Extend `/src/pages/api/admin/`
**Add**:
- `GET /api/admin/participants` → list all testers with onboarding status, mission progress, cert status
  - Support filtering by state, certification, testing phase
  - Support sorting by joined_at, current_mission, etc.
- `PUT /api/admin/participants/:id/status` → force state transition (staff action audit)
- `PUT /api/admin/participants/:id/mission` → reset/advance mission (troubleshooting)
- `GET /api/admin/onboarding/stats` → aggregated metrics
  - Testers by state (pie chart)
  - Training completion rate (%)
  - Quiz pass rate (%)
  - Avg quiz score
  - Certification vs no-cert counts
  - Node pairing rate
- `PUT /api/admin/testing-phases/:id` → manage current testing phase

**Validation**: Admin endpoints secured, data accurate, audit trail if needed

---

## Task 7.2: Admin UI Components
**Files**: Extend admin section with:
- `<OnboardingDashboard />` → stats overview, state distribution
- `<ParticipantTable />` → searchable, filterable list
- `<MissionManager />` → show/manage missions, phases
- `<FeatureFlagManager />` → toggle flags per user/cohort/global

**Validation**: Admin UI functional, editable, reflects DB changes

---

# PHASE 8: Integration & Testing (Days 16-18)
**Goal**: Verify end-to-end workflows and existing compatibility

## Task 8.1: Database Migration Strategy
**Files**: New `/src/migrations/` with timestamped files
**Create**:
- Migration that adds all new columns to `testers` table
- Migration that creates all new tables
- Migrations are idempotent (CREATE TABLE IF NOT EXISTS, ALTER TABLE ADD COLUMN IF NOT EXISTS)
- On deployment: run migrations automatically on app startup

**Validation**: Fresh DB: all tables/columns exist. Existing DB: migrations run without errors.

---

## Task 8.2: Existing Functionality Tests
**Files**: `/tests/` (existing tests + new)
**Verify**:
- Whitelist/invite flow still works
- Login with OTP still works
- Session creation/renewal still works
- Node download still works
- Node pairing still works
- User profile completion still works
- Support tickets still work
- Admin functions still work
- Rewards system still works

**Validation**: All existing tests pass without modification

---

## Task 8.3: New Feature Tests
**Files**: New test files in `/tests/`
**Create tests for**:
- Onboarding state transitions (valid + invalid paths)
- Training lesson progression
- Quiz scoring and passing/failing
- Mission unlock and completion logic
- Feature flag resolution (user/cohort/global priority)
- Certification issuance and validation
- Route guards and access control

**Validation**: All new tests pass

---

## Task 8.4: End-to-End Onboarding Flow
**Manual testing flow**:
1. New user invited → status = REGISTERED
2. Complete profile → status = PROFILE_COMPLETE
3. Enroll in training → status = TRAINING
4. Complete all 5 lessons → status = QUIZ (if auto-advance) or manual transition
5. Start quiz → randomized 10-15 questions
6. Submit answers → grade (if 80%+ → CERTIFIED, else → retry)
7. As CERTIFIED → download button enabled
8. Download node → status = NODE_DOWNLOAD
9. Get pairing code + use it → status = NODE_PAIRED
10. Node syncs → status = TESTING
11. Complete testing phase → status = COMPLETED
12. Dashboard should show mission progress at each step

**Validation**: Flow completes without errors, state transitions smooth, UI reflects state

---

## Task 8.5: Permission & Security Testing
**Verify**:
- Non-certified users cannot download
- Unauthenticated users cannot access onboarding pages
- Users cannot bypass training/quiz via URL
- Users cannot claim completion without meeting criteria
- Quiz cannot be re-taken after passing
- Certification is immutable (cannot be revoked by user)
- Admin-only endpoints require staff/superuser
- Rate limiting on sensitive endpoints
- CSRF protection on state-changing endpoints

**Validation**: All security checks pass

---

# PHASE 9: Deployment Prep & Documentation (Days 19-20)
**Goal**: Finalize and prepare for production

## Task 9.1: Database Backup & Rollback Strategy
**Document**:
- Pre-deployment backup steps
- Migration rollback procedure
- Data recovery plan if migration fails
- Test restore from backup

**Validation**: Team aware of rollback procedures

---

## Task 9.2: Code Quality & Documentation
**Add**:
- JSDoc comments on all public functions
- README in `/src/server/` explaining onboarding system
- README in `/src/lib/onboarding.ts` explaining state machine
- API documentation for new endpoints (Swagger/OpenAPI format, optional)
- Architecture diagram showing data flow

**Validation**: Code is readable, intentions clear

---

## Task 9.3: Performance Considerations
**Review**:
- DB queries: do we have proper indexes? (tester_id, certification_id, onboarding_status)
- N+1 queries: avoid fetching mission data in loops
- Caching: consider caching feature flags (they change infrequently)
- Load testing: can the system handle onboarding under typical load?

**Validation**: Performance acceptable, no obvious bottlenecks

---

## Task 9.4: Monitoring & Alerting
**Prepare**:
- Log key state transitions
- Alert on unusual patterns (e.g., many quiz failures)
- Dashboard to watch onboarding funnel (registration → training → cert → download → paired)
- Error tracking for failed transitions

**Validation**: Ops team can monitor onboarding health

---

## Task 9.5: Final Deliverables
**Create**:
- **Architecture Summary**: How onboarding integrates with existing system
- **Database Changes**: All new tables/columns documented
- **New API Endpoints**: Full list with request/response examples
- **Modified Routes**: What changed, what was added
- **New Components**: List of React components and their purposes
- **Migration Notes**: How to deploy safely
- **Testing Checklist**: All scenarios that were verified
- **Deployment Considerations**: Zero-downtime strategy, rollback plan, monitoring points

**Validation**: Team has complete picture of what changed and why

---

# Quick Reference: Onboarding State Flow

```
REGISTERED 
  ↓ (profile complete)
PROFILE_COMPLETE 
  ↓ (enroll)
TRAINING 
  ↓ (complete all lessons)
QUIZ 
  ↓ (pass with 80%+)
CERTIFIED 
  ↓ (download)
NODE_DOWNLOAD 
  ↓ (use pairing code)
NODE_PAIRED 
  ↓ (node syncs)
TESTING 
  ↓ (complete phase)
COMPLETED
```

---

# Risk Mitigation & Key Principles

## Preserve Existing Functionality
- All changes are **additive**, not replacements
- Existing API endpoints get new authorization checks only, no signature changes
- Existing database columns remain unchanged
- Backward compatibility maintained: old features work alongside new

## Incremental Rollout
- Deploy migrations → deploy backend logic → deploy UI → enable feature flags progressively
- Start with staff/testers only, then broaden to all participants

## Validation at Each Phase
- After Phase 1: DB schema correct
- After Phase 2: State machine logic correct
- After Phase 3: DB queries work reliably
- After Phase 4: API endpoints functional
- After Phase 5: Route protection working
- After Phase 6: UI displays correctly
- After Phase 7: Admin tools functional
- After Phase 8: Existing + new functionality both work
- After Phase 9: Ready for production

## Communication
- Keep team informed of progress
- Gather feedback after UI is visible
- Document decisions and tradeoffs
- Clear deployment checklist before going live

---

# Implementation Timeline: 20 Days

| Day  | Phase | Key Deliverables |
|------|-------|------------------|
| 1-2  | 1     | DB schema, types, constants |
| 3-4  | 2     | State machine, training, quiz, missions, flags |
| 5-6  | 3     | DB queries, migrations |
| 7-8  | 4     | API endpoints (new + modified) |
| 9-10 | 5     | Route guards, middleware |
| 11-13| 6     | React components, UI |
| 14-15| 7     | Admin tools, management UI |
| 16-18| 8     | Testing, validation, security |
| 19-20| 9     | Docs, deployment checklist, monitoring |

