// SPDX-License-Identifier: LicenseRef-Proprietary
import { defineConfig } from "astro/config";
import { loadEnv } from "vite";
import react from "@astrojs/react";
import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";

// Bridge the app's .env into process.env for local dev/build. Astro loads .env into import.meta.env,
// but our server code (src/server/*) reads process.env — so without this the DB URLs never arrive
// locally. Real process env vars (production / Docker `environment:`) already exist and take precedence.
for (const [k, v] of Object.entries(loadEnv(process.env.NODE_ENV || "development", process.cwd(), ""))) {
  if (process.env[k] === undefined) process.env[k] = v;
}

// Server output (SSR) so the portal can guard pages + serve the JSON API from Astro endpoints
// (src/pages/api/*). React powers the interactive dashboard islands; Astro renders the shell.
export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
  server: { port: 4322, host: true },
});
