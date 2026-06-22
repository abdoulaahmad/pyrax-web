// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// The ⌘K command palette — the shared navigational quick-jump. A single accessible dialog (combobox
// + listbox) that fuzzy-searches a CORE set of cross-property destinations PLUS any extra entries the
// consuming site passes in (e.g. the explorer's own pages). Opens on ⌘K / Ctrl-K, on "/" (when not
// typing), or via any [data-cmdk-open] trigger. Keyboard: ↑/↓ move, ↵ opens, Esc closes.
//
// Links are origin-resolved (resolveHref) so on a subdomain the marketing destinations point at the
// main site while the consumer's own entries stay local.

import { icon } from "./ui.js";
import { lockScroll, unlockScroll } from "./scroll-lock.js";
import { resolveHref } from "./config.js";

export type CmdkEntry = { title: string; href: string; group: string; icon: string; hay: string };

/** Build a palette entry (keywords fold into the fuzzy haystack). */
export function cmdkEntry(title: string, href: string, group: string, ic: string, keywords = ""): CmdkEntry {
  return { title, href, group, icon: ic, hay: `${title} ${keywords} ${group}`.toLowerCase() };
}

// Core cross-property destinations (always present, on every site).
const CORE: CmdkEntry[] = [
  cmdkEntry("Home", "/", "PYRAX", "flame", "overview start pyrax marketing site"),
  cmdkEntry("Network", "/network.html", "Network", "lanes", "consensus mining privacy mesh ghostdag tristream"),
  cmdkEntry("Develop / Docs", "/docs.html", "Develop", "book", "documentation guides reference api json-rpc evm wasm cairo"),
  cmdkEntry("Build & code examples", "/build.html", "Develop", "code", "solidity foundry viem ethers wasm rust cairo quickstart"),
  cmdkEntry("NEURAX AI", "/neurax.html", "NEURAX", "chip", "ai gpu local marketplace inference image audio video spatial copilot"),
  cmdkEntry("Token (PYRX)", "/token.html", "Token", "coin", "tokenomics supply emissions staking fees genesis burn cap"),
  cmdkEntry("Run a Node", "/node.html", "Develop", "server", "inferno cli mine stake relay verify full earn"),
  cmdkEntry("Roadmap & status", "/roadmap.html", "Resources", "map", "live building next shipped honest"),
  cmdkEntry("Block explorer", "https://explorer.pyraxchain.com", "Resources", "globe", "blocks transactions address contract"),
  cmdkEntry("Live peers", "https://peers.pyraxchain.com", "Resources", "pulse", "directory nodes network"),
];

let mounted = false;
let INDEX: CmdkEntry[] = [];
let DEFAULTS: CmdkEntry[] = [];

function rank(q: string): CmdkEntry[] {
  const query = q.trim().toLowerCase();
  if (!query) return DEFAULTS;
  const terms = query.split(/\s+/).filter(Boolean);
  const scored: { e: CmdkEntry; s: number }[] = [];
  for (const e of INDEX) {
    if (!terms.every((t) => e.hay.includes(t))) continue;
    const t = e.title.toLowerCase();
    let s = 0;
    if (t === query) s += 1000;
    else if (t.startsWith(query)) s += 300;
    else if (t.includes(query)) s += 160;
    for (const term of terms) {
      const idx = t.indexOf(term);
      if (idx === 0) s += 45;
      else if (idx > 0) s += 28;
      else s += 8;
    }
    s += Math.max(0, 22 - e.title.length / 4);
    scored.push({ e, s });
  }
  scored.sort((a, b) => b.s - a.s || a.e.title.length - b.e.title.length);
  return scored.slice(0, 12).map((x) => x.e);
}

/**
 * Create the command-palette dialog (once) and wire all open/close/keyboard behaviour.
 * @param extra  Site-specific entries (shown first in the default surface) merged into the index.
 */
export function mountCommandPalette(extra: CmdkEntry[] = []): void {
  if (mounted || document.getElementById("cmdk")) return;
  mounted = true;

  INDEX = [...extra, ...CORE];
  // Default surface (empty query): the consumer's own entries first, then the top core destinations.
  DEFAULTS = [...extra.slice(0, 8), ...CORE.slice(0, Math.max(0, 8 - Math.min(extra.length, 8)))].slice(0, 10);

  const root = document.createElement("div");
  root.id = "cmdk";
  root.className = "cmdk hidden";
  root.setAttribute("aria-hidden", "true");
  root.innerHTML = `
    <div class="cmdk-overlay" data-cmdk-close></div>
    <div class="cmdk-panel" role="dialog" aria-modal="true" aria-label="Search PYRAX">
      <div class="cmdk-inputrow">
        ${icon("search", "h-5 w-5 shrink-0 text-[var(--color-brand-soft)]")}
        <input id="cmdk-input" type="text" class="cmdk-input" role="combobox" aria-expanded="true"
          aria-controls="cmdk-list" aria-autocomplete="list" autocomplete="off" autocapitalize="off"
          spellcheck="false" placeholder="Search PYRAX — pages, explorer, docs…" />
        <kbd class="cmdk-esc">Esc</kbd>
      </div>
      <div id="cmdk-list" class="cmdk-list" role="listbox" aria-label="Results"></div>
      <div class="cmdk-foot">
        <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
        <span><kbd>↵</kbd> open</span>
        <span><kbd>esc</kbd> close</span>
        <span class="cmdk-foot-brand">PYRAX</span>
      </div>
    </div>`;
  document.body.appendChild(root);

  const input = root.querySelector<HTMLInputElement>("#cmdk-input")!;
  const list = root.querySelector<HTMLDivElement>("#cmdk-list")!;
  let results: CmdkEntry[] = [];
  let active = 0;
  let lastFocused: HTMLElement | null = null;

  const render = () => {
    results = rank(input.value);
    active = 0;
    input.setAttribute("aria-expanded", String(results.length > 0));
    if (results.length === 0) {
      list.innerHTML = `<div class="cmdk-empty">No matches for “${input.value.replace(/[<&]/g, "")}”. Try “block”, “EVM”, “NEURAX”, or “roadmap”.</div>`;
      input.removeAttribute("aria-activedescendant");
      return;
    }
    list.innerHTML = results
      .map(
        (e, i) => `
        <a role="option" id="cmdk-opt-${i}" href="${resolveHref(e.href)}" data-idx="${i}"
           class="cmdk-opt${i === 0 ? " cmdk-active" : ""}">
          <span class="cmdk-opt-ic">${icon(e.icon, "h-4 w-4")}</span>
          <span class="cmdk-opt-title">${e.title}</span>
          <span class="cmdk-opt-group">${e.group}</span>
        </a>`,
      )
      .join("");
    input.setAttribute("aria-activedescendant", "cmdk-opt-0");
  };

  const setActive = (i: number) => {
    const opts = Array.from(list.querySelectorAll<HTMLElement>(".cmdk-opt"));
    if (opts.length === 0) return;
    active = (i + opts.length) % opts.length;
    opts.forEach((o, idx) => o.classList.toggle("cmdk-active", idx === active));
    const el = opts[active];
    if (!el) return;
    input.setAttribute("aria-activedescendant", el.id);
    el.scrollIntoView({ block: "nearest" });
  };

  const open = () => {
    if (!root.classList.contains("hidden")) return;
    lastFocused = document.activeElement as HTMLElement;
    root.classList.remove("hidden");
    root.setAttribute("aria-hidden", "false");
    lockScroll();
    input.value = "";
    render();
    requestAnimationFrame(() => input.focus());
  };
  const close = () => {
    if (root.classList.contains("hidden")) return;
    root.classList.add("hidden");
    root.setAttribute("aria-hidden", "true");
    unlockScroll();
    lastFocused?.focus?.();
  };

  input.addEventListener("input", render);
  root.querySelectorAll("[data-cmdk-close]").forEach((el) => el.addEventListener("click", close));
  list.addEventListener("mousemove", (e) => {
    const opt = (e.target as HTMLElement).closest<HTMLElement>(".cmdk-opt");
    if (opt) setActive(Number(opt.dataset.idx));
  });
  list.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest(".cmdk-opt")) close();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(active + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(active - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const el = list.querySelectorAll<HTMLAnchorElement>(".cmdk-opt")[active];
      if (el) {
        const href = el.getAttribute("href")!;
        close();
        window.location.assign(href);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  });

  window.addEventListener("hashchange", close);
  window.addEventListener("popstate", close);

  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      root.classList.contains("hidden") ? open() : close();
      return;
    }
    const tgt = e.target as HTMLElement | null;
    const typing = /^(input|textarea|select)$/i.test(tgt?.tagName || "") || tgt?.isContentEditable === true;
    if (e.key === "/" && !typing && root.classList.contains("hidden")) {
      e.preventDefault();
      open();
    }
  });
  document.querySelectorAll("[data-cmdk-open]").forEach((el) =>
    el.addEventListener("click", (e) => {
      e.preventDefault();
      open();
    }),
  );
}
