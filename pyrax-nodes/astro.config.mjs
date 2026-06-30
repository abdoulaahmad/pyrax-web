// SPDX-License-Identifier: LicenseRef-Proprietary
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";

// Server output (SSR) so this one app can serve the public marketing pages, the live peer-directory
// ingest (src/pages/api/*), self-hosted web-push, and the team-controlled open/closed gate. React
// islands power the animated chrome and the live panels; the network map is a client-only d3-geo
// canvas (2D/3D) with the world topojson bundled locally — no third-party CDN at runtime.
export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
  server: { port: 4323, host: true },
});
