// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";

// Multi-page explorer: every *.html at the project root is a build entry (so adding a page is just
// adding a file — no edits here). The shared PYRAX chrome lives in the sibling ../pyrax-shared package
// and is imported via the "@pyrax/shared" alias (Tailwind scans it via an @source in src/styles.css).
const htmlInputs = Object.fromEntries(
  readdirSync(".")
    .filter((f) => f.endsWith(".html"))
    .map((f) => [f === "index.html" ? "main" : f.replace(/\.html$/, ""), resolve(f)]),
);

export default defineConfig({
  plugins: [tailwindcss()],
  resolve: {
    alias: {
      "@pyrax/shared": resolve("../pyrax-shared/src/index.ts"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
    rollupOptions: { input: htmlInputs },
  },
  server: { port: 5175 },
});
