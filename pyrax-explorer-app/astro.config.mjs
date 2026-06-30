// SPDX-License-Identifier: LicenseRef-Proprietary
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";

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
