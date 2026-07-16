// SPDX-License-Identifier: LicenseRef-Proprietary
import type { APIRoute } from "astro";
import { requireTester } from "../../../../../server/guard";
import { json } from "../../../../../server/http";
import { advanceMission } from "../../../../../server/onboarding";
import { recordMissionCompletion, db, init } from "../../../../../server/db";

export const prerender = false;

export const POST: APIRoute = async ({ params, cookies }) => {
  const me = await requireTester(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);

  const missionId = params.id;
  if (!missionId) return json({ ok: false, error: "Mission ID required." }, 400);
  
  await init();
  const pool = db();
  const missionResult = await pool.query('SELECT mission_number FROM missions WHERE id = $1', [missionId]);
  const mission = missionResult.rows[0];

  if (!mission) return json({ ok: false, error: "Mission not found." }, 404);

  const mNum = mission.mission_number;

  // Validate completion criteria based on the mission number
  if (mNum === 1) {
    if (!me.display_name || me.display_name.trim() === '') {
      return json({ ok: false, error: "Please complete your profile first." }, 400);
    }
  } else if (mNum === 2) {
    if (!me.training_completed) {
      return json({ ok: false, error: "Please complete all training modules first." }, 400);
    }
  } else if (mNum === 3) {
    if (!me.quiz_passed) {
      return json({ ok: false, error: "Please pass the certification quiz first." }, 400);
    }
  }

  // Mark mission as complete in DB
  await recordMissionCompletion(me.id, missionId);
  
  // Advance to next mission
  const advanceResult = await advanceMission(me.id);
  
  return json({ ok: true, mission_id: missionId, advanced: advanceResult.ok, result: advanceResult });
};
