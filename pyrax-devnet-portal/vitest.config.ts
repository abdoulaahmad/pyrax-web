// SPDX-License-Identifier: LicenseRef-Proprietary
// Vitest config for the portal's unit/integration tests. We deliberately test PURE modules (RBAC,
// OTP crypto, chat-token sign/verify, rate limiting) that don't require a live Postgres — the DB
// layer is exercised separately. Node environment; tests live in tests/.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: false,
  },
});
