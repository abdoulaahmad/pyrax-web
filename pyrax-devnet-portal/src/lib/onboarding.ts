// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Onboarding system constants, enums, and validation utilities for DevNet Portal V2.

import type { Mission, OnboardingStatus, TestingPhase } from '../types/onboarding';

// ---- Onboarding States ----
export const ONBOARDING_STATES = {
  REGISTERED: 'REGISTERED',
  PROFILE_COMPLETE: 'PROFILE_COMPLETE',
  TRAINING: 'TRAINING',
  QUIZ: 'QUIZ',
  CERTIFIED: 'CERTIFIED',
  NODE_DOWNLOAD: 'NODE_DOWNLOAD',
  NODE_PAIRED: 'NODE_PAIRED',
  TESTING: 'TESTING',
  COMPLETED: 'COMPLETED',
} as const;

export type OnboardingStateKey = keyof typeof ONBOARDING_STATES;

// State progression order for validation
export const STATE_ORDER: OnboardingStatus[] = [
  'REGISTERED',
  'PROFILE_COMPLETE',
  'TRAINING',
  'QUIZ',
  'CERTIFIED',
  'NODE_DOWNLOAD',
  'NODE_PAIRED',
  'TESTING',
  'COMPLETED',
];

// ---- Training Modules ----
export const TRAINING_MODULES = [
  {
    id: 'lesson_1',
    title: 'DevNet Introduction',
    lesson_order: 1,
    required_for_cert: true,
    content: {
      intro: 'Welcome to the Pyrax DevNet',
      sections: [
        { title: 'What is DevNet?', content: 'DevNet is a public-facing developer network...' },
        { title: 'Getting Started', content: 'To get started, you need to...' },
      ],
    },
  },
  {
    id: 'lesson_2',
    title: 'Node Fundamentals',
    lesson_order: 2,
    required_for_cert: true,
    content: {
      intro: 'Understanding Node Architecture',
      sections: [
        { title: 'Node Components', content: 'A node consists of...' },
        { title: 'Node Operations', content: 'Your node will...' },
      ],
    },
  },
  {
    id: 'lesson_3',
    title: 'Mining Rules',
    lesson_order: 3,
    required_for_cert: true,
    content: {
      intro: 'Mining in Pyrax DevNet',
      sections: [
        { title: 'Mining Basics', content: 'Mining is the process of...' },
        { title: 'Reward Structure', content: 'Miners earn...' },
      ],
    },
  },
  {
    id: 'lesson_4',
    title: 'Consensus Basics',
    lesson_order: 4,
    required_for_cert: true,
    content: {
      intro: 'Understanding Consensus',
      sections: [
        { title: 'Consensus Mechanism', content: 'Pyrax uses...' },
        { title: 'Network Health', content: 'A healthy network...' },
      ],
    },
  },
  {
    id: 'lesson_5',
    title: 'Incident Reporting',
    lesson_order: 5,
    required_for_cert: true,
    content: {
      intro: 'Reporting Issues',
      sections: [
        { title: 'What to Report', content: 'Report crashes, errors, and anomalies...' },
        { title: 'How to Report', content: 'Use the built-in reporting system...' },
      ],
    },
  },
] as const;

export const TRAINING_MODULES_COUNT = TRAINING_MODULES.length;

// ---- Quiz Configuration ----
export const QUIZ_PASSING_SCORE = 80; // percentage
export const QUIZ_QUESTIONS_PER_ATTEMPT = 15;
export const QUIZ_MAX_RETRIES = 3; // unlimited if 0

// Quiz questions seed data (will be stored in DB, but initialized with these)
export const QUIZ_QUESTIONS_SEED = [
  {
    question: 'What is the primary purpose of DevNet?',
    options: [
      'Production network for real transactions',
      'Development and testing network for developers',
      'Private network for team only',
      'Archive of historical data',
    ],
    correct_answer: 1,
    explanation: 'DevNet is specifically designed as a development and testing environment.',
  },
  {
    question: 'What should you do if your node crashes unexpectedly?',
    options: [
      'Ignore it and hope it resolves',
      'Restart it and check logs',
      'Check the incident reporting system and submit a report if needed',
      'Contact the team immediately via email',
    ],
    correct_answer: 2,
    explanation: 'Always report incidents through the official incident reporting system.',
  },
  {
    question: 'How often should your node sync with the network?',
    options: [
      'Once per week',
      'Once per day',
      'Continuously, in real-time',
      'Only when you start the application',
    ],
    correct_answer: 2,
    explanation: 'A healthy node continuously synchronizes with the network.',
  },
  {
    question: 'What is a soulbound certification?',
    options: [
      'A temporary badge that expires',
      'A certificate you can transfer to others',
      'A non-transferable credential permanently linked to your account',
      'A physical certificate mailed to your address',
    ],
    correct_answer: 2,
    explanation: 'Soulbound certifications are non-transferable and permanently bound to your account.',
  },
  {
    question: 'Before participating in stress testing, what must you complete?',
    options: [
      'Fill out a form',
      'Pair your node and synchronize it',
      'Pay a fee',
      'Get approval from 3 staff members',
    ],
    correct_answer: 1,
    explanation: 'Your node must be paired and synchronized before stress testing.',
  },
  // Add more questions as needed
] as const;

// ---- Missions ----
export const MISSIONS_SEED: Omit<Mission, 'id' | 'created_at'>[] = [
  {
    mission_number: 1,
    title: 'Complete Profile',
    description: 'Fill out your profile with your display name, handle, and payout wallet.',
    prerequisites: [],
    completion_criteria: { display_name: true, handle: true, payout_wallet: true },
    unlock_conditions: { profile_complete: true },
  },
  {
    mission_number: 2,
    title: 'Complete Training',
    description: 'Complete all 5 training modules: DevNet Intro, Node Fundamentals, Mining Rules, Consensus Basics, and Incident Reporting.',
    prerequisites: [1],
    completion_criteria: { all_lessons_completed: true },
    unlock_conditions: { training_completed: true },
  },
  {
    mission_number: 3,
    title: 'Pass Certification Quiz',
    description: 'Pass the certification quiz with a score of 80% or higher.',
    prerequisites: [2],
    completion_criteria: { quiz_passed: true, score_gte: 80 },
    unlock_conditions: { certified: true },
  },
  {
    mission_number: 4,
    title: 'Download Node Application',
    description: 'Download the node application for your platform (Windows, macOS, or Linux).',
    prerequisites: [3],
    completion_criteria: { node_downloaded: true },
    unlock_conditions: { node_downloaded: true },
  },
];

// ---- Testing Phases ----
export const TESTING_PHASES_SEED: Omit<TestingPhase, 'id' | 'created_at' | 'updated_at'>[] = [
  {
    phase_name: 'Registration',
    phase_order: 1,
    objectives: [{ goal: 'Complete profile and accept terms' }],
    start_date: Date.now(),
    end_date: null,
  },
  {
    phase_name: 'Training',
    phase_order: 2,
    objectives: [{ goal: 'Complete all training modules' }],
    start_date: Date.now(),
    end_date: null,
  },
  {
    phase_name: 'Certification',
    phase_order: 3,
    objectives: [{ goal: 'Pass certification quiz with 80%+' }],
    start_date: Date.now(),
    end_date: null,
  },
  {
    phase_name: 'Node Installation',
    phase_order: 4,
    objectives: [{ goal: 'Download and install node application' }],
    start_date: Date.now(),
    end_date: null,
  },
  {
    phase_name: 'Node Pairing',
    phase_order: 5,
    objectives: [{ goal: 'Pair node with account' }],
    start_date: Date.now(),
    end_date: null,
  },
  {
    phase_name: 'Synchronization',
    phase_order: 6,
    objectives: [{ goal: 'Keep node synchronized with network' }],
    start_date: Date.now(),
    end_date: null,
  },
  {
    phase_name: 'Mining',
    phase_order: 7,
    objectives: [{ goal: 'Participate in mining operations' }],
    start_date: Date.now(),
    end_date: null,
  },
  {
    phase_name: 'Stress Testing',
    phase_order: 8,
    objectives: [{ goal: 'Execute stress test scenarios' }],
    start_date: Date.now(),
    end_date: null,
  },
  {
    phase_name: 'Acceptance Testing',
    phase_order: 9,
    objectives: [{ goal: 'Final validation and acceptance' }],
    start_date: Date.now(),
    end_date: null,
  },
];

// ---- Feature Flags ----
export const DEFAULT_FEATURE_FLAGS = [
  'training',
  'quiz',
  'download',
  'mining',
  'consensus_tools',
  'advanced_logs',
  'stress_testing',
] as const;

export type FeatureFlagName = typeof DEFAULT_FEATURE_FLAGS[number];

// ---- State Transition Rules ----
/** Validates if a transition from oldState to newState is allowed */
export function isValidTransition(oldState: OnboardingStatus, newState: OnboardingStatus): boolean {
  const oldIndex = STATE_ORDER.indexOf(oldState);
  const newIndex = STATE_ORDER.indexOf(newState);

  if (oldIndex === -1 || newIndex === -1) return false;

  // Allow staying in the same state
  if (oldIndex === newIndex) return true;

  // Only allow forward progression
  return newIndex === oldIndex + 1;
}

/** Get the next expected state in progression */
export function getNextState(currentState: OnboardingStatus): OnboardingStatus | null {
  const index = STATE_ORDER.indexOf(currentState);
  if (index === -1 || index === STATE_ORDER.length - 1) return null;
  return STATE_ORDER[index + 1];
}

/** Check if a user can access a feature based on their onboarding state */
export function canAccessFeatureByState(feature: FeatureFlagName, userState: OnboardingStatus): boolean {
  const stateIndex = STATE_ORDER.indexOf(userState);

  switch (feature) {
    case 'training':
      // Training available after profile complete
      return stateIndex >= STATE_ORDER.indexOf('PROFILE_COMPLETE');
    case 'quiz':
      // Quiz available after training started/completed
      return stateIndex >= STATE_ORDER.indexOf('TRAINING');
    case 'download':
      // Download available only after certified
      return stateIndex >= STATE_ORDER.indexOf('CERTIFIED');
    case 'mining':
      // Mining available after node paired
      return stateIndex >= STATE_ORDER.indexOf('NODE_PAIRED');
    case 'consensus_tools':
      // Consensus tools available after testing started
      return stateIndex >= STATE_ORDER.indexOf('TESTING');
    case 'advanced_logs':
      // Advanced logs available after node paired
      return stateIndex >= STATE_ORDER.indexOf('NODE_PAIRED');
    case 'stress_testing':
      // Stress testing available during testing phase
      return stateIndex >= STATE_ORDER.indexOf('TESTING');
    default:
      return false;
  }
}

// ---- Certification ----
export const CERTIFICATION_VALIDITY_DAYS = 365; // Certificates expire after 1 year
export const CERT_ID_PREFIX = 'CERT';

/** Generate a unique certification number */
export function generateCertificationNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `${CERT_ID_PREFIX}-${timestamp}-${random}`;
}

// ---- Validation Utilities ----
export function isValidOnboardingStatus(status: string): status is OnboardingStatus {
  return STATE_ORDER.includes(status as OnboardingStatus);
}

export function isFinalState(status: OnboardingStatus): boolean {
  return status === 'COMPLETED';
}

export function isTrainingState(status: OnboardingStatus): boolean {
  return status === 'TRAINING' || status === 'QUIZ';
}

export function isCertificationRequired(status: OnboardingStatus): boolean {
  return STATE_ORDER.indexOf(status) >= STATE_ORDER.indexOf('CERTIFIED');
}

export function isNodeOperationState(status: OnboardingStatus): boolean {
  return STATE_ORDER.indexOf(status) >= STATE_ORDER.indexOf('NODE_DOWNLOAD');
}
