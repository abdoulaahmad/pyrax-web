// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

// Configless Tailwind v4 (theme lives in src/styles.css). Single-page app — the
// Node server (server/index.js) serves the built dist/ plus the gated API. team-pyrax
// is self-contained (its own minimal chrome), so it does NOT depend on @pyrax/shared.
export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    // local dev: proxy the API to the Node server (pnpm start) so cookies + fetch work
    proxy: {
      "/api": "http://localhost:8790",
      "/auth": "http://localhost:8790",
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
  },
});
