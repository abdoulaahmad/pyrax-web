// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Onboarding state machine: centralized management of participant progression.
// Handles state transitions with validation, mission advancement, and feature access.

import crypto from 'node:crypto';
import { db, init } from './db';
import { STATE_ORDER, isValidTransition, getNextState, canAccessFeatureByState, type FeatureFlagName } from '../lib/onboarding';
import type { OnboardingStatus, UserOnboardingState, OnboardingRecord } from '../types/onboarding';
import { testerById } from './db';

/**
 * Get the complete onboarding state for a tester.
 * Returns all onboarding-related data: status, training progress, quiz history, missions, etc.
 */
export async function getOnboardingState(tester_id: string): Promise<UserOnboardingState | null> {
  await init();
  const pool = db();

  try {
    const testerResult = await pool.query('SELECT * FROM testers WHERE id = $1', [tester_id]);
    if (!testerResult.rows[0]) return null;

    const tester = testerResult.rows[0];

    // Get onboarding record
    const onboardingResult = await pool.query(
      'SELECT id, tester_id, status, created_at, updated_at FROM onboarding WHERE tester_id = $1',
      [tester_id],
    );
    const onboarding = onboardingResult.rows[0];
    const onboarding_status: OnboardingStatus = tester.onboarding_status || 'REGISTERED';

    // Get training lessons with progress
    const lessonsResult = await pool.query(`
      SELECT l.id, l.title, l.content, l.lesson_order, l.required_for_cert, l.created_at,
             p.status as progress_status, p.completed_at
      FROM training_lessons l
      LEFT JOIN training_progress p ON l.id = p.lesson_id AND p.tester_id = $1
      ORDER BY l.lesson_order ASC
    `, [tester_id]);

    const training_lessons = lessonsResult.rows.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      lesson_order: row.lesson_order,
      required_for_cert: row.required_for_cert,
      created_at: row.created_at,
      completed: row.progress_status === 'completed',
      completed_at: row.completed_at ? Number(row.completed_at) : null,
      progress: row.progress_status ? {
        id: `${row.id}_${tester_id}`,
        tester_id,
        lesson_id: row.id,
        status: row.progress_status,
        completed_at: row.completed_at ? Number(row.completed_at) : null,
        created_at: Number(row.created_at),
        updated_at: Number(row.created_at),
      } : null,
    }));

    // Get quiz history
    const quizResult = await pool.query(
      'SELECT id, tester_id, score, answers, passed, created_at FROM quiz_attempts WHERE tester_id = $1 ORDER BY created_at DESC',
      [tester_id],
    );
    const quiz_history = quizResult.rows;

    // Get certification if exists
    const certResult = await pool.query(
      'SELECT id, tester_id, cert_number, issued_at, expires_at, status, revoked_at, revoked_by FROM certifications WHERE tester_id = $1',
      [tester_id],
    );
    const certification = certResult.rows[0] || null;

    // Get missions with progress
    const missionsResult = await pool.query(`
      SELECT m.id, m.mission_number, m.title, m.description, m.prerequisites, m.completion_criteria,
             m.unlock_conditions, m.created_at, p.status as progress_status, p.progress_data, p.completed_at
      FROM missions m
      LEFT JOIN mission_progress p ON m.id = p.mission_id AND p.tester_id = $1
      ORDER BY m.mission_number ASC
    `, [tester_id]);

    const missions = missionsResult.rows.map((row) => ({
      id: row.id,
      mission_number: row.mission_number,
      title: row.title,
      description: row.description,
      prerequisites: row.prerequisites,
      completion_criteria: row.completion_criteria,
      unlock_conditions: row.unlock_conditions,
      created_at: Number(row.created_at),
      progress: row.progress_status ? {
        id: `${row.id}_${tester_id}`,
        tester_id,
        mission_id: row.id,
        status: row.progress_status,
        progress_data: row.progress_data || {},
        completed_at: row.completed_at ? Number(row.completed_at) : null,
        created_at: Number(row.created_at),
        updated_at: Number(row.created_at),
      } : null,
    }));

    // Get testing phases
    const phasesResult = await pool.query(
      'SELECT id, phase_name, phase_order, objectives, start_date, end_date, created_at, updated_at FROM testing_phases ORDER BY phase_order ASC',
    );
    const testing_phases = phasesResult.rows;

    // Get enabled features
    const enabledFeaturesSet = new Set<string>();
    const flagsResult = await pool.query(`
      SELECT f.flag_name, f.global_enabled, ffu.enabled as user_enabled, ffc.enabled as cohort_enabled
      FROM feature_flags f
      LEFT JOIN feature_flag_users ffu ON f.id = ffu.flag_id AND ffu.tester_id = $1
      LEFT JOIN feature_flag_cohorts ffc ON f.id = ffc.flag_id
    `, [tester_id]);

    flagsResult.rows.forEach((row) => {
      // User override takes precedence, then cohort override, then global
      const enabled = row.user_enabled !== null ? row.user_enabled : (row.cohort_enabled !== null ? row.cohort_enabled : row.global_enabled);
      if (enabled) {
        enabledFeaturesSet.add(row.flag_name);
      }
    });

    return {
      tester_id,
      email: tester.email,
      display_name: tester.display_name,
      onboarding_status,
      onboarding_record_id: onboarding?.id || '',
      training_completed: tester.training_completed,
      training_progress: tester.training_progress,
      training_lessons,
      quiz_passed: tester.quiz_passed,
      quiz_score: tester.quiz_score,
      quiz_attempts: tester.quiz_attempts,
      quiz_history,
      certification_id: tester.certification_id,
      certification_issued_at: tester.certification_issued_at ? Number(tester.certification_issued_at) : null,
      certification,
      node_downloaded: tester.node_downloaded,
      node_paired: tester.node_paired,
      current_mission: tester.current_mission,
      missions,
      current_testing_phase: tester.current_testing_phase,
      testing_phases,
      enabled_features: Array.from(enabledFeaturesSet),
    };
  } catch (err) {
    console.error('[onboarding] getOnboardingState failed:', err);
    throw err;
  }
}

/**
 * Attempt to transition a tester to a new onboarding state.
 * Validates transition rules and prerequisites before applying the change.
 */
export async function transitionState(
  tester_id: string,
  newState: OnboardingStatus,
): Promise<{ ok: true; old_state: OnboardingStatus; new_state: OnboardingStatus } | { ok: false; reason: string }> {
  await init();
  const pool = db();

  try {
    const tester = await testerById(tester_id);
    if (!tester) return { ok: false, reason: 'tester_not_found' };

    const oldState = (tester.onboarding_status || 'REGISTERED') as OnboardingStatus;

    // Validate transition
    if (!isValidTransition(oldState, newState)) {
      return { ok: false, reason: 'invalid_transition' };
    }

    // State-specific prerequisite checks
    if (newState === 'PROFILE_COMPLETE') {
      // Require profile fields to be filled
      if (!tester.display_name || !tester.handle) {
        return { ok: false, reason: 'prerequisites_not_met: incomplete_profile' };
      }
    }

    if (newState === 'TRAINING') {
      // Must have completed profile
      if (oldState !== 'PROFILE_COMPLETE') {
        return { ok: false, reason: 'prerequisites_not_met: profile_not_complete' };
      }
    }

    if (newState === 'QUIZ') {
      // Must have completed training
      if (!tester.training_completed) {
        return { ok: false, reason: 'prerequisites_not_met: training_not_complete' };
      }
    }

    if (newState === 'CERTIFIED') {
      // Must have passed quiz
      if (!tester.quiz_passed) {
        return { ok: false, reason: 'prerequisites_not_met: quiz_not_passed' };
      }
    }

    if (newState === 'NODE_DOWNLOAD') {
      // Must be certified
      if (!tester.certification_id) {
        return { ok: false, reason: 'prerequisites_not_met: not_certified' };
      }
    }

    if (newState === 'NODE_PAIRED') {
      // Must have downloaded node
      if (!tester.node_downloaded) {
        return { ok: false, reason: 'prerequisites_not_met: node_not_downloaded' };
      }
    }

    if (newState === 'TESTING') {
      // Must have paired node
      if (!tester.node_paired) {
        return { ok: false, reason: 'prerequisites_not_met: node_not_paired' };
      }
    }

    if (newState === 'COMPLETED') {
      // All prior missions must be done
      if (tester.current_mission < 8) {
        return { ok: false, reason: 'prerequisites_not_met: not_all_missions_complete' };
      }
    }

    // Perform transition
    const now = Date.now();
    await pool.query(
      `UPDATE testers SET onboarding_status = $1 WHERE id = $2`,
      [newState, tester_id],
    );

    // Update or create onboarding record
    const existingOnboarding = await pool.query(
      'SELECT id FROM onboarding WHERE tester_id = $1',
      [tester_id],
    );

    if (existingOnboarding.rows[0]) {
      await pool.query(
        'UPDATE onboarding SET status = $1, updated_at = $2 WHERE tester_id = $3',
        [newState, now, tester_id],
      );
    } else {
      const id = `ob_${crypto.randomBytes(8).toString('base64url')}`;
      await pool.query(
        'INSERT INTO onboarding (id, tester_id, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)',
        [id, tester_id, newState, now, now],
      );
    }

    return { ok: true, old_state: oldState, new_state: newState };
  } catch (err) {
    console.error('[onboarding] transitionState failed:', err);
    throw err;
  }
}

/**
 * Get the current mission a tester should focus on.
 * Returns the next incomplete mission based on progression.
 */
export async function getCurrentMissionTarget(tester_id: string): Promise<{ mission_number: number; mission_id: string } | null> {
  await init();
  const pool = db();

  try {
    const tester = await testerById(tester_id);
    if (!tester) return null;

    const missionNumber = tester.current_mission || 1;

    // Get the mission details
    const result = await pool.query(
      'SELECT id FROM missions WHERE mission_number = $1',
      [missionNumber],
    );

    if (!result.rows[0]) return null;

    return {
      mission_number: missionNumber,
      mission_id: result.rows[0].id,
    };
  } catch (err) {
    console.error('[onboarding] getCurrentMissionTarget failed:', err);
    throw err;
  }
}

/**
 * Advance to the next mission.
 * Only succeeds if current mission is completed and next mission exists.
 */
export async function advanceMission(tester_id: string): Promise<{ ok: true; new_mission: number } | { ok: false; reason: string }> {
  await init();
  const pool = db();

  try {
    const tester = await testerById(tester_id);
    if (!tester) return { ok: false, reason: 'tester_not_found' };

    const currentMission = tester.current_mission || 1;
    const nextMission = currentMission + 1;

    // Check if next mission exists
    const nextMissionExists = await pool.query(
      'SELECT id FROM missions WHERE mission_number = $1',
      [nextMission],
    );

    if (!nextMissionExists.rows[0]) {
      return { ok: false, reason: 'no_more_missions' };
    }

    // Update current mission
    await pool.query(
      'UPDATE testers SET current_mission = $1 WHERE id = $2',
      [nextMission, tester_id],
    );

    return { ok: true, new_mission: nextMission };
  } catch (err) {
    console.error('[onboarding] advanceMission failed:', err);
    throw err;
  }
}

/**
 * Check if a feature is accessible to a tester.
 * Considers onboarding state, feature flags, and feature prerequisites.
 */
export async function canAccessFeature(tester_id: string, featureName: FeatureFlagName): Promise<boolean> {
  await init();

  try {
    const tester = await testerById(tester_id);
    if (!tester) return false;

    const userState = (tester.onboarding_status || 'REGISTERED') as OnboardingStatus;

    // First check: is feature accessible based on onboarding state?
    if (!canAccessFeatureByState(featureName, userState)) {
      return false;
    }

    // Second check: is feature flag enabled for this user?
    const pool = db();
    const flagResult = await pool.query(`
      SELECT f.global_enabled, ffu.enabled as user_enabled, ffc.enabled as cohort_enabled
      FROM feature_flags f
      LEFT JOIN feature_flag_users ffu ON f.id = ffu.flag_id AND ffu.tester_id = $1
      LEFT JOIN feature_flag_cohorts ffc ON f.id = ffc.flag_id
      WHERE f.flag_name = $2
    `, [tester_id, featureName]);

    if (!flagResult.rows[0]) {
      // Flag doesn't exist, assume globally enabled
      return true;
    }

    const row = flagResult.rows[0];
    // User override takes precedence, then cohort override, then global
    const enabled = row.user_enabled !== null ? row.user_enabled : (row.cohort_enabled !== null ? row.cohort_enabled : row.global_enabled);

    return enabled;
  } catch (err) {
    console.error('[onboarding] canAccessFeature failed:', err);
    return false;
  }
}

/**
 * Get all features accessible to a tester.
 */
export async function getAccessibleFeatures(tester_id: string): Promise<string[]> {
  await init();

  try {
    const state = await getOnboardingState(tester_id);
    if (!state) return [];
    return state.enabled_features;
  } catch (err) {
    console.error('[onboarding] getAccessibleFeatures failed:', err);
    return [];
  }
}

/**
 * Ensure onboarding record exists for a tester (idempotent).
 * Called during account creation to initialize onboarding state.
 */
export async function ensureOnboardingRecord(tester_id: string): Promise<{ ok: true; record_id: string } | { ok: false; reason: string }> {
  await init();
  const pool = db();

  try {
    // Check if already exists
    const existing = await pool.query(
      'SELECT id FROM onboarding WHERE tester_id = $1',
      [tester_id],
    );

    if (existing.rows[0]) {
      return { ok: true, record_id: existing.rows[0].id };
    }

    // Create new onboarding record
    const id = `ob_${crypto.randomBytes(8).toString('base64url')}`;
    const now = Date.now();

    await pool.query(
      'INSERT INTO onboarding (id, tester_id, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)',
      [id, tester_id, 'REGISTERED', now, now],
    );

    // Initialize mission progress (all missions in not_started state)
    const missionsResult = await pool.query('SELECT id FROM missions ORDER BY mission_number ASC');

    for (const mission of missionsResult.rows) {
      const mid = `mp_${crypto.randomBytes(8).toString('base64url')}`;
      await pool.query(
        'INSERT INTO mission_progress (id, tester_id, mission_id, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)',
        [mid, tester_id, mission.id, 'not_started', now, now],
      );
    }

    return { ok: true, record_id: id };
  } catch (err) {
    console.error('[onboarding] ensureOnboardingRecord failed:', err);
    return { ok: false, reason: 'database_error' };
  }
}
