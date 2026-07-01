// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Vitest config for the team-portal security/invariant tests. Node environment (we test pure
// crypto/logic, not the DOM); `pg` is mocked in the auth test so no database is needed.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    // Tests that exercise the fail-closed guards mutate process.env.NODE_ENV; isolate per-file.
    clearMocks: true,
    restoreMocks: true,
  },
});
