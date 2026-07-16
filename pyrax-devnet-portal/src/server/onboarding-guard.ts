// SPDX-License-Identifier: LicenseRef-Proprietary
import type { AstroCookies } from "astro";
import { requireTester } from "./guard";
import { getOnboardingState } from "./onboarding";
import { STATE_ORDER } from "../lib/onboarding";
import type { OnboardingStatus } from "../types/onboarding";

export async function requireOnboardingState(cookies: AstroCookies, requiredState: OnboardingStatus) {
  const tester = await requireTester(cookies);
  if (!tester) return null;

  const state = await getOnboardingState(tester.id);
  if (!state) return null;

  const currentIdx = STATE_ORDER.indexOf(state.onboarding_status);
  const reqIdx = STATE_ORDER.indexOf(requiredState);

  if (!tester.is_superuser && currentIdx < reqIdx) {
    console.log(`[guard] failed: current=${state.onboarding_status}(${currentIdx}) < required=${requiredState}(${reqIdx})`);
    return null;
  }

  return { tester, state };
}

export async function requireMission(cookies: AstroCookies, missionId: number) {
  const tester = await requireTester(cookies);
  if (!tester) return null;

  if (!tester.is_superuser && tester.current_mission < missionId) {
    return null;
  }

  return tester;
}

export async function requireCertification(cookies: AstroCookies) {
  const tester = await requireTester(cookies);
  if (!tester) return null;

  if (!tester.is_superuser && !tester.certification_id) {
    return null;
  }

  return tester;
}

export async function requireNodePaired(cookies: AstroCookies) {
  const tester = await requireTester(cookies);
  if (!tester) return null;

  if (!tester.is_superuser && !tester.node_paired) {
    return null;
  }

  return tester;
}
