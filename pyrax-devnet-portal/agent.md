# Pyrax DevNet Portal V2 — Implementation Guide for Development Agent

## Mission
You are working on an existing production codebase. Your goal is to extend the current DevNet Portal, not replace it.

The existing authentication, whitelist system, OTP verification, and node pairing mechanism should remain functional unless there is a verified technical reason to change them.

Follow an incremental implementation strategy. Every feature should integrate cleanly with the existing architecture.

---

# Step 1 — Understand Before Changing
Before modifying any code: done

Generate a short report describing how the current portal works.
Do not begin implementation until this report is complete.

---

# Step 2 — Preserve Existing Functionality
The following functionality must continue working:

- Whitelist approval
- Login
- OTP verification
- Profile completion
- Existing node download system
- Existing node pairing system

Do not rewrite these components unless absolutely necessary.
Instead, extend them.

---

# Step 3 — Introduce Onboarding State Management
Create a centralized onboarding state system.

Every participant must always have one onboarding state.

Suggested states:

- REGISTERED
- PROFILE_COMPLETE
- TRAINING
- QUIZ
- CERTIFIED
- NODE_DOWNLOAD
- NODE_PAIRED
- TESTING
- COMPLETED

Replace scattered conditional logic with a single onboarding state that controls navigation and access.

---

# Step 4 — Extend the User Model
Extend the existing user model with onboarding-related fields.

Suggested additions:

- onboardingStatus
- trainingCompleted
- trainingProgress
- quizPassed
- quizScore
- certificationId
- certificationIssuedAt
- nodeDownloaded
- nodePaired
- currentMission
- currentTestingPhase

Do not remove existing fields.

---

# Step 5 — Route Protection
Implement onboarding-aware route guards.

Examples:

Training pages require:
- authenticated user

Quiz page requires:
- training completed

Download page requires:
- certification complete

Mission Dashboard requires:
- node paired

Prevent users from bypassing onboarding by directly entering URLs.

---

# Step 6 — Training Center
Implement a Training Center.

Requirements:

- modular lesson structure
- progress tracking
- lesson completion
- resume progress
- completion validation

Initial modules:

1. DevNet Introduction
2. Node Fundamentals
3. Mining Rules
4. Consensus Basics
5. Incident Reporting

Training must be completed before certification becomes available.

---

# Step 7 — Certification Quiz
Build a certification engine.

Requirements:

- randomized questions
- configurable passing score
- retry support
- score history
- completion tracking

Default passing score:
80%

Certification becomes available only after passing.

---

# Step 8 — Soulbound Certification
When a participant passes the quiz:

Generate a unique DevNet Certification.

This certification represents successful onboarding.

It authorizes:

- node download
- DevNet participation
- future gated features

The certification should be non-transferable and permanently linked to the participant account.

---

# Step 9 — Restrict Node Download
Reuse the existing download implementation.

Modify authorization.

Current:
Authenticated user

New:
Certified participant

The existing download endpoint should remain whenever possible.

---

# Step 10 — Preserve Node Pairing
Do not redesign node pairing.

Current flow:

Portal generates pairing code.

↓

Participant copies code.

↓

Participant pastes code into node application.

↓

Node successfully registers with portal.

Keep this workflow.

Integrate it into the onboarding process after node download.

---

# Step 11 — Mission System
Build a mission engine.

Initial missions:

Mission 1
Complete Profile

Mission 2
Complete Training

Mission 3
Pass Certification

Mission 4
Download Node

Mission 5
Pair Node

Mission 6
Synchronize Node

Mission 7
Participate in Assigned Test

Mission 8
Submit Feedback

Each mission should include:

- status
- progress
- prerequisites
- completion criteria
- unlock conditions

Participants should always know their current objective.

---

# Step 12 — Dashboard Redesign
Redesign the participant dashboard.

Replace the simple download page with a guided dashboard showing:

Current Mission
Mission Progress
Current Testing Phase
Certification Status
Node Status
Latest Announcements
Next Required Action

The dashboard should guide participants instead of simply displaying links.

---

# Step 13 — Feature Gating
Implement a feature flag system.

Features should be dynamically enabled.

Examples:

Training
Quiz
Download
Mining
Consensus Tools
Advanced Logs
Stress Testing

Feature flags should support:

- individual users
- cohorts
- global activation

Avoid hardcoded permissions.

---

# Step 14 — Testing Phase Management
Introduce testing phases.

Examples:

Registration
Training
Certification
Node Installation
Node Pairing
Synchronization
Mining
Stress Testing
Acceptance Testing

Participants should always see:

Current Phase
Objectives
Time Remaining
Upcoming Phase

---

# Step 15 — Admin Enhancements
Extend the admin portal.

Add:

Participant progress
Mission management
Certification overview
Training statistics
Node pairing status
Feature flags
Testing phase management
Announcement management

---

# Step 16 — Monitoring
Prepare integration points for telemetry.

Display:

Node connectivity
Synchronization
Version
CPU
Memory
Last heartbeat
Network health

Design the interfaces even if telemetry integration is implemented later.

---

# Step 17 — Incident Reporting
Create a built-in reporting system.

Support:

Description
Severity
Logs
Screenshots
Node version
Current phase
Reporter information

---

# Step 18 — Code Quality
All new code must:

- follow existing project architecture
- use existing coding conventions
- reuse components whenever practical
- avoid duplicated logic
- include proper validation
- include error handling
- include documentation/comments where appropriate

---

# Step 19 — Testing
After every completed feature:

- verify existing functionality still works
- perform regression testing
- verify onboarding flow
- verify permissions
- verify download restrictions
- verify node pairing

Do not introduce breaking changes.

---

# Step 20 — Final Deliverables
When implementation is complete, provide:

- updated architecture summary
- database changes
- new API endpoints
- modified routes
- new components
- migration notes
- testing checklist
- deployment considerations

The goal is to evolve the existing DevNet Portal into a structured, mission-driven DevNet Operations Platform while preserving the stability and functionality of the current system.
