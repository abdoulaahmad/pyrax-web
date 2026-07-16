// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Onboarding system type definitions for DevNet Portal V2.
// Central repository for all onboarding-related TypeScript interfaces and types.

/** Onboarding state progression: REGISTERED → PROFILE_COMPLETE → TRAINING → QUIZ → CERTIFIED → NODE_DOWNLOAD → NODE_PAIRED → TESTING → COMPLETED */
export type OnboardingStatus =
  | 'REGISTERED'
  | 'PROFILE_COMPLETE'
  | 'TRAINING'
  | 'QUIZ'
  | 'CERTIFIED'
  | 'NODE_DOWNLOAD'
  | 'NODE_PAIRED'
  | 'TESTING'
  | 'COMPLETED';

/** Training progress status for a lesson */
export type TrainingProgressStatus = 'not_started' | 'in_progress' | 'completed';

/** Mission progress status */
export type MissionProgressStatus = 'not_started' | 'in_progress' | 'completed';

/** Certification status */
export type CertificationStatus = 'active' | 'expired' | 'revoked';

/** Training lesson module */
export interface TrainingLesson {
  id: string;
  title: string;
  content: Record<string, any>;
  lesson_order: number;
  required_for_cert: boolean;
  created_at: number;
  completed?: boolean;
  completed_at?: number | null;
}

/** Training progress for a tester on a specific lesson */
export interface TrainingProgress {
  id: string;
  tester_id: string;
  lesson_id: string;
  status: TrainingProgressStatus;
  completed_at: number | null;
  created_at: number;
  updated_at: number;
}

/** Quiz question */
export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string;
  created_at: number;
}

/** Quiz attempt result */
export interface QuizAttempt {
  id: string;
  tester_id: string;
  score: number;
  answers: Record<string, number>;
  passed: boolean;
  created_at: number;
}

/** Certification record */
export interface Certification {
  id: string;
  tester_id: string;
  cert_number: string;
  issued_at: number;
  expires_at: number | null;
  status: CertificationStatus;
  revoked_at: number | null;
  revoked_by: string | null;
}

/** Mission definition */
export interface Mission {
  id: string;
  mission_number: number;
  title: string;
  description: string;
  prerequisites: number[]; // mission IDs that must be completed first
  completion_criteria: Record<string, any>;
  unlock_conditions: Record<string, any>;
  created_at: number;
}

/** Mission progress for a tester */
export interface MissionProgress {
  id: string;
  tester_id: string;
  mission_id: string;
  status: MissionProgressStatus;
  progress_data: Record<string, any>;
  completed_at: number | null;
  created_at: number;
  updated_at: number;
}

/** Feature flag configuration */
export interface FeatureFlag {
  id: string;
  flag_name: string;
  global_enabled: boolean;
  created_at: number;
  updated_at: number;
}

/** User-specific feature flag override */
export interface FeatureFlagUser {
  id: string;
  flag_id: string;
  tester_id: string;
  enabled: boolean;
}

/** Cohort-specific feature flag override */
export interface FeatureFlagCohort {
  id: string;
  flag_id: string;
  cohort_name: string;
  enabled: boolean;
}

/** Testing phase */
export interface TestingPhase {
  id: string;
  phase_name: string;
  phase_order: number;
  objectives: Record<string, any>[];
  start_date: number;
  end_date: number | null;
  created_at: number;
  updated_at: number;
}

/** Complete onboarding state for a user */
export interface UserOnboardingState {
  // Core identifiers
  tester_id: string;
  email: string;
  display_name: string;

  // Onboarding progression
  onboarding_status: OnboardingStatus;
  onboarding_record_id: string;

  // Training
  training_completed: boolean;
  training_progress: number; // 0-100
  training_lessons: (TrainingLesson & { progress: TrainingProgress | null })[];

  // Quiz
  quiz_passed: boolean;
  quiz_score: number;
  quiz_attempts: number;
  quiz_history: QuizAttempt[];

  // Certification
  certification_id: string | null;
  certification_issued_at: number | null;
  certification: Certification | null;

  // Node operations
  node_downloaded: boolean;
  node_paired: boolean;

  // Mission tracking
  current_mission: number;
  missions: (Mission & { progress: MissionProgress | null })[];

  // Testing
  current_testing_phase: string | null;
  testing_phases: TestingPhase[];

  // Feature access
  enabled_features: string[];
}

/** Onboarding record from database */
export interface OnboardingRecord {
  id: string;
  tester_id: string;
  status: OnboardingStatus;
  created_at: number;
  updated_at: number;
}

/** Request/response types for API */
export interface OnboardingStatusResponse {
  ok: boolean;
  state?: UserOnboardingState;
  reason?: string;
}

export interface TransitionStateRequest {
  new_state: OnboardingStatus;
}

export interface TransitionStateResponse {
  ok: boolean;
  old_state?: OnboardingStatus;
  new_state?: OnboardingStatus;
  reason?: string; // 'invalid_transition', 'prerequisites_not_met', etc.
}

export interface GetMissionsResponse {
  ok: boolean;
  missions?: (Mission & { progress: MissionProgress | null })[];
  current_mission_number?: number;
  reason?: string;
}

export interface CompleteMissionRequest {
  mission_id: string;
}

export interface CompleteMissionResponse {
  ok: boolean;
  mission_id?: string;
  next_mission_number?: number;
  reason?: string;
}

export interface QuizStartResponse {
  ok: boolean;
  questions?: QuizQuestion[];
  reason?: string;
}

export interface QuizSubmitRequest {
  answers: Record<string, number>;
}

export interface QuizSubmitResponse {
  ok: boolean;
  score?: number;
  passed?: boolean;
  explanation?: string;
  certification_id?: string;
  reason?: string;
}

export interface FeatureFlagResponse {
  ok: boolean;
  enabled: boolean;
  reason?: string;
}
