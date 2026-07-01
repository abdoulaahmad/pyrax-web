// SPDX-License-Identifier: LicenseRef-Proprietary
// Vitest config for the server-side security/robustness unit + integration tests. These cover pure
// logic (HMAC, IP resolution, rate limiter, announce validation) — no Astro runtime / DB needed; pg is
// mocked where a module touches it.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    // Don't let directory.ts's presence-sweep setInterval hold the process open.
    pool: "forks",
  },
});
