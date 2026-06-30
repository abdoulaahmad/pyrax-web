// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// The shared site chrome — the navigational heartbeat of PYRAX. A sticky glass header with:
//   • an animated phoenix logo (ember glow + hover flare),
//   • a live network SELECTOR dropdown (all networks + green/red live status dots; see network-store.ts),
//   • a ⌘K command-palette trigger (see search.ts),
//   • premium full-width MEGA panels (glowing item tiles + a featured spotlight card),
//   • a richer mobile drawer (search + status + Disclosure accordions),
// plus the footer and the reveal-on-scroll observer. Rendered once, reused on every page.
// Pure DOM + the brand utilities in styles.css. All motion respects prefers-reduced-motion.

import { MEGA, NAV, LINKS, SITE, NETWORKS } from "./content.js";
import type { Mega } from "./content.js";
import { icon } from "./ui.js";
import { mountCommandPalette, type CmdkEntry } from "./search.js";
import { lockScroll, unlockScroll } from "./scroll-lock.js";
import { startNetworkPolling, setSelectedNetwork, subscribe as subscribeNetwork } from "./network-store.js";
import type { NetSnapshot } from "./network-store.js";
import { configureChrome, getNavOrigin, getHomeHref } from "./config.js";

const toneOrb = (tone: string) => (tone === "bolt" ? "icon-orb-bolt" : tone === "violet" ? "icon-orb-violet" : "");
const toneVar = (tone: string) =>
  tone === "bolt" ? "var(--color-bolt)" : tone === "violet" ? "var(--color-violet)" : "var(--color-brand)";

/** The featured spotlight card for a panel (curated highlight + CTA). */
function spotlightHtml(s: NonNullable<Mega["spotlight"]>): string {
  return `
    <a href="${s.href}" class="mega-spotlight group" style="--sp:${toneVar(s.tone)}">
      <span class="mega-spotlight-bg" aria-hidden="true"></span>
      <span class="relative block">
        <span class="icon-orb ${toneOrb(s.tone)} !h-11 !w-11">${icon(s.icon, "h-5 w-5")}</span>
        <span class="mt-4 inline-block chip">${s.eyebrow}</span>
        <span class="mt-3 block text-lg font-bold leading-snug text-[var(--color-ink)]">${s.title}</span>
        <span class="mt-2 block text-sm leading-relaxed text-[var(--color-muted)]">${s.desc}</span>
      </span>
      <span class="relative mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-brand-soft)]">
        ${s.cta} ${icon("arrow", "h-4 w-4 transition group-hover:translate-x-0.5")}
      </span>
    </a>`;
}

/** The full-width panel for one nav item: glowing item grid + spotlight + divided action row. */
function megaPanelHtml(label: string): string {
  const mega = MEGA[label];
  if (!mega) return "";
  const items = mega.items
    .map(
      (it) => `
      <a href="${it.href}" class="mega-tile group">
        <span class="icon-orb mega-tile-orb shrink-0 !h-11 !w-11">${icon(it.icon, "h-5 w-5")}</span>
        <span class="min-w-0 flex-1">
          <span class="flex items-center gap-1.5 font-semibold text-[var(--color-ink)]">${it.title}
            ${icon("arrow", "mega-tile-arrow h-3.5 w-3.5 text-[var(--color-brand-soft)]")}
          </span>
          <span class="mt-0.5 block text-sm leading-snug text-[var(--color-muted)]">${it.desc}</span>
        </span>
      </a>`,
    )
    .join("");
  const actions = mega.actions
    .map(
      (a) => `
      <a href="${a.href}" class="flex items-center justify-center gap-2.5 p-4 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-[color-mix(in_oklab,var(--color-elevated)_70%,transparent)]">
        ${icon(a.icon, "h-5 w-5 text-[var(--color-brand-soft)]")} ${a.name}
      </a>`,
    )
    .join("");
  const hasSpot = Boolean(mega.spotlight);
  return `
    <div class="relative">
      <div aria-hidden="true" class="absolute inset-x-0 bottom-0 top-1/2 shadow-[0_40px_90px_-40px_rgb(0_0_0/0.95)]"></div>
      <div class="relative overflow-hidden border-y border-[var(--color-line)] bg-[color-mix(in_oklab,var(--color-surface)_97%,transparent)] backdrop-blur-xl">
        <span class="mega-glow" aria-hidden="true"></span>
        <div class="container-x relative grid gap-x-6 gap-y-1 py-8 lg:grid-cols-3">
          <div class="grid gap-x-3 gap-y-1 sm:grid-cols-2 ${hasSpot ? "lg:col-span-2" : "lg:col-span-3 lg:grid-cols-3"}">
            ${items}
          </div>
          ${hasSpot ? `<div class="mt-3 lg:mt-0">${spotlightHtml(mega.spotlight!)}</div>` : ""}
        </div>
        <div class="relative border-t border-[var(--color-line)] bg-[color-mix(in_oklab,var(--color-bg-2)_70%,transparent)]">
          <div class="container-x">
            <div class="grid grid-cols-1 divide-y divide-[var(--color-line-soft)] border-x border-[var(--color-line-soft)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              ${actions}
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

/** The navbar network selector — a dropdown of all networks with live green/red status dots. */
function netSelectHtml(extra = ""): string {
  return `
    <div class="net-select ${extra}" data-net-select>
      <button type="button" class="net-trigger" data-net-trigger aria-haspopup="menu" aria-expanded="false" aria-label="Network selector">
        <span class="status-dot net-dot" data-net-trigger-dot aria-hidden="true"></span>
        <span class="net-trigger-name" data-net-trigger-name>Pyrax Seed Network</span>
        ${icon("chevron", "h-3.5 w-3.5 shrink-0 opacity-70")}
      </button>
      <div class="net-menu" data-net-menu role="menu" aria-label="Choose network" hidden>
        <div class="net-menu-head">Networks · live status</div>
        ${NETWORKS.map(
          (n) => `
          <button type="button" class="net-item" role="menuitemradio" aria-checked="false" tabindex="-1" data-net-item="${n.chainId}">
            <span class="status-dot net-dot is-offline" data-net-dot="${n.chainId}" aria-hidden="true"></span>
            <span class="net-item-name">${n.name}</span>
            <span class="net-item-id" data-net-id="${n.chainId}"></span>
          </button>`,
        ).join("")}
        <a href="/roadmap.html" class="net-menu-foot">Network status &amp; roadmap ${icon("arrow", "h-3.5 w-3.5")}</a>
      </div>
    </div>`;
}

/** The ⌘K search trigger (desktop pill form). */
function searchTriggerHtml(): string {
  return `
    <button type="button" class="search-trigger" data-cmdk-open aria-label="Search PYRAX (Command-K or Control-K)">
      ${icon("search", "h-4 w-4")}
      <span class="search-trigger-label">Search</span>
      <kbd class="search-kbd" data-cmdk-hint>⌘K</kbd>
    </button>`;
}

function headerHtml(active: string): string {
  const navItems = NAV.map((n) => {
    const hasMega = Boolean(MEGA[n.label]);
    const on = active === n.label ? "nav-link-on" : "";
    if (hasMega) {
      return `<button type="button" class="nav-link nav-underline ${on}" data-mega="${n.label}" aria-haspopup="true" aria-expanded="false" aria-controls="megapanel">
        ${n.label} ${icon("chevron", "h-4 w-4 opacity-70 transition data-[open]:rotate-180")}
      </button>`;
    }
    return `<a href="${n.href}" class="nav-link nav-underline ${on}">${n.label}</a>`;
  }).join("");

  return `
  <div id="megabackdrop" class="fixed inset-0 z-30 hidden bg-black/40 backdrop-blur-[1px]"></div>
  <header id="siteheader" class="fixed inset-x-0 top-0 z-40 transition-[background,border-color] duration-300">
    <nav class="container-x flex h-[4.5rem] items-center justify-between gap-3" aria-label="Global">
      <div class="flex min-w-0 items-center gap-3">
        <a href="/" class="logo-link group" aria-label="PYRAX home">
          <span class="logo-glow" aria-hidden="true"></span>
          <img src="/logo-horizontal.svg" alt="PYRAX" class="nav-logo relative w-auto" />
        </a>
        <!-- mobile-only at-a-glance network status (desktop has the full selector on the right) -->
        <button type="button" id="netmini" class="net-mini inline-flex min-w-0 items-center gap-1.5 rounded-full border border-[var(--color-line)] bg-[color-mix(in_oklab,var(--color-elevated)_60%,transparent)] px-2.5 py-1 text-xs font-medium text-[var(--color-muted)] lg:hidden" aria-label="Network status — open menu">
          <span class="status-dot net-dot shrink-0" data-net-trigger-dot aria-hidden="true"></span>
          <span class="max-w-[6.5rem] truncate" data-net-trigger-name>Pyrax Seed Network</span>
        </button>
      </div>

      <div class="hidden items-center gap-x-0.5 lg:flex" id="desktopnav">
        ${navItems}
      </div>

      <div class="flex items-center gap-2">
        ${netSelectHtml("hidden lg:block")}
        <div class="hidden lg:block">${searchTriggerHtml()}</div>

        <button type="button" class="icon-btn lg:hidden" data-cmdk-open aria-label="Search PYRAX">
          ${icon("search", "h-5 w-5")}
        </button>
        <button type="button" id="menubtn" class="icon-btn lg:hidden" aria-label="Open main menu" aria-expanded="false">
          ${icon("menu", "h-6 w-6")}
        </button>
      </div>
    </nav>

    <!-- shared full-width mega panel (content swapped per nav item) -->
    <div id="megawrap" class="absolute inset-x-0 top-[4.5rem] z-40">
      <div id="megapanel" role="region" aria-label="Menu"></div>
    </div>
  </header>

  <!-- mobile drawer: right slide-over with search, status, and Disclosure accordions -->
  <div id="mobilemenu" class="fixed inset-0 z-50 hidden lg:hidden">
    <div class="absolute inset-0 bg-black/60" data-close></div>
    <div class="absolute inset-y-0 right-0 flex w-full flex-col bg-[var(--color-bg-2)] sm:max-w-sm sm:border-l sm:border-[var(--color-line)]">
      <div class="flex items-center justify-between border-b border-[var(--color-line-soft)] px-6 py-4">
        <a href="/" class="logo-link" aria-label="PYRAX home"><img src="/logo-horizontal.svg" alt="PYRAX" class="h-6" /></a>
        <button type="button" data-close class="icon-btn" aria-label="Close menu">${icon("close", "h-6 w-6")}</button>
      </div>
      <div class="flex-1 overflow-y-auto px-6 py-5">
        <button type="button" class="search-trigger w-full !justify-start" data-cmdk-open data-close aria-label="Search PYRAX">
          ${icon("search", "h-4 w-4")} <span class="search-trigger-label">Search pages & docs…</span>
        </button>
        <div class="mt-4">${netSelectHtml("w-full")}</div>
        <div class="mt-5 -mx-3 divide-y divide-[var(--color-line-soft)]">
          <div class="space-y-1 pb-4">
            ${NAV.map((n) => mobileNavItem(n.label, n.href)).join("")}
          </div>
          <div class="space-y-3 py-5">
            <a href="${LINKS.docs}" class="-mx-0 block rounded-lg px-3 py-2.5 text-base font-semibold text-[var(--color-muted)] hover:bg-[var(--color-elevated)]" data-close>Full docs ↗</a>
            <a href="/node.html" class="btn btn-ghost w-full" data-close>Run a Node</a>
            <a href="/#waitlist" class="btn btn-primary w-full" data-close>Join the waitlist</a>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

/** One mobile nav entry: a Disclosure accordion when it has a mega panel, else a plain link. */
function mobileNavItem(label: string, href: string): string {
  const mega = MEGA[label];
  if (!mega) {
    return `<a href="${href}" class="-mx-0 block rounded-lg px-3 py-2.5 text-base font-semibold text-[var(--color-ink)] hover:bg-[var(--color-elevated)]" data-close>${label}</a>`;
  }
  const children = [
    ...mega.items.map((it) => ({ name: it.title, href: it.href })),
    ...mega.actions.map((a) => ({ name: a.name, href: a.href })),
  ];
  const pid = `mdisc-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return `
    <div data-disc>
      <button type="button" class="group flex w-full items-center justify-between rounded-lg py-2.5 pl-3 pr-3.5 text-base font-semibold text-[var(--color-ink)] hover:bg-[var(--color-elevated)]" data-disc-btn aria-expanded="false" aria-controls="${pid}">
        ${label} ${icon("chevron", "h-5 w-5 flex-none transition")}
      </button>
      <div id="${pid}" class="mt-1 hidden space-y-0.5 pb-2" data-disc-panel>
        ${children
          .map(
            (c) => `<a href="${c.href}" class="block rounded-lg py-2 pl-6 pr-3 text-sm font-medium text-[var(--color-muted)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-ink)]" data-close>${c.name}</a>`,
          )
          .join("")}
      </div>
    </div>`;
}

function footerHtml(): string {
  const col = (heading: string, links: { label: string; href: string }[]) => `
    <div>
      <div class="text-[0.7rem] font-semibold uppercase tracking-wider text-[var(--color-faint)]">${heading}</div>
      <ul class="mt-3 space-y-2 text-sm text-[var(--color-muted)]">
        ${links.map((l) => `<li><a href="${l.href}" class="transition hover:text-[var(--color-ink)]">${l.label}</a></li>`).join("")}
      </ul>
    </div>`;
  const social = (name: string, href: string) =>
    `<a href="${href}" aria-label="${name}" class="grid h-9 w-9 place-items-center rounded-lg border border-[var(--color-line)] text-[var(--color-muted)] transition hover:border-[var(--color-brand)] hover:text-[var(--color-ink)]">${icon(name, "h-4 w-4")}</a>`;

  return `
  <footer class="relative mt-24 border-t border-[var(--color-line)] bg-[color-mix(in_oklab,var(--color-bg-2)_70%,transparent)]">
    <div class="container-x py-14">
      <div class="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <img src="/logo-horizontal.svg" alt="PYRAX" class="h-7" />
          <p class="mt-4 max-w-xs text-sm leading-relaxed text-[var(--color-muted)]">${SITE.blurb}</p>
          <div class="mt-5 flex gap-2">
            ${social("x", LINKS.x)}${social("discord", LINKS.discord)}${social("telegram", LINKS.telegram)}${social("github", LINKS.github)}
          </div>
        </div>
        ${col("Network", [
          { label: "Overview", href: "/network.html" },
          { label: "TriStream mining", href: "/network.html#tristream" },
          { label: "Privacy", href: "/network.html#privacy" },
          { label: "Live peers", href: LINKS.peers },
          { label: "Explorer", href: LINKS.explorer },
        ])}
        ${col("Build & NEURAX", [
          { label: "Build / Docs", href: "/build.html" },
          { label: "NEURAX AI", href: "/neurax.html" },
          { label: "Tokenomics", href: "/token.html" },
          { label: "Run a node", href: "/node.html" },
          { label: "Full docs", href: LINKS.docs },
          { label: "Whitepaper", href: LINKS.whitepaper },
        ])}
        ${col("Company", [
          { label: "About", href: "/company.html" },
          { label: "AMA & FAQ", href: "/company.html#ama" },
          { label: "Brand", href: "/company.html#brand" },
          { label: "Contact", href: `mailto:${SITE.email}` },
          { label: "Web Portal Login", href: "https://team-pyrax.pyraxchain.com" },
        ])}
      </div>
      <hr class="hairline my-10" />
      <div class="flex flex-col gap-3 text-xs text-[var(--color-faint)] sm:flex-row sm:items-center sm:justify-between">
        <p>© ${new Date().getFullYear()} PYRAX. PYRX is a utility token built for the CFTC commodity/utility lane — not a security, and nothing here is investment advice or a price promise.</p>
        <p>Pre-mainnet · privacy clears an external audit before mainnet.</p>
      </div>
    </div>
  </footer>`;
}

/** Reveal-on-scroll: fade/slide elements with class `reveal` as they enter the viewport. */
function wireReveal(): void {
  const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
  if (!("IntersectionObserver" in window) || els.length === 0) {
    els.forEach((el) => el.classList.add("is-in"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          (e.target as HTMLElement).classList.add("is-in");
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
  );
  els.forEach((el) => io.observe(el));
}

/** Wire every network selector: open/close, selection (persisted via the store), live status dots. */
function wireNetSelect(): void {
  const selects = Array.from(document.querySelectorAll<HTMLElement>("[data-net-select]"));
  if (selects.length === 0) return;

  const itemsOf = (sel: HTMLElement) => Array.from(sel.querySelectorAll<HTMLButtonElement>("[data-net-item]"));
  const closeAll = () =>
    selects.forEach((sel) => {
      const menu = sel.querySelector<HTMLElement>("[data-net-menu]");
      if (menu) menu.hidden = true;
      sel.querySelector<HTMLElement>("[data-net-trigger]")?.setAttribute("aria-expanded", "false");
      sel.classList.remove("net-open");
    });
  const open = (sel: HTMLElement, focusIndex: number | null) => {
    const trigger = sel.querySelector<HTMLElement>("[data-net-trigger]");
    const menu = sel.querySelector<HTMLElement>("[data-net-menu]");
    if (!trigger || !menu) return;
    closeAll();
    menu.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    sel.classList.add("net-open");
    if (focusIndex !== null) {
      const items = itemsOf(sel);
      items[focusIndex < 0 ? items.length - 1 : focusIndex]?.focus();
    }
  };
  const closeAndFocus = (sel: HTMLElement) => {
    closeAll();
    sel.querySelector<HTMLElement>("[data-net-trigger]")?.focus();
  };

  selects.forEach((sel) => {
    const trigger = sel.querySelector<HTMLButtonElement>("[data-net-trigger]");
    const menu = sel.querySelector<HTMLElement>("[data-net-menu]");
    if (!trigger || !menu) return;

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.hidden ? open(sel, null) : closeAll();
    });
    // keyboard menu-button pattern: ArrowDown/Up open + move focus into the menu
    trigger.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        open(sel, 0);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        open(sel, -1);
      }
    });

    const items = itemsOf(sel);
    items.forEach((item, idx) => {
      item.addEventListener("click", () => {
        setSelectedNetwork(Number(item.dataset.netItem));
        closeAndFocus(sel);
      });
      item.addEventListener("keydown", (e) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          items[(idx + 1) % items.length]?.focus();
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          items[(idx - 1 + items.length) % items.length]?.focus();
        } else if (e.key === "Home") {
          e.preventDefault();
          items[0]?.focus();
        } else if (e.key === "End") {
          e.preventDefault();
          items[items.length - 1]?.focus();
        } else if (e.key === "Escape") {
          e.preventDefault();
          closeAndFocus(sel);
        }
      });
    });

    // close when focus leaves the selector entirely (e.g. Tab-out)
    sel.addEventListener("focusout", (e) => {
      if (!sel.contains(e.relatedTarget as Node)) closeAll();
    });
  });

  document.addEventListener("click", (e) => {
    if (!(e.target as HTMLElement).closest("[data-net-select]")) closeAll();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAll();
  });

  // live status → the trigger name/dot + each menu item's dot + the selected check
  subscribeNetwork((s: NetSnapshot) => {
    const selOnline = s.live.online && s.live.producing;
    document.querySelectorAll<HTMLElement>("[data-net-trigger-name]").forEach((el) => (el.textContent = s.selected.name));
    document.querySelectorAll<HTMLElement>("[data-net-trigger-dot]").forEach((el) => el.classList.toggle("is-offline", !selOnline));
    document
      .querySelectorAll<HTMLElement>("[data-net-trigger]")
      .forEach((el) =>
        el.setAttribute(
          "aria-label",
          `Network: ${s.selected.name} — ${selOnline ? "live, producing blocks" : "offline / not producing"}. Choose network.`,
        ),
      );
    document.querySelectorAll<HTMLElement>("[data-net-dot]").forEach((dot) => {
      const st = s.all[Number(dot.dataset.netDot)];
      dot.classList.toggle("is-offline", !(st && st.online && st.producing));
    });
    document.querySelectorAll<HTMLButtonElement>("[data-net-item]").forEach((item) => {
      const cid = Number(item.dataset.netItem);
      const on = cid === s.selected.chainId;
      item.setAttribute("aria-checked", String(on));
      item.classList.toggle("is-selected", on);
      // Chain-ID visibility: hidden for "internal" networks ALWAYS; shown for public/built/pre-launch
      // ONLY once that network is actually live and producing blocks. The empty span collapses (CSS).
      const net = s.networks.find((n) => n.chainId === cid);
      const st = s.all[cid];
      const showId = !!net && net.status !== "internal" && !!st && st.online && st.producing;
      const idEl = item.querySelector<HTMLElement>("[data-net-id]");
      if (idEl) idEl.textContent = showId ? String(cid) : "";
    });
  });
}

/** Rewrite root-relative links in the rendered chrome: on a subdomain the marketing links point back
 *  to the main site (navOrigin); the logo/home links always point at THIS property's home. Absolute
 *  (http/https), mailto and #anchor links are left untouched. */
function rewriteChromeLinks(root: HTMLElement): void {
  const origin = getNavOrigin();
  const home = getHomeHref();
  root.querySelectorAll<HTMLAnchorElement>('a[href^="/"]').forEach((a) => {
    if (a.classList.contains("logo-link")) a.setAttribute("href", home);
    else if (origin) a.setAttribute("href", origin + a.getAttribute("href"));
  });
}

export type ChromeOptions = {
  /** the active top-nav label (highlighted) */
  active?: string;
  /** origin to prefix root-relative marketing links with (subdomains pass "https://pyraxchain.com") */
  navOrigin?: string;
  /** where the logo points — this property's own home (default "/") */
  homeHref?: string;
  /** extra command-palette entries for this property (e.g. the explorer's pages) */
  searchEntries?: CmdkEntry[];
};

/** Render header + footer into #header / #footer and wire all interactions. Accepts either the active
 *  label (back-compat string) or a full options object. */
export function mountChrome(opts: ChromeOptions | string = {}): void {
  const o: ChromeOptions = typeof opts === "string" ? { active: opts } : opts;
  configureChrome({ navOrigin: o.navOrigin, homeHref: o.homeHref });
  const active = o.active ?? "";
  const searchEntries = o.searchEntries ?? [];
  const header = document.getElementById("header");
  const footer = document.getElementById("footer");
  if (header) {
    header.innerHTML = headerHtml(active);
    rewriteChromeLinks(header);
  }
  if (footer) {
    footer.innerHTML = footerHtml();
    rewriteChromeLinks(footer);
  }

  const headerEl = document.getElementById("siteheader");
  const megawrap = document.getElementById("megawrap");
  const megapanel = document.getElementById("megapanel");
  const backdrop = document.getElementById("megabackdrop");
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-mega]"));
  let openLabel = "";
  let pinned = false;
  let closeTimer = 0;
  const triggerFor = (label: string) => buttons.find((b) => b.dataset.mega === label);

  const setChevron = (label: string) =>
    buttons.forEach((b) => {
      const chev = b.querySelector("svg");
      if (chev) chev.toggleAttribute("data-open", b.dataset.mega === label);
      b.setAttribute("aria-expanded", String(b.dataset.mega === label));
    });
  const closeMega = () => {
    openLabel = "";
    pinned = false;
    megawrap?.classList.remove("mega-open");
    backdrop?.classList.add("hidden");
    setChevron("");
  };
  const openMega = (label: string) => {
    if (!megapanel || !megawrap) return;
    window.clearTimeout(closeTimer);
    if (openLabel !== label) {
      megapanel.innerHTML = megaPanelHtml(label);
      megapanel.setAttribute("aria-label", `${label} menu`);
      openLabel = label;
    }
    megawrap.classList.add("mega-open");
    backdrop?.classList.remove("hidden");
    setChevron(label);
  };
  const scheduleClose = () => {
    if (pinned) return; // a click-opened panel stays until a 2nd click / backdrop / Escape
    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(closeMega, 160);
  };

  buttons.forEach((btn) => {
    const label = btn.dataset.mega ?? "";
    btn.addEventListener("mouseenter", () => {
      if (!pinned) openMega(label);
    });
    btn.addEventListener("mouseleave", scheduleClose);
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (openLabel === label && pinned) closeMega();
      else {
        openMega(label);
        pinned = true;
      }
    });
    // keyboard: ArrowDown opens the panel and drops focus into its first link (menu-button semantics)
    btn.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        openMega(label);
        pinned = true;
        requestAnimationFrame(() => megapanel?.querySelector<HTMLElement>("a, button")?.focus());
      }
    });
  });
  megawrap?.addEventListener("mouseenter", () => window.clearTimeout(closeTimer));
  megawrap?.addEventListener("mouseleave", scheduleClose);
  backdrop?.addEventListener("mouseenter", closeMega);
  backdrop?.addEventListener("click", closeMega);
  // keyboard focus leaving the header entirely closes the panel (mirrors the mouseleave path)
  headerEl?.addEventListener("focusout", (e) => {
    const to = (e as FocusEvent).relatedTarget as Node | null;
    if (to && !headerEl.contains(to)) closeMega();
  });

  // header scroll state (stronger glass once scrolled)
  const onScroll = () => {
    if (!headerEl) return;
    const scrolled = window.scrollY > 8;
    headerEl.classList.toggle("glass", scrolled);
    headerEl.classList.toggle("border-b", scrolled);
    headerEl.classList.toggle("border-[var(--color-line)]", scrolled);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // mobile drawer + Disclosure accordions
  const menu = document.getElementById("mobilemenu");
  const menubtn = document.getElementById("menubtn");
  const menuOpen = () => menu != null && !menu.classList.contains("hidden");
  const openMenu = () => {
    menu?.classList.remove("hidden");
    menubtn?.setAttribute("aria-expanded", "true");
    lockScroll();
    menu?.querySelector<HTMLElement>("[data-close]")?.focus();
  };
  const closeMenu = () => {
    if (!menuOpen()) return;
    menu?.classList.add("hidden");
    menubtn?.setAttribute("aria-expanded", "false");
    unlockScroll();
    menubtn?.focus();
  };
  menubtn?.addEventListener("click", openMenu);
  // the mobile at-a-glance status pill opens the drawer (which holds the full network selector)
  document.getElementById("netmini")?.addEventListener("click", openMenu);
  menu?.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", closeMenu));
  // trap Tab within the open drawer
  menu?.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const m = e.currentTarget as HTMLElement;
    const focusables = Array.from(
      m.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'),
    ).filter((el) => el.getClientRects().length > 0);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!first || !last) return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
  menu?.querySelectorAll<HTMLElement>("[data-disc]").forEach((disc) => {
    const btn = disc.querySelector<HTMLButtonElement>("[data-disc-btn]");
    const panel = disc.querySelector<HTMLElement>("[data-disc-panel]");
    const chev = btn?.querySelector("svg");
    btn?.addEventListener("click", () => {
      const open = panel?.classList.toggle("hidden") === false;
      btn.setAttribute("aria-expanded", String(open));
      chev?.classList.toggle("rotate-180", open);
    });
  });

  // Escape closes whichever surface is open (mega returns focus to its trigger; drawer to its button)
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (openLabel) {
      const lbl = openLabel;
      closeMega();
      triggerFor(lbl)?.focus();
    }
    if (menuOpen()) closeMenu();
  });

  // platform-correct ⌘K / Ctrl-K hint
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || "");
  if (!isMac) document.querySelectorAll<HTMLElement>("[data-cmdk-hint]").forEach((k) => (k.textContent = "Ctrl K"));

  mountCommandPalette(searchEntries);
  startNetworkPolling();
  wireNetSelect();
  wireReveal();
}
