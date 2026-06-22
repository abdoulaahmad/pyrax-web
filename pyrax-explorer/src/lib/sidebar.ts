// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// The explorer's categorized LEFT sidebar. Per-category collapse state is PERSISTED in localStorage
// (survives reloads) and synced across explorer tabs. The active page is highlighted.

import { icon } from "@pyrax/shared";

export type SideLink = { key: string; label: string; href: string; icon: string };
export type SideCat = { id: string; label: string; icon: string; links: SideLink[] };

export const OVERVIEW: SideLink = { key: "overview", label: "Overview", href: "/", icon: "pulse" };

export const SIDEBAR: SideCat[] = [
  {
    id: "blockchain",
    label: "Blockchain",
    icon: "cube",
    links: [
      { key: "blocks", label: "Blocks", href: "/blocks.html", icon: "blocks" },
      { key: "txs", label: "Transactions", href: "/txs.html", icon: "arrow" },
      { key: "logs", label: "Logs & Events", href: "/logs.html", icon: "terminal" },
    ],
  },
  {
    id: "accounts",
    label: "Accounts & Tokens",
    icon: "coin",
    links: [
      { key: "address", label: "Address lookup", href: "/address.html", icon: "search" },
      { key: "tokens", label: "Tokens", href: "/tokens.html", icon: "coin" },
    ],
  },
  {
    id: "contracts",
    label: "Contracts",
    icon: "code",
    links: [
      { key: "contracts", label: "Verified contracts", href: "/contracts.html", icon: "check" },
      { key: "verify", label: "Verify contract", href: "/verify.html", icon: "shield" },
    ],
  },
  {
    id: "network",
    label: "Network",
    icon: "globe",
    links: [
      { key: "network", label: "Network info", href: "/network.html", icon: "server" },
      { key: "gas", label: "Gas tracker", href: "/gas.html", icon: "flame" },
    ],
  },
  {
    id: "tools",
    label: "Tools",
    icon: "terminal",
    links: [{ key: "rpc", label: "RPC playground", href: "/rpc.html", icon: "terminal" }],
  },
];

const COLLAPSE_KEY = "pyrax-explorer:collapsed-cats";

const readCollapsed = (): Set<string> => {
  try {
    return new Set(JSON.parse(localStorage.getItem(COLLAPSE_KEY) || "[]") as string[]);
  } catch {
    return new Set();
  }
};
const writeCollapsed = (s: Set<string>): void => {
  try {
    localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...s]));
  } catch {
    /* private mode — non-fatal */
  }
};

const linkHtml = (l: SideLink, active: string): string => {
  const on = l.key === active;
  return `
    <a href="${l.href}" class="expl-side-link${on ? " is-active" : ""}"${on ? ' aria-current="page"' : ""}>
      <span class="expl-side-ic">${icon(l.icon, "h-4 w-4")}</span>
      <span class="expl-side-label">${l.label}</span>
    </a>`;
};

export function renderSidebar(active: string): string {
  const collapsed = readCollapsed();
  const top = `<div class="expl-side-top">${linkHtml(OVERVIEW, active)}</div>`;
  const cats = SIDEBAR.map((cat) => {
    const isCollapsed = collapsed.has(cat.id);
    const items = cat.links.map((l) => linkHtml(l, active)).join("");
    return `
      <div class="expl-side-cat${isCollapsed ? " is-collapsed" : ""}" data-cat="${cat.id}">
        <button type="button" class="expl-side-cathead" data-cat-toggle aria-expanded="${!isCollapsed}" aria-controls="cat-${cat.id}">
          <span class="expl-side-ic">${icon(cat.icon, "h-4 w-4")}</span>
          <span class="expl-side-catlabel">${cat.label}</span>
          ${icon("chevron", "expl-side-chev h-4 w-4")}
        </button>
        <div class="expl-side-items" id="cat-${cat.id}" role="group" aria-label="${cat.label}">
          <div class="expl-side-items-inner">${items}</div>
        </div>
      </div>`;
  }).join("");
  return top + cats;
}

/** Wire per-category collapse (persisted + cross-tab synced). Call after renderSidebar is in the DOM. */
export function wireSidebar(): void {
  const collapsed = readCollapsed();
  document.querySelectorAll<HTMLElement>("[data-cat]").forEach((catEl) => {
    const id = catEl.dataset.cat ?? "";
    const btn = catEl.querySelector<HTMLButtonElement>("[data-cat-toggle]");
    btn?.addEventListener("click", () => {
      const nowCollapsed = catEl.classList.toggle("is-collapsed");
      btn.setAttribute("aria-expanded", String(!nowCollapsed));
      if (nowCollapsed) collapsed.add(id);
      else collapsed.delete(id);
      writeCollapsed(collapsed);
    });
  });
  window.addEventListener("storage", (e) => {
    if (e.key !== COLLAPSE_KEY) return;
    const next = readCollapsed();
    document.querySelectorAll<HTMLElement>("[data-cat]").forEach((catEl) => {
      const c = next.has(catEl.dataset.cat ?? "");
      catEl.classList.toggle("is-collapsed", c);
      catEl.querySelector("[data-cat-toggle]")?.setAttribute("aria-expanded", String(!c));
    });
  });
}
