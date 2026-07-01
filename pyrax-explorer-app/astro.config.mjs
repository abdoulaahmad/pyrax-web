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

// SSR so the explorer can proxy multi-network JSON-RPC, serve indexed data (src/pages/api/*), and
// render shareable block/tx/address pages server-side. React islands power the live dashboard +
// the animated sidebar shell.
export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
  server: { port: 4324, host: true },
});
