// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Feature flag system: dynamic feature gating with user/cohort/global levels.
// Handles feature availability control for gradual rollouts and A/B testing.

import { db, init } from './db';
import { DEFAULT_FEATURE_FLAGS, type FeatureFlagName } from '../lib/onboarding';
import type { FeatureFlag } from '../types/onboarding';

/**
 * Check if a feature is enabled for a tester.
 * Priority: user override → cohort override → global setting (default: true)
 */
export async function isFeatureEnabled(tester_id: string, flagName: FeatureFlagName): Promise<boolean> {
  await init();
  const pool = db();

  try {
    const result = await pool.query(`
      SELECT f.global_enabled, ffu.enabled as user_enabled, ffc.enabled as cohort_enabled
      FROM feature_flags f
      LEFT JOIN feature_flag_users ffu ON f.id = ffu.flag_id AND ffu.tester_id = $1
      LEFT JOIN feature_flag_cohorts ffc ON f.id = ffc.flag_id
      WHERE f.flag_name = $2
    `, [tester_id, flagName]);

    if (!result.rows[0]) {
      // Flag doesn't exist, assume globally enabled
      return true;
    }

    const row = result.rows[0];

    // User override takes precedence
    if (row.user_enabled !== null) {
      return row.user_enabled;
    }

    // Cohort override second priority
    if (row.cohort_enabled !== null) {
      return row.cohort_enabled;
    }

    // Global setting fallback
    return row.global_enabled;
  } catch (err) {
    console.error('[feature-flags] isFeatureEnabled failed:', err);
    return false;
  }
}

/**
 * Get all enabled features for a tester.
 */
export async function getEnabledFeatures(tester_id: string): Promise<string[]> {
  await init();
  const pool = db();

  try {
    const result = await pool.query(`
      SELECT DISTINCT f.flag_name
      FROM feature_flags f
      LEFT JOIN feature_flag_users ffu ON f.id = ffu.flag_id AND ffu.tester_id = $1
      LEFT JOIN feature_flag_cohorts ffc ON f.id = ffc.flag_id
      WHERE (ffu.enabled = true) OR (ffu.enabled IS NULL AND ffc.enabled = true) OR
            (ffu.enabled IS NULL AND ffc.enabled IS NULL AND f.global_enabled = true)
    `, [tester_id]);

    return result.rows.map((row) => row.flag_name);
  } catch (err) {
    console.error('[feature-flags] getEnabledFeatures failed:', err);
    return [];
  }
}

/**
 * Set feature flag for a specific user (override).
 */
export async function setFeatureForUser(
  tester_id: string,
  flagName: FeatureFlagName,
  enabled: boolean,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  await init();
  const pool = db();

  try {
    // Get or create flag
    const flagResult = await pool.query(
      'SELECT id FROM feature_flags WHERE flag_name = $1',
      [flagName],
    );

    let flagId: string;
    if (!flagResult.rows[0]) {
      flagId = `ff_${crypto.randomBytes(8).toString('base64url')}`;
      const now = Date.now();
      await pool.query(
        'INSERT INTO feature_flags (id, flag_name, global_enabled, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)',
        [flagId, flagName, true, now, now],
      );
    } else {
      flagId = flagResult.rows[0].id;
    }

    // Set user override
    const userFlagId = `ffu_${crypto.randomBytes(8).toString('base64url')}`;
    await pool.query(`
      INSERT INTO feature_flag_users (id, flag_id, tester_id, enabled)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (flag_id, tester_id) DO UPDATE
      SET enabled = $4
    `, [userFlagId, flagId, tester_id, enabled]);

    return { ok: true };
  } catch (err) {
    console.error('[feature-flags] setFeatureForUser failed:', err);
    throw err;
  }
}

/**
 * Set feature flag for a cohort (group of users).
 */
export async function setFeatureForCohort(
  cohortName: string,
  flagName: FeatureFlagName,
  enabled: boolean,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  await init();
  const pool = db();

  try {
    // Get or create flag
    const flagResult = await pool.query(
      'SELECT id FROM feature_flags WHERE flag_name = $1',
      [flagName],
    );

    let flagId: string;
    if (!flagResult.rows[0]) {
      flagId = `ff_${crypto.randomBytes(8).toString('base64url')}`;
      const now = Date.now();
      await pool.query(
        'INSERT INTO feature_flags (id, flag_name, global_enabled, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)',
        [flagId, flagName, true, now, now],
      );
    } else {
      flagId = flagResult.rows[0].id;
    }

    // Set cohort override
    const cohortFlagId = `ffc_${crypto.randomBytes(8).toString('base64url')}`;
    await pool.query(`
      INSERT INTO feature_flag_cohorts (id, flag_id, cohort_name, enabled)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (flag_id, cohort_name) DO UPDATE
      SET enabled = $4
    `, [cohortFlagId, flagId, cohortName, enabled]);

    return { ok: true };
  } catch (err) {
    console.error('[feature-flags] setFeatureForCohort failed:', err);
    throw err;
  }
}

/**
 * Set global feature flag (applies to all users unless overridden).
 */
export async function setFeatureGlobal(
  flagName: FeatureFlagName,
  enabled: boolean,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  await init();
  const pool = db();

  try {
    const now = Date.now();
    const flagId = `ff_${crypto.randomBytes(8).toString('base64url')}`;

    await pool.query(`
      INSERT INTO feature_flags (id, flag_name, global_enabled, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (flag_name) DO UPDATE
      SET global_enabled = $3, updated_at = $5
    `, [flagId, flagName, enabled, now, now]);

    return { ok: true };
  } catch (err) {
    console.error('[feature-flags] setFeatureGlobal failed:', err);
    throw err;
  }
}

/**
 * Get all feature flags with their current status.
 */
export async function getAllFeatureFlags(): Promise<FeatureFlag[]> {
  await init();
  const pool = db();

  try {
    const result = await pool.query(
      'SELECT id, flag_name, global_enabled, created_at, updated_at FROM feature_flags ORDER BY flag_name ASC',
    );

    return result.rows.map((row) => ({
      id: row.id,
      flag_name: row.flag_name,
      global_enabled: row.global_enabled,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  } catch (err) {
    console.error('[feature-flags] getAllFeatureFlags failed:', err);
    return [];
  }
}

/**
 * Get feature flag status for a tester (including overrides).
 */
export async function getFeatureFlagStatusForUser(
  tester_id: string,
  flagName: FeatureFlagName,
): Promise<{ enabled: boolean; source: 'user' | 'cohort' | 'global' } | null> {
  await init();
  const pool = db();

  try {
    const result = await pool.query(`
      SELECT f.global_enabled, ffu.enabled as user_enabled, ffc.enabled as cohort_enabled
      FROM feature_flags f
      LEFT JOIN feature_flag_users ffu ON f.id = ffu.flag_id AND ffu.tester_id = $1
      LEFT JOIN feature_flag_cohorts ffc ON f.id = ffc.flag_id
      WHERE f.flag_name = $2
    `, [tester_id, flagName]);

    if (!result.rows[0]) {
      return null;
    }

    const row = result.rows[0];

    if (row.user_enabled !== null) {
      return { enabled: row.user_enabled, source: 'user' };
    }

    if (row.cohort_enabled !== null) {
      return { enabled: row.cohort_enabled, source: 'cohort' };
    }

    return { enabled: row.global_enabled, source: 'global' };
  } catch (err) {
    console.error('[feature-flags] getFeatureFlagStatusForUser failed:', err);
    return null;
  }
}

/**
 * Seed default feature flags into the database (idempotent).
 * Called on app startup to ensure all standard flags exist.
 */
export async function seedDefaultFeatureFlags(): Promise<void> {
  await init();
  const pool = db();

  try {
    // Check if flags already exist
    const existing = await pool.query('SELECT COUNT(*) as count FROM feature_flags');
    if (parseInt(existing.rows[0].count, 10) > 0) {
      return; // Already seeded
    }

    const now = Date.now();

    for (const flagName of DEFAULT_FEATURE_FLAGS) {
      const id = `ff_${crypto.randomBytes(8).toString('base64url')}`;
      await pool.query(
        'INSERT INTO feature_flags (id, flag_name, global_enabled, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)',
        [id, flagName, true, now, now],
      );
    }

    console.log('[feature-flags] Seeded default feature flags');
  } catch (err) {
    console.error('[feature-flags] seedDefaultFeatureFlags failed:', err);
    throw err;
  }
}

/**
 * Remove a user override, falling back to cohort/global setting.
 */
export async function clearUserFeatureOverride(tester_id: string, flagName: FeatureFlagName): Promise<{ ok: true } | { ok: false; reason: string }> {
  await init();
  const pool = db();

  try {
    const flagResult = await pool.query(
      'SELECT id FROM feature_flags WHERE flag_name = $1',
      [flagName],
    );

    if (!flagResult.rows[0]) {
      return { ok: false, reason: 'flag_not_found' };
    }

    await pool.query(
      'DELETE FROM feature_flag_users WHERE flag_id = $1 AND tester_id = $2',
      [flagResult.rows[0].id, tester_id],
    );

    return { ok: true };
  } catch (err) {
    console.error('[feature-flags] clearUserFeatureOverride failed:', err);
    throw err;
  }
}
