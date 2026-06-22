// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// The explorer APP SHELL: mounts the shared PYRAX chrome (top mega-nav + the live network selector +
// ⌘K) and the categorized left sidebar, then returns the #main content element for a page to render
// into. The network chosen in the navbar drives every RPC call (see rpc.ts) — switch it and the page
// retargets that chain.

import "../styles.css";
import { mountChrome, DOMAINS, cmdkEntry, icon, type CmdkEntry } from "@pyrax/shared";
import { renderSidebar, wireSidebar, SIDEBAR, OVERVIEW } from "./sidebar.js";

// Explorer pages added to the shared ⌘K palette (surface first, before the marketing destinations).
const SEARCH_ENTRIES: CmdkEntry[] = [
  cmdkEntry(`Explorer · ${OVERVIEW.label}`, OVERVIEW.href, "Explorer", OVERVIEW.icon, "dashboard latest blocks transactions"),
  ...SIDEBAR.flatMap((c) =>
    c.links.map((l) => cmdkEntry(`Explorer · ${l.label}`, l.href, "Explorer", l.icon, c.label.toLowerCase())),
  ),
];

/** Mount chrome + sidebar; returns the #main element for the page to render into. */
export function mountShell(active: string): HTMLElement {
  mountChrome({ navOrigin: DOMAINS.site, homeHref: "/", active: "", searchEntries: SEARCH_ENTRIES });

  const shell = document.getElementById("shell");
  if (!shell) throw new Error("pyrax-explorer: missing #shell mount point");
  shell.className = "expl-shell";
  shell.innerHTML = `
    <button type="button" class="expl-side-mtoggle" data-side-mtoggle aria-expanded="false" aria-controls="sidebar">
      ${icon("menu", "h-5 w-5")}<span>Explorer menu</span>
    </button>
    <div class="expl-side-backdrop" data-side-backdrop hidden></div>
    <aside class="expl-sidebar" id="sidebar" data-sidebar aria-label="Explorer sections">
      ${renderSidebar(active)}
    </aside>
    <main class="expl-main" id="main" tabindex="-1"></main>`;

  wireSidebar();
  wireMobileSidebar();
  return document.getElementById("main")!;
}

function wireMobileSidebar(): void {
  const sidebar = document.querySelector<HTMLElement>("[data-sidebar]");
  const toggle = document.querySelector<HTMLButtonElement>("[data-side-mtoggle]");
  const backdrop = document.querySelector<HTMLElement>("[data-side-backdrop]");
  if (!sidebar || !toggle || !backdrop) return;
  const open = () => {
    sidebar.classList.add("is-open");
    backdrop.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
  };
  const close = () => {
    sidebar.classList.remove("is-open");
    backdrop.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
  };
  toggle.addEventListener("click", () => (sidebar.classList.contains("is-open") ? close() : open()));
  backdrop.addEventListener("click", close);
  sidebar.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("a")) close();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
}
