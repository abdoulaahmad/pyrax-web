// SPDX-License-Identifier: LicenseRef-Proprietary
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";

// Server output (SSR) so this one app can serve the public marketing pages, the live peer-directory
// ingest + SSE (src/pages/api/*), self-hosted web-push, and the team-controlled open/closed gate.
// React islands (framer-motion + globe.gl) power the animated chrome, network map, and live panels.
export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  integrations: [react()],
  vite: { plugins: [tailwindcss()], ssr: { noExternal: ["globe.gl", "three"] } },
  server: { port: 4323, host: true },
});
