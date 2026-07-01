// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Vitest config for the devnet tester-portal RED-TEAM suite — codified adversarial attack scenarios
// that assert each attack is BLOCKED, designed to loop continuously on the fuzz farm. Exercises the
// REAL handlers/functions with only the DB/network boundary mocked (never the security logic). A
// PASSING suite means every attack was defeated; a FAILING test is a real vulnerability to fix.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["redteam/**/*.attack.ts"],
    clearMocks: true,
    restoreMocks: true,
    testTimeout: 15_000,
  },
});
