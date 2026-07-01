// SPDX-License-Identifier: LicenseRef-Proprietary
import { defineConfig } from "astro/config";
import { loadEnv } from "vite";
import { readFileSync } from "node:fs";
import react from "@astrojs/react";
import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";

// Bake the build's version (from package.json) into the bundle as a compile-time constant so
// GET /healthz can report it at runtime — the container starts via `node`, not `npm run`, so
// process.env.npm_package_version is absent there.
const PKG_VERSION = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")).version;

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
  vite: {
    plugins: [tailwindcss()],
    // Compile-time constant read by src/pages/healthz.ts for the health body's `version`.
    define: { __PORTAL_VERSION__: JSON.stringify(PKG_VERSION) },
    // `pg` MUST load as plain Node CJS — never bundled or dep-optimized by vite. When vite transforms
    // it for SSR, its socket + connection-timeout internals break and `pool.connect()` HANGS FOREVER
    // (never resolves, and connectionTimeoutMillis never fires) — which manifested as "the login just
    // hangs when I hit send code". Externalizing + excluding it from optimize keeps the driver intact.
    ssr: { external: ["pg", "pg-native", "pg-cloudflare"] },
    optimizeDeps: { exclude: ["pg", "pg-native", "pg-cloudflare"] },
  },
  server: { port: 4322, host: true },
});
