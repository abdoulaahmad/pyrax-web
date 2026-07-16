// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Training engine: manages lesson progression, tracking, and completion validation.
// Handles training enrollment, lesson progress, and training state management.

import crypto from 'node:crypto';
import { db, init } from './db';
import { TRAINING_MODULES } from '../lib/onboarding';
import type { TrainingLesson, TrainingProgress } from '../types/onboarding';
import { testerById } from './db';

/**
 * Get all training lessons with completion status for a tester.
 */
export async function getLessons(tester_id: string): Promise<(TrainingLesson & { completed: boolean; completed_at: number | null })[]> {
  await init();
  const pool = db();

  try {
    const result = await pool.query(`
      SELECT l.id, l.title, l.content, l.lesson_order, l.required_for_cert, l.created_at,
             p.status, p.completed_at
      FROM training_lessons l
      LEFT JOIN training_progress p ON l.id = p.lesson_id AND p.tester_id = $1
      ORDER BY l.lesson_order ASC
    `, [tester_id]);

    return result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      lesson_order: row.lesson_order,
      required_for_cert: row.required_for_cert,
      created_at: row.created_at,
      completed: row.status === 'completed',
      completed_at: row.completed_at,
    }));
  } catch (err) {
    console.error('[training] getLessons failed:', err);
    throw err;
  }
}

/**
 * Get a single lesson with detailed content.
 */
export async function getLesson(tester_id: string, lesson_id: string): Promise<TrainingLesson & { completed: boolean; completed_at: number | null } | null> {
  await init();
  const pool = db();

  try {
    const result = await pool.query(`
      SELECT l.id, l.title, l.content, l.lesson_order, l.required_for_cert, l.created_at,
             p.status, p.completed_at
      FROM training_lessons l
      LEFT JOIN training_progress p ON l.id = p.lesson_id AND p.tester_id = $1
      WHERE l.id = $2
    `, [tester_id, lesson_id]);

    if (!result.rows[0]) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      lesson_order: row.lesson_order,
      required_for_cert: row.required_for_cert,
      created_at: row.created_at,
      completed: row.status === 'completed',
      completed_at: row.completed_at,
    };
  } catch (err) {
    console.error('[training] getLesson failed:', err);
    throw err;
  }
}

/**
 * Start a lesson (mark as in-progress).
 * Idempotent: can be called multiple times without side effects.
 */
export async function startLesson(tester_id: string, lesson_id: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  await init();
  const pool = db();

  try {
    // Check if lesson exists
    const lessonExists = await pool.query('SELECT id FROM training_lessons WHERE id = $1', [lesson_id]);
    if (!lessonExists.rows[0]) {
      return { ok: false, reason: 'lesson_not_found' };
    }

    const now = Date.now();
    const progressId = `tp_${crypto.randomBytes(8).toString('base64url')}`;

    // Insert or update progress
    await pool.query(`
      INSERT INTO training_progress (id, tester_id, lesson_id, status, created_at, updated_at)
      VALUES ($1, $2, $3, 'in_progress', $4, $5)
      ON CONFLICT (tester_id, lesson_id) DO UPDATE
      SET status = 'in_progress', updated_at = $5
    `, [progressId, tester_id, lesson_id, now, now]);

    return { ok: true };
  } catch (err) {
    console.error('[training] startLesson failed:', err);
    throw err;
  }
}

/**
 * Complete a lesson.
 * Validates lesson exists and updates progress accordingly.
 * Automatically advances training progress percentage.
 */
export async function completeLesson(tester_id: string, lesson_id: string): Promise<{ ok: true; progress: number } | { ok: false; reason: string }> {
  await init();
  const pool = db();

  try {
    const tester = await testerById(tester_id);
    if (!tester) return { ok: false, reason: 'tester_not_found' };

    // Check if lesson exists
    const lessonResult = await pool.query('SELECT id, required_for_cert FROM training_lessons WHERE id = $1', [lesson_id]);
    if (!lessonResult.rows[0]) {
      return { ok: false, reason: 'lesson_not_found' };
    }

    const now = Date.now();
    const progressId = `tp_${crypto.randomBytes(8).toString('base64url')}`;

    // Update progress
    await pool.query(`
      INSERT INTO training_progress (id, tester_id, lesson_id, status, completed_at, created_at, updated_at)
      VALUES ($1, $2, $3, 'completed', $4, $5, $6)
      ON CONFLICT (tester_id, lesson_id) DO UPDATE
      SET status = 'completed', completed_at = $4, updated_at = $6
    `, [progressId, tester_id, lesson_id, now, now, now]);

    // Calculate training progress percentage
    const completedResult = await pool.query(`
      SELECT COUNT(*) as completed
      FROM training_progress
      WHERE tester_id = $1 AND status = 'completed'
    `, [tester_id]);

    const completedCount = parseInt(completedResult.rows[0].completed, 10);
    const totalLessons = TRAINING_MODULES.length;
    const progressPercentage = Math.min(Math.round((completedCount / totalLessons) * 100), 100);

    // Update tester training progress
    await pool.query(
      'UPDATE testers SET training_progress = $1 WHERE id = $2',
      [progressPercentage, tester_id],
    );

    return { ok: true, progress: progressPercentage };
  } catch (err) {
    console.error('[training] completeLesson failed:', err);
    throw err;
  }
}

/**
 * Get training completion percentage (0-100).
 */
export async function getTrainingProgress(tester_id: string): Promise<number> {
  await init();
  const pool = db();

  try {
    const result = await pool.query(
      'SELECT training_progress FROM testers WHERE id = $1',
      [tester_id],
    );

    if (!result.rows[0]) return 0;
    return result.rows[0].training_progress || 0;
  } catch (err) {
    console.error('[training] getTrainingProgress failed:', err);
    return 0;
  }
}

/**
 * Check if training is complete.
 * Training is complete when all required lessons are completed.
 */
export async function isTrainingComplete(tester_id: string): Promise<boolean> {
  await init();
  const pool = db();

  try {
    const progress = await getTrainingProgress(tester_id);
    return progress >= 100;
  } catch (err) {
    console.error('[training] isTrainingComplete failed:', err);
    return false;
  }
}

/**
 * Mark training as complete in the tester record.
 * Called after all lessons are finished and before quiz is available.
 */
export async function markTrainingComplete(tester_id: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  await init();
  const pool = db();

  try {
    const isComplete = await isTrainingComplete(tester_id);
    if (!isComplete) {
      return { ok: false, reason: 'training_not_complete' };
    }

    await pool.query(
      'UPDATE testers SET training_completed = TRUE WHERE id = $1',
      [tester_id],
    );

    return { ok: true };
  } catch (err) {
    console.error('[training] markTrainingComplete failed:', err);
    throw err;
  }
}

/**
 * Seed training lessons into the database (idempotent).
 * Called on app startup to ensure all lessons exist.
 */
export async function seedTrainingLessons(): Promise<void> {
  await init();
  const pool = db();

  try {
    // Check if all lessons already exist
    const existing = await pool.query('SELECT COUNT(*) as count FROM training_lessons');
    if (parseInt(existing.rows[0].count, 10) === TRAINING_MODULES.length) {
      return; // Already seeded
    }

    const now = Date.now();

    for (const module of TRAINING_MODULES) {
      await pool.query(`
        INSERT INTO training_lessons (id, title, content, lesson_order, required_for_cert, created_at)
        VALUES ($1, $2, $3::jsonb, $4, $5, $6)
        ON CONFLICT (id) DO NOTHING
      `, [module.id, module.title, JSON.stringify(module.content), module.lesson_order, module.required_for_cert, now]);
    }

    console.log('[training] Seeded training lessons');
  } catch (err) {
    console.error('[training] seedTrainingLessons failed:', err);
    throw err;
  }
}
