// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Vitest config for the team-portal RED-TEAM suite — codified adversarial attack scenarios that assert
// each attack is BLOCKED. Separate from the invariant test config (test/) so the fuzz farm can loop the
// red-team suite continuously (`npm run redteam:watch`) without pulling in the broader unit tests.
//
// Node environment (we exercise pure security logic + the real handlers with the DB/network boundary
// mocked — never the security logic). A PASSING suite means every attack was defeated; a FAILING test
// is a real vulnerability that must be fixed, not weakened.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["redteam/**/*.attack.ts"],
    // Attack files mutate process.env (NODE_ENV, secrets) to probe fail-closed guards; isolate per-file.
    clearMocks: true,
    restoreMocks: true,
    // The farm loops this forever; keep each attack fast + hermetic (no real DB/network).
    testTimeout: 15_000,
  },
});
