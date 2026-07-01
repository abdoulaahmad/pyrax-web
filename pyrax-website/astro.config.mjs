// SPDX-License-Identifier: LicenseRef-Proprietary
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";

// SSR so the marketing site can serve live per-network chain data (src/pages/api/*), localized routes
// (/[lang]/…) resolved server-side, and shareable industry / pitch pages. React islands power the
// animated mega-menu, network selector, language switcher, live-stats, and the interactive pitch deck.
export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
  server: { port: 4325, host: true },
});
