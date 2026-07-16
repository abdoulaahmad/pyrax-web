// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Certification quiz engine: manages quiz questions, grading, and certification issuance.
// Handles quiz attempts, score tracking, and soulbound certification generation.

import crypto from 'node:crypto';
import { db, init } from './db';
import {
  QUIZ_PASSING_SCORE,
  QUIZ_QUESTIONS_PER_ATTEMPT,
  QUIZ_QUESTIONS_SEED,
  generateCertificationNumber,
  CERTIFICATION_VALIDITY_DAYS,
} from '../lib/onboarding';
import type { QuizQuestion, QuizAttempt, Certification } from '../types/onboarding';
import { testerById } from './db';

/**
 * Get randomized quiz questions for a quiz attempt.
 * Returns QUIZ_QUESTIONS_PER_ATTEMPT questions from the question bank.
 */
export async function getQuizQuestions(tester_id: string): Promise<{ ok: true; questions: QuizQuestion[] } | { ok: false; reason: string }> {
  await init();

  try {
    const tester = await testerById(tester_id);
    if (!tester) return { ok: false, reason: 'tester_not_found' };

    // Check if quiz is available
    if (!tester.training_completed) {
      return { ok: false, reason: 'training_not_complete' };
    }

    if (tester.quiz_passed) {
      return { ok: false, reason: 'already_certified' };
    }

    const pool = db();
    const result = await pool.query('SELECT COUNT(*) as count FROM quiz_questions');
    const totalQuestions = parseInt(result.rows[0].count, 10);

    if (totalQuestions === 0) {
      return { ok: false, reason: 'no_questions_available' };
    }

    // Get random questions
    const questionsResult = await pool.query(`
      SELECT id, question, options, correct_answer, explanation, created_at
      FROM quiz_questions
      ORDER BY RANDOM()
      LIMIT $1
    `, [Math.min(QUIZ_QUESTIONS_PER_ATTEMPT, totalQuestions)]);

    const questions: QuizQuestion[] = questionsResult.rows.map((row) => ({
      id: row.id,
      question: row.question,
      options: row.options,
      correct_answer: row.correct_answer,
      explanation: row.explanation,
      created_at: row.created_at,
    }));

    return { ok: true, questions };
  } catch (err) {
    console.error('[certification] getQuizQuestions failed:', err);
    throw err;
  }
}

/**
 * Submit and grade quiz answers.
 * Calculates score, determines pass/fail, and handles certification issuance if passing.
 */
export async function submitQuizAnswers(
  tester_id: string,
  answers: Record<string, number>,
): Promise<{ ok: true; score: number; passed: boolean; certification_id?: string; explanation?: string } | { ok: false; reason: string }> {
  await init();
  const pool = db();

  try {
    const tester = await testerById(tester_id);
    if (!tester) return { ok: false, reason: 'tester_not_found' };

    if (!tester.training_completed) {
      return { ok: false, reason: 'training_not_complete' };
    }

    if (tester.quiz_passed) {
      return { ok: false, reason: 'already_certified' };
    }

    // Fetch questions to validate answers and calculate score
    const questionIds = Object.keys(answers);
    if (questionIds.length === 0) {
      return { ok: false, reason: 'no_answers_provided' };
    }

    const questionsResult = await pool.query(`
      SELECT id, correct_answer, explanation
      FROM quiz_questions
      WHERE id = ANY($1::text[])
    `, [questionIds]);

    const questionsMap = new Map(questionsResult.rows.map((q: any) => [q.id, q]));

    let correctCount = 0;
    let explanation = '';

    for (const [questionId, userAnswer] of Object.entries(answers)) {
      const question = questionsMap.get(questionId);
      if (!question) continue;

      if (question.correct_answer === userAnswer) {
        correctCount++;
      } else if (!explanation) {
        // Store first explanation for feedback
        explanation = question.explanation;
      }
    }

    const score = Math.round((correctCount / questionIds.length) * 100);
    const passed = score >= QUIZ_PASSING_SCORE;

    // Record attempt
    const now = Date.now();
    const attemptId = `qa_${crypto.randomBytes(8).toString('base64url')}`;

    await pool.query(`
      INSERT INTO quiz_attempts (id, tester_id, score, answers, passed, created_at)
      VALUES ($1, $2, $3, $4::jsonb, $5, $6)
    `, [attemptId, tester_id, score, JSON.stringify(answers), passed, now]);

    // Update tester quiz record
    await pool.query(
      'UPDATE testers SET quiz_score = $1, quiz_attempts = quiz_attempts + 1 WHERE id = $2',
      [score, tester_id],
    );

    let certification_id: string | undefined;

    if (passed) {
      // Issue certification
      const certId = `cert_${crypto.randomBytes(8).toString('base64url')}`;
      const certNumber = generateCertificationNumber();
      const expiresAt = now + CERTIFICATION_VALIDITY_DAYS * 24 * 60 * 60 * 1000;

      await pool.query(`
        INSERT INTO certifications (id, tester_id, cert_number, issued_at, expires_at, status)
        VALUES ($1, $2, $3, $4, $5, 'active')
      `, [certId, tester_id, certNumber, now, expiresAt]);

      // Update tester certification
      await pool.query(
        'UPDATE testers SET quiz_passed = TRUE, certification_id = $1, certification_issued_at = $2 WHERE id = $3',
        [certNumber, now, tester_id],
      );

      certification_id = certNumber;
    }

    return {
      ok: true,
      score,
      passed,
      certification_id,
      explanation: passed ? undefined : explanation,
    };
  } catch (err) {
    console.error('[certification] submitQuizAnswers failed:', err);
    throw err;
  }
}

/**
 * Check if quiz is available for a tester.
 * Available if training is complete and not yet certified.
 */
export async function isQuizAvailable(tester_id: string): Promise<boolean> {
  await init();

  try {
    const tester = await testerById(tester_id);
    if (!tester) return false;

    return tester.training_completed && !tester.quiz_passed;
  } catch (err) {
    console.error('[certification] isQuizAvailable failed:', err);
    return false;
  }
}

/**
 * Get quiz attempt history for a tester.
 * Returns all past attempts ordered by date descending.
 */
export async function getQuizHistory(tester_id: string): Promise<QuizAttempt[]> {
  await init();
  const pool = db();

  try {
    const result = await pool.query(`
      SELECT id, tester_id, score, answers, passed, created_at
      FROM quiz_attempts
      WHERE tester_id = $1
      ORDER BY created_at DESC
    `, [tester_id]);

    return result.rows.map((row) => ({
      id: row.id,
      tester_id: row.tester_id,
      score: row.score,
      answers: row.answers || {},
      passed: row.passed,
      created_at: Number(row.created_at),
    }));
  } catch (err) {
    console.error('[certification] getQuizHistory failed:', err);
    return [];
  }
}

/**
 * Get certification details for a tester.
 */
export async function getCertification(tester_id: string): Promise<Certification | null> {
  await init();
  const pool = db();

  try {
    const result = await pool.query(`
      SELECT id, tester_id, cert_number, issued_at, expires_at, status, revoked_at, revoked_by
      FROM certifications
      WHERE tester_id = $1
    `, [tester_id]);

    if (!result.rows[0]) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      tester_id: row.tester_id,
      cert_number: row.cert_number,
      issued_at: Number(row.issued_at),
      expires_at: row.expires_at ? Number(row.expires_at) : null,
      status: row.status,
      revoked_at: row.revoked_at ? Number(row.revoked_at) : null,
      revoked_by: row.revoked_by,
    };
  } catch (err) {
    console.error('[certification] getCertification failed:', err);
    return null;
  }
}

/**
 * Check if a certification is currently valid.
 * Valid if: status is 'active' and not expired.
 */
export async function isCertificationValid(tester_id: string): Promise<boolean> {
  await init();

  try {
    const cert = await getCertification(tester_id);
    if (!cert) return false;

    if (cert.status !== 'active') return false;
    if (cert.expires_at && cert.expires_at < Date.now()) return false;

    return true;
  } catch (err) {
    console.error('[certification] isCertificationValid failed:', err);
    return false;
  }
}

/**
 * Revoke a certification (admin action).
 */
export async function revokeCertification(tester_id: string, revokedBy: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  await init();
  const pool = db();

  try {
    const cert = await getCertification(tester_id);
    if (!cert) return { ok: false, reason: 'certification_not_found' };

    const now = Date.now();
    await pool.query(
      'UPDATE certifications SET status = $1, revoked_at = $2, revoked_by = $3 WHERE tester_id = $4',
      ['revoked', now, revokedBy, tester_id],
    );

    return { ok: true };
  } catch (err) {
    console.error('[certification] revokeCertification failed:', err);
    throw err;
  }
}

/**
 * Seed quiz questions into the database (idempotent).
 * Called on app startup to ensure question bank exists.
 */
export async function seedQuizQuestions(): Promise<void> {
  await init();
  const pool = db();

  try {
    // Check if questions already exist
    const existing = await pool.query('SELECT COUNT(*) as count FROM quiz_questions');
    if (parseInt(existing.rows[0].count, 10) > 0) {
      return; // Already seeded
    }

    const now = Date.now();

    for (const question of QUIZ_QUESTIONS_SEED) {
      const id = `qq_${crypto.randomBytes(8).toString('base64url')}`;
      await pool.query(`
        INSERT INTO quiz_questions (id, question, options, correct_answer, explanation, created_at)
        VALUES ($1, $2, $3::jsonb, $4, $5, $6)
      `, [id, question.question, JSON.stringify(question.options), question.correct_answer, question.explanation, now]);
    }

    console.log('[certification] Seeded quiz questions');
  } catch (err) {
    console.error('[certification] seedQuizQuestions failed:', err);
    throw err;
  }
}
