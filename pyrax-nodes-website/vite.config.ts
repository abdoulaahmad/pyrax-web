// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

// Configless Tailwind v4. The shared PYRAX chrome (mega-menu nav + live network selector + ⌘K) is the
// sibling @pyrax/shared package, imported via this alias so the nodes site can never drift from the
// other properties. (Tailwind scans the shared chrome via an @source in src/styles.css.)
export default defineConfig({
  plugins: [tailwindcss()],
  resolve: {
    alias: { "@pyrax/shared": resolve("../pyrax-shared/src/index.ts") },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
    rollupOptions: {
      input: {
        main: "index.html",
        run: "run.html",
        changelog: "changelog.html",
      },
    },
  },
});
