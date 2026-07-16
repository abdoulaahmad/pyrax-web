// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Mission system: structured progression framework for participants.
// Manages mission definitions, progress tracking, and completion validation.

import crypto from 'node:crypto';
import { db, init } from './db';
import { MISSIONS_SEED } from '../lib/onboarding';
import type { Mission, MissionProgress } from '../types/onboarding';
import { testerById, recordErrorReport } from './db';

/**
 * Get all missions with progress for a tester.
 */
export async function getMissions(tester_id: string): Promise<(Mission & { progress: MissionProgress | null })[]> {
  await init();
  const pool = db();

  try {
    const result = await pool.query(`
      SELECT m.id, m.mission_number, m.title, m.description, m.prerequisites, m.completion_criteria,
             m.unlock_conditions, m.created_at, p.id as progress_id, p.status, p.progress_data, p.completed_at,
             p.created_at as progress_created_at, p.updated_at
      FROM missions m
      LEFT JOIN mission_progress p ON m.id = p.mission_id AND p.tester_id = $1
      ORDER BY m.mission_number ASC
    `, [tester_id]);

    return result.rows.map((row) => ({
      id: row.id,
      mission_number: row.mission_number,
      title: row.title,
      description: row.description,
      prerequisites: row.prerequisites || [],
      completion_criteria: row.completion_criteria || {},
      unlock_conditions: row.unlock_conditions || {},
      created_at: Number(row.created_at),
      progress: row.progress_id ? {
        id: row.progress_id,
        tester_id,
        mission_id: row.id,
        status: row.status,
        progress_data: row.progress_data || {},
        completed_at: row.completed_at ? Number(row.completed_at) : null,
        created_at: Number(row.progress_created_at),
        updated_at: Number(row.updated_at),
      } : null,
    }));
  } catch (err: any) {
    console.error('[missions] getMissions failed:', err);
    void recordErrorReport({ source: 'missions.ts', title: 'getMissions failed', detail: err?.stack || String(err), level: 'error' });
    throw err;
  }
}

/**
 * Get status of a specific mission for a tester.
 */
export async function getMissionStatus(tester_id: string, mission_id: string): Promise<(Mission & { progress: MissionProgress | null }) | null> {
  await init();
  const pool = db();

  try {
    const result = await pool.query(`
      SELECT m.id, m.mission_number, m.title, m.description, m.prerequisites, m.completion_criteria,
             m.unlock_conditions, m.created_at, p.id as progress_id, p.status, p.progress_data, p.completed_at,
             p.created_at as progress_created_at, p.updated_at
      FROM missions m
      LEFT JOIN mission_progress p ON m.id = p.mission_id AND p.tester_id = $1
      WHERE m.id = $2
    `, [tester_id, mission_id]);

    if (!result.rows[0]) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      mission_number: row.mission_number,
      title: row.title,
      description: row.description,
      prerequisites: row.prerequisites || [],
      completion_criteria: row.completion_criteria || {},
      unlock_conditions: row.unlock_conditions || {},
      created_at: Number(row.created_at),
      progress: row.progress_id ? {
        id: row.progress_id,
        tester_id,
        mission_id: row.id,
        status: row.status,
        progress_data: row.progress_data || {},
        completed_at: row.completed_at ? Number(row.completed_at) : null,
        created_at: Number(row.progress_created_at),
        updated_at: Number(row.updated_at),
      } : null,
    };
  } catch (err: any) {
    console.error('[missions] getMissionStatus failed:', err);
    void recordErrorReport({ source: 'missions.ts', title: 'getMissionStatus failed', detail: err?.stack || String(err), level: 'error' });
    throw err;
  }
}

/**
 * Check if a mission is unlocked for a tester.
 * A mission is unlocked if all its prerequisites are completed.
 */
export async function isMissionUnlocked(tester_id: string, mission_number: number): Promise<boolean> {
  await init();
  const pool = db();

  try {
    // Get mission details
    const missionResult = await pool.query(
      'SELECT prerequisites FROM missions WHERE mission_number = $1',
      [mission_number],
    );

    if (!missionResult.rows[0]) return false;

    const prerequisites = missionResult.rows[0].prerequisites || [];

    // If no prerequisites, mission is always unlocked
    if (prerequisites.length === 0) return true;

    // Check if all prerequisite missions are completed
    const prequisiteNumbers = prerequisites as number[];
    const completedResult = await pool.query(`
      SELECT COUNT(*) as completed
      FROM missions m
      JOIN mission_progress p ON m.id = p.mission_id
      WHERE m.mission_number = ANY($1::int[])
        AND p.tester_id = $2
        AND p.status = 'completed'
    `, [prequisiteNumbers, tester_id]);

    const completedCount = parseInt(completedResult.rows[0].completed, 10);
    return completedCount === prequisiteNumbers.length;
  } catch (err: any) {
    console.error('[missions] isMissionUnlocked failed:', err);
    void recordErrorReport({ source: 'missions.ts', title: 'isMissionUnlocked failed', detail: err?.stack || String(err), level: 'error' });
    return false;
  }
}

/**
 * Complete a mission.
 * Validates prerequisites and completion criteria before marking as complete.
 */
export async function completeMission(
  tester_id: string,
  mission_id: string,
): Promise<{ ok: true; next_mission_number?: number } | { ok: false; reason: string }> {
  await init();
  const pool = db();

  try {
    const tester = await testerById(tester_id);
    if (!tester) return { ok: false, reason: 'tester_not_found' };

    // Get mission
    const missionResult = await pool.query(
      'SELECT id, mission_number, prerequisites, completion_criteria FROM missions WHERE id = $1',
      [mission_id],
    );

    if (!missionResult.rows[0]) return { ok: false, reason: 'mission_not_found' };

    const mission = missionResult.rows[0];

    // Check if mission is unlocked
    const unlocked = await isMissionUnlocked(tester_id, mission.mission_number);
    if (!unlocked) {
      return { ok: false, reason: 'prerequisites_not_met' };
    }

    // Validate completion criteria (basic checks)
    const criteria = mission.completion_criteria || {};
    let meetsRequirements = true;

    if (criteria.display_name && !tester.display_name) meetsRequirements = false;
    if (criteria.handle && !tester.handle) meetsRequirements = false;
    if (criteria.payout_wallet && !tester.payout_wallet) meetsRequirements = false;
    if (criteria.all_lessons_completed && !tester.training_completed) meetsRequirements = false;
    if (criteria.quiz_passed && !tester.quiz_passed) meetsRequirements = false;
    if (criteria.node_downloaded && !tester.node_downloaded) meetsRequirements = false;
    if (criteria.node_paired && !tester.node_paired) meetsRequirements = false;
    if (criteria.score_gte && tester.quiz_score < criteria.score_gte) meetsRequirements = false;

    if (!meetsRequirements) {
      return { ok: false, reason: 'completion_criteria_not_met' };
    }

    const now = Date.now();
    const progressId = `mp_${crypto.randomBytes(8).toString('base64url')}`;

    // Mark mission as complete
    await pool.query(`
      INSERT INTO mission_progress (id, tester_id, mission_id, status, completed_at, created_at, updated_at)
      VALUES ($1, $2, $3, 'completed', $4, $5, $6)
      ON CONFLICT (tester_id, mission_id) DO UPDATE
      SET status = 'completed', completed_at = $4, updated_at = $6
    `, [progressId, tester_id, mission_id, now, now, now]);

    // Check if there's a next mission
    const nextMissionResult = await pool.query(
      'SELECT mission_number FROM missions WHERE mission_number = $1',
      [mission.mission_number + 1],
    );

    const next_mission_number = nextMissionResult.rows[0] ? mission.mission_number + 1 : undefined;

    // Update tester's current mission if this was their current mission
    if (tester.current_mission === mission.mission_number && next_mission_number) {
      await pool.query(
        'UPDATE testers SET current_mission = $1 WHERE id = $2',
        [next_mission_number, tester_id],
      );
    }

    return { ok: true, next_mission_number };
  } catch (err: any) {
    console.error('[missions] completeMission failed:', err);
    void recordErrorReport({ source: 'missions.ts', title: 'completeMission failed', detail: err?.stack || String(err), level: 'error' });
    throw err;
  }
}

/**
 * Get the current mission target (next incomplete mission).
 */
export async function getCurrentMissionTarget(tester_id: string): Promise<(Mission & { progress: MissionProgress | null }) | null> {
  await init();
  const pool = db();

  try {
    const tester = await testerById(tester_id);
    if (!tester) return null;

    const missionNumber = tester.current_mission || 1;

    const result = await pool.query(`
      SELECT m.id, m.mission_number, m.title, m.description, m.prerequisites, m.completion_criteria,
             m.unlock_conditions, m.created_at, p.id as progress_id, p.status, p.progress_data, p.completed_at,
             p.created_at as progress_created_at, p.updated_at
      FROM missions m
      LEFT JOIN mission_progress p ON m.id = p.mission_id AND p.tester_id = $1
      WHERE m.mission_number = $2
    `, [tester_id, missionNumber]);

    if (!result.rows[0]) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      mission_number: row.mission_number,
      title: row.title,
      description: row.description,
      prerequisites: row.prerequisites || [],
      completion_criteria: row.completion_criteria || {},
      unlock_conditions: row.unlock_conditions || {},
      created_at: Number(row.created_at),
      progress: row.progress_id ? {
        id: row.progress_id,
        tester_id,
        mission_id: row.id,
        status: row.status,
        progress_data: row.progress_data || {},
        completed_at: row.completed_at ? Number(row.completed_at) : null,
        created_at: Number(row.progress_created_at),
        updated_at: Number(row.updated_at),
      } : null,
    };
  } catch (err: any) {
    console.error('[missions] getCurrentMissionTarget failed:', err);
    void recordErrorReport({ source: 'missions.ts', title: 'getCurrentMissionTarget failed', detail: err?.stack || String(err), level: 'error' });
    return null;
  }
}

/**
 * Get count of completed missions for a tester.
 */
export async function getCompletedMissionCount(tester_id: string): Promise<number> {
  await init();
  const pool = db();

  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM mission_progress WHERE tester_id = $1 AND status = $2',
      [tester_id, 'completed'],
    );

    return parseInt(result.rows[0].count, 10);
  } catch (err: any) {
    console.error('[missions] getCompletedMissionCount failed:', err);
    void recordErrorReport({ source: 'missions.ts', title: 'getCompletedMissionCount failed', detail: err?.stack || String(err), level: 'error' });
    return 0;
  }
}

/**
 * Seed missions into the database (idempotent).
 * Called on app startup to ensure all 8 missions exist.
 */
export async function seedMissions(): Promise<void> {
  await init();
  const pool = db();

  try {
    // Check if missions already exist
    const existing = await pool.query('SELECT COUNT(*) as count FROM missions');
    if (parseInt(existing.rows[0].count, 10) > 0) {
      return; // Already seeded
    }

    const now = Date.now();

    for (const mission of MISSIONS_SEED) {
      const id = `m_${crypto.randomBytes(8).toString('base64url')}`;
      await pool.query(`
        INSERT INTO missions (id, mission_number, title, description, prerequisites, completion_criteria,
          unlock_conditions, created_at)
        VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8)
      `, [
        id,
        mission.mission_number,
        mission.title,
        mission.description,
        JSON.stringify(mission.prerequisites),
        JSON.stringify(mission.completion_criteria),
        JSON.stringify(mission.unlock_conditions),
        now,
      ]);
    }

    console.log('[missions] Seeded missions');
  } catch (err: any) {
    console.error('[missions] seedMissions failed:', err);
    void recordErrorReport({ source: 'missions.ts', title: 'seedMissions failed', detail: err?.stack || String(err), level: 'error' });
    throw err;
  }
}
