// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

// Configless Tailwind v4 (no tailwind.config.js — theme lives in src/styles.css).
export default defineConfig({
  plugins: [tailwindcss()],
  // The nav/header/footer + the live network store come from the shared module (single source of
  // truth — the PYRAX navbar never drifts across properties).
  resolve: {
    alias: {
      "@pyrax/shared": fileURLToPath(new URL("../pyrax-shared/src/index.ts", import.meta.url)),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
    // Multi-page: the realtime console (index) + the help/guides hub.
    rollupOptions: {
      input: {
        main: "index.html",
        guides: "guides.html",
      },
    },
  },
});
