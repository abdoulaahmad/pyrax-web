// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Vitest config built on Astro's Vite pipeline (getViteConfig) so the integration tests can import
// the server data layer (TS) AND render .astro pages via the Astro container API with the real
// Astro + Tailwind + React transforms applied.
import { getViteConfig } from "astro/config";

export default getViteConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    // The render smoke test boots the Astro container; give it room on a cold machine.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
