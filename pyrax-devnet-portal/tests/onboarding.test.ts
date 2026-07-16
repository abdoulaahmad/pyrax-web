// SPDX-License-Identifier: LicenseRef-Proprietary
import { describe, it, expect } from "vitest";
import {
  isValidTransition,
  getNextState,
  canAccessFeatureByState,
  generateCertificationNumber,
  isValidOnboardingStatus,
  isFinalState,
  isTrainingState,
  isCertificationRequired,
  isNodeOperationState,
  ONBOARDING_STATES
} from "../src/lib/onboarding";

describe("State Transition Rules", () => {
  it("allows staying in the same state", () => {
    expect(isValidTransition("REGISTERED", "REGISTERED")).toBe(true);
    expect(isValidTransition("TESTING", "TESTING")).toBe(true);
  });

  it("allows only strictly next sequential progression", () => {
    expect(isValidTransition("REGISTERED", "PROFILE_COMPLETE")).toBe(true);
    expect(isValidTransition("TRAINING", "QUIZ")).toBe(true);
    expect(isValidTransition("NODE_DOWNLOAD", "NODE_PAIRED")).toBe(true);
    
    // Cannot skip states
    expect(isValidTransition("REGISTERED", "TRAINING")).toBe(false);
    expect(isValidTransition("TRAINING", "CERTIFIED")).toBe(false);

    // Cannot go backwards
    expect(isValidTransition("QUIZ", "TRAINING")).toBe(false);
    expect(isValidTransition("NODE_PAIRED", "NODE_DOWNLOAD")).toBe(false);
  });

  it("handles getNextState correctly", () => {
    expect(getNextState("REGISTERED")).toBe("PROFILE_COMPLETE");
    expect(getNextState("NODE_DOWNLOAD")).toBe("NODE_PAIRED");
    expect(getNextState("COMPLETED")).toBeNull();
  });
});

describe("Feature Access by State", () => {
  it("resolves training access", () => {
    expect(canAccessFeatureByState("training", "REGISTERED")).toBe(false);
    expect(canAccessFeatureByState("training", "PROFILE_COMPLETE")).toBe(true);
    expect(canAccessFeatureByState("training", "TRAINING")).toBe(true);
  });

  it("resolves download access", () => {
    expect(canAccessFeatureByState("download", "QUIZ")).toBe(false);
    expect(canAccessFeatureByState("download", "CERTIFIED")).toBe(true);
    expect(canAccessFeatureByState("download", "TESTING")).toBe(true);
  });
});

describe("Certification Utils", () => {
  it("generates valid certification numbers", () => {
    const cert1 = generateCertificationNumber();
    const cert2 = generateCertificationNumber();
    
    expect(cert1.startsWith("CERT-")).toBe(true);
    expect(cert1).not.toBe(cert2);
  });
});

describe("State Type Checkers", () => {
  it("validates onboarding states", () => {
    expect(isValidOnboardingStatus("REGISTERED")).toBe(true);
    expect(isValidOnboardingStatus("NOT_A_STATE")).toBe(false);
  });

  it("checks if state is final", () => {
    expect(isFinalState("COMPLETED")).toBe(true);
    expect(isFinalState("TESTING")).toBe(false);
  });

  it("checks training states", () => {
    expect(isTrainingState("TRAINING")).toBe(true);
    expect(isTrainingState("QUIZ")).toBe(true);
    expect(isTrainingState("CERTIFIED")).toBe(false);
  });

  it("checks if certification is required", () => {
    expect(isCertificationRequired("QUIZ")).toBe(false);
    expect(isCertificationRequired("CERTIFIED")).toBe(true);
    expect(isCertificationRequired("TESTING")).toBe(true);
  });

  it("checks node operation states", () => {
    expect(isNodeOperationState("CERTIFIED")).toBe(false);
    expect(isNodeOperationState("NODE_DOWNLOAD")).toBe(true);
    expect(isNodeOperationState("TESTING")).toBe(true);
  });
});
