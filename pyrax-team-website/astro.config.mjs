// SPDX-License-Identifier: LicenseRef-Proprietary
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";

// Server output (SSR) so the portal can guard pages + serve the JSON API from Astro endpoints
// (src/pages/api/*). React powers the interactive dashboard islands; Astro renders the shell.
export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
  server: { port: 4321, host: true },
});
