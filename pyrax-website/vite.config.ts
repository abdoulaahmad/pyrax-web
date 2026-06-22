// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

// Configless Tailwind v4 (no tailwind.config.js — the theme lives in src/styles.css).
// Multi-page marketing site: a flagship home + deep pages reached from the mega menu. Inputs are
// resolved relative to the project root, so no node:path / __dirname is needed.
export default defineConfig({
  plugins: [tailwindcss()],
  resolve: {
    // The shared PYRAX chrome (mega-menu nav + live network selector + ⌘K) lives in the sibling
    // @pyrax/shared package, imported via this alias so this site can never drift from the others.
    // (Tailwind scans the shared chrome via an @source in src/styles.css.)
    alias: { "@pyrax/shared": resolve("../pyrax-shared/src/index.ts") },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
    rollupOptions: {
      input: {
        main: "index.html",
        network: "network.html",
        architecture: "architecture.html",
        neurax: "neurax.html",
        token: "token.html",
        build: "build.html",
        docs: "docs.html",
        node: "node.html",
        useCases: "use-cases.html",
        ecosystem: "ecosystem.html",
        roadmap: "roadmap.html",
        security: "security.html",
        company: "company.html",
        whitepaper: "whitepaper.html",
      },
    },
  },
});
