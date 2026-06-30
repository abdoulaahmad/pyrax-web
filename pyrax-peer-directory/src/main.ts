// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// PYRAX Peer Directory — a fixed-height "control room" under the full PYRAX site navbar
// (mountChrome). The viewport below the fixed navbar is split into a LEFT GUIDES SIDEBAR
// (its own scroll; surfaces the four guides + a Quick-connect helper) and the RIGHT LIVE
// CONSOLE: a single non-scrolling peer grid that PAGINATES (page size measured to fill the
// console region). Every node's full dial multiaddr and full 64-char relay key is shown — no
// truncation. Realtime over SSE. The navbar net-selector drives network switching.

import { mountChrome, subscribe, DOMAINS } from "@pyrax/shared";
import { GUIDES } from "./guides-data.js";
import { CHAIN_TO_SSE, PEERS_SEARCH } from "./content.js";

interface Peer {
  address: string;
  lastSeen: number;
  since: number;
  relayPubkey?: string;
  country?: string; // ISO-2 (undefined for loopback/unknown)
  countryName?: string;
  lat?: number;
  lon?: number;
  kind?: "seed" | "operator" | "rpc"; // colors the node app's globe (blue / orange / violet RPC node)
}

/** All known networks + labels; the dropdown is filtered to the ENABLED set. */
const ALL_NETWORKS: { id: string; label: string }[] = [
  { id: "seed", label: "Pyrax Seed Network" },
  { id: "forge", label: "Pyrax Forge Network" },
  { id: "rise", label: "Pyrax Rise Network" },
  { id: "one", label: "Pyrax One Network" },
];

// The dropdown lists ALL networks (uniform with pyraxchain.com's selector); `enabledSet`
// is the subset this directory actually tracks (from /api/health). Selecting a network
// filters the live peer view to that network.
let enabledSet = new Set<string>(ALL_NETWORKS.map((n) => n.id));
let current = "";
let peers: Peer[] = [];
let connected = false;
let inactive = false; // selected a network this directory doesn't track (no stream)
let source: EventSource | null = null;

// Pagination state — page size is measured to fill the grid region.
let page = 0;
let pageSize = 6;
let prevCount = 0;
let justChanged = false; // gate card-entry animation to deliberate page/network changes
let cardMinH = 156; // refined from a real card's measured height (see maybeRemeasure)
let measuring = false;

let gridEl: HTMLElement | null = null;
let pagerEl: HTMLElement | null = null;

const app = document.getElementById("app")!;

// --- icons ---
const ICON_COPY = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="size-3.5"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>`;
const ICON_CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="size-3.5 text-gold"><path d="m5 13 4 4L19 7"/></svg>`;
const CHEVRON = (d: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="size-4"><path d="${d}"/></svg>`;

function ago(ts: number): string {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  return `${Math.round(s / 3600)}h`;
}
function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}
function label(id: string): string {
  return ALL_NETWORKS.find((n) => n.id === id)?.label ?? id;
}
/** ISO-2 country code → a flag IMAGE; globe glyph if unknown. We use an <img> (a
 *  same-sized SVG flag) rather than a flag EMOJI because flag emoji are Unicode
 *  regional-indicator pairs that Windows deliberately does NOT render as flags (Segoe
 *  UI Emoji has no flag glyphs — it shows two boxed letters), so on Windows the emoji
 *  approach showed no flags at all. The image host is allow-listed in the server CSP's
 *  img-src. The globe 🌐 is a plain glyph that renders everywhere, so it stays as-is. */
function flag(code?: string): string {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return "🌐";
  const cc = code.toLowerCase();
  // No inline onerror handler — the server CSP is script-src 'self' (no inline scripts),
  // so it would be blocked; the alt text is the graceful fallback if the image fails.
  return (
    `<img src="https://flagcdn.com/${cc}.svg" alt="${esc(code.toUpperCase())}" ` +
    `width="20" height="15" loading="lazy" decoding="async" ` +
    `style="display:inline-block;border-radius:2px;vertical-align:middle;box-shadow:0 0 0 1px rgba(255,255,255,0.10)" />`
  );
}

function pageCount(): number {
  return Math.max(1, Math.ceil(peers.length / pageSize));
}
function clampPage(): void {
  page = Math.min(Math.max(0, page), pageCount() - 1);
}
const CARD_MIN_W = 300; // mirrors the peer-grid track minimum
function computePageSize(): number {
  if (!gridEl) return pageSize;
  const gap = 12; // mirrors `gap-3`
  const w = gridEl.clientWidth;
  const h = gridEl.clientHeight;
  if (w === 0 || h === 0) return pageSize; // first-paint guard
  const cols = Math.max(1, Math.floor((w + gap) / (CARD_MIN_W + gap)));
  const rows = Math.max(1, Math.floor((h + gap) / (cardMinH + gap))); // floor → never clip
  return cols * rows;
}

/** Re-measure a REAL peer card (not a skeleton) once rendered, and re-fit the page
 * if the true height differs from our estimate — guards the no-scroll invariant. */
function maybeRemeasure(): void {
  if (measuring || !gridEl || peers.length === 0) return;
  measuring = true;
  requestAnimationFrame(() => {
    measuring = false;
    const card = gridEl?.querySelector<HTMLElement>("article");
    const h = card?.offsetHeight ?? 0;
    if (h > 0 && Math.abs(h - cardMinH) > 6) {
      cardMinH = h;
      const next = computePageSize();
      if (next !== pageSize) {
        pageSize = next;
        clampPage();
        renderGrid();
      }
    }
  });
}

// --- card + states ---
function copyBtn(value: string, aria: string): string {
  return `<button data-copy="${esc(value)}" aria-label="${aria}" class="copy shrink-0 grid place-items-center size-8 sm:size-6 rounded-md border border-line text-muted hover:text-brand hover:border-brand/60 hover:bg-brand/5 active:scale-90 transition">${ICON_COPY}</button>`;
}
function field(labelText: string, value: string, tone: string, copyable: boolean): string {
  return `
    <div class="field rounded-lg px-2.5 py-2">
      <div class="flex items-center justify-between min-h-6 mb-1">
        <span class="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">${labelText}</span>
        ${copyable ? copyBtn(value, `Copy ${labelText}`) : ""}
      </div>
      <code class="block min-w-0 font-mono text-[11px] leading-[1.45] ${tone} break-all [overflow-wrap:anywhere] select-all">${esc(value)}</code>
    </div>`;
}
function peerCard(p: Peer, i: number): string {
  const rise = justChanged ? "animate-rise " : "";
  const delay = justChanged ? ` style="animation-delay:${Math.min(i, 10) * 22}ms"` : "";
  // Dial is copiable (it's the multiaddr you add manually); the relay key is
  // shown for reference only — no copy button, to avoid confusing manual setup.
  const relay = p.relayPubkey
    ? field("relay", p.relayPubkey, "text-bolt", false)
    : `<div class="field rounded-lg px-2.5 py-2"><div class="min-h-6 flex items-center"><span class="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">relay</span></div><div class="font-mono text-[11px] text-muted/60">— none —</div></div>`;
  const loc = p.country
    ? `<span class="text-[15px] leading-none" title="${esc(p.countryName ?? p.country)}">${flag(p.country)}</span><span class="text-xs font-semibold tracking-wide text-ink">${esc(p.country)}</span>`
    : `<span class="text-[15px] leading-none" title="local / unknown">🌐</span>`;
  // Node kind, distinctly labelled + coloured: seed = the Ember admin/internal app
  // (fire-orange), operator = the public Inferno Node app (bolt-blue), rpc = a
  // violet RPC node.
  const KIND_BADGE = {
    seed: ["bg-brand/15 text-brand ring-brand/40", "Admin · Ember"],
    operator: ["bg-bolt/15 text-bolt ring-bolt/40", "Public · Inferno"],
    rpc: ["bg-violet/15 text-violet ring-violet/40", "RPC node"],
  } as const;
  const kind =
    p.kind && KIND_BADGE[p.kind]
      ? `<span class="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${KIND_BADGE[p.kind][0]}">${KIND_BADGE[p.kind][1]}</span>`
      : "";
  return `
    <article class="${rise}card rounded-xl p-3 flex flex-col gap-2 overflow-hidden transition duration-150 hover:border-brand/60 hover:shadow-[0_16px_40px_-18px_rgb(245_135_34/0.45)]"${delay}>
      <div class="flex items-center gap-2">
        <span class="live-dot" aria-hidden="true"></span>
        ${loc}
        ${kind}
        <span class="peer-age ml-auto text-[11px] font-medium text-muted tabular-nums whitespace-nowrap" data-seen="${p.lastSeen}" data-since="${p.since}">${ago(p.lastSeen)} · up ${ago(p.since)}</span>
      </div>
      ${field("dial", p.address, "text-ink", true)}
      ${relay}
    </article>`;
}
// Mirrors the real card's geometry so the pre-SSE page estimate is close before
// maybeRemeasure corrects it.
function skeletonCard(): string {
  return `
    <article class="card rounded-xl p-3 flex flex-col gap-2">
      <div class="flex items-center gap-2"><span class="size-2.5 rounded-full bg-line animate-pulse"></span><span class="h-3 w-14 rounded bg-line animate-pulse"></span></div>
      <div class="field rounded-lg px-2.5 py-2 space-y-1.5"><div class="h-1.5 w-8 rounded bg-line/70 animate-pulse"></div><div class="h-2 w-full rounded bg-line animate-pulse"></div><div class="h-2 w-3/4 rounded bg-line animate-pulse"></div></div>
      <div class="field rounded-lg px-2.5 py-2 space-y-1.5"><div class="h-1.5 w-10 rounded bg-line/70 animate-pulse"></div><div class="h-2 w-full rounded bg-line animate-pulse"></div></div>
    </article>`;
}
/** Patch just the relative-time spans in place (no innerHTML rebuild — preserves
 * any in-progress text selection of an address/key, and is cheaper). */
function tickTimes(): void {
  if (!gridEl) return;
  for (const el of gridEl.querySelectorAll<HTMLElement>(".peer-age")) {
    el.textContent = `${ago(Number(el.dataset.seen))} · up ${ago(Number(el.dataset.since))}`;
  }
}
function emptyState(): string {
  return `
    <div class="col-span-full h-full grid place-items-center text-center">
      <div class="glass rounded-2xl px-8 py-10 flex flex-col items-center gap-4">
        <div class="radar grid place-items-center"><span class="size-2 rounded-full bg-brand/70"></span></div>
        <div>
          <p class="text-ink font-medium">No nodes broadcasting on ${esc(label(current))}.</p>
          <p class="text-muted/70 text-sm mt-1">Spin up a node and it appears here within seconds.</p>
        </div>
      </div>
    </div>`;
}

function inactiveState(): string {
  return `
    <div class="col-span-full h-full grid place-items-center text-center">
      <div class="glass rounded-2xl px-8 py-10 flex flex-col items-center gap-4 max-w-md">
        <div class="radar grid place-items-center"><span class="size-2 rounded-full bg-muted/60"></span></div>
        <div>
          <p class="text-ink font-medium">${esc(label(current))} isn't tracked on this directory yet.</p>
          <p class="text-muted/70 text-sm mt-1">This instance lists peers only for its enabled networks. Pick another network in the navbar above.</p>
        </div>
      </div>
    </div>`;
}

function gridInner(): string {
  if (inactive) return inactiveState();
  if (peers.length === 0) {
    return connected ? emptyState() : Array.from({ length: pageSize }, skeletonCard).join("");
  }
  const sorted = [...peers].sort((a, b) => a.address.localeCompare(b.address));
  const start = page * pageSize;
  return sorted
    .slice(start, start + pageSize)
    .map((p, i) => peerCard(p, i))
    .join("");
}
function pagerInner(): string {
  const pc = pageCount();
  if (pc <= 1 || peers.length === 0) return "";
  const btn = (id: string, path: string, disabled: boolean, aria: string) =>
    `<button id="${id}" aria-label="${aria}" ${disabled ? "disabled" : ""} class="glass rounded-lg size-11 sm:size-9 grid place-items-center text-muted hover:text-ink hover:border-brand/50 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition">${CHEVRON(path)}</button>`;
  return `
    ${btn("prev", "m15 6-6 6 6 6", page === 0, "Previous page")}
    <span class="px-2 text-[11px] tabular-nums text-muted">Page ${page + 1} / ${pc} · ${peers.length} peer${peers.length === 1 ? "" : "s"}</span>
    ${btn("next", "m9 6 6 6-6 6", page === pc - 1, "Next page")}`;
}

// --- guides sidebar (static; built once inside the shell) ---
function sidebarHtml(): string {
  const guideCards = GUIDES.map(
    (g) => `
      <a href="/guides.html#${g.slug}" class="group block rounded-xl border border-line/70 bg-elevated/40 p-3 transition hover:border-brand/50 hover:bg-elevated/70">
        <div class="flex items-start gap-3">
          <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-brand/10 text-lg ring-1 ring-brand/20 transition group-hover:bg-brand/20">${g.icon}</span>
          <div class="min-w-0">
            <p class="text-sm font-semibold text-ink transition group-hover:text-brand">${esc(g.title)}</p>
            <p class="mt-0.5 text-[12px] leading-snug text-muted">${esc(g.summary)}</p>
          </div>
        </div>
      </a>`,
  ).join("");

  return `
    <aside class="hidden lg:flex min-h-0 flex-col border-r border-line/60 bg-surface/40">
      <div class="min-h-0 flex-1 overflow-y-auto px-4 py-5 space-y-5">
        <div>
          <p class="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">Guides &amp; help</p>
          <div class="mt-3 space-y-2.5">
            ${guideCards}
          </div>
        </div>

        <div class="rounded-xl border border-line/70 bg-elevated/40 p-4">
          <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">Quick connect</p>
          <p class="mt-2 text-[13px] leading-relaxed text-muted">
            Pick your network in the navbar, copy a peer's <span class="font-semibold text-ink">Dial</span> address,
            and paste it into the PYRAX app's <span class="font-semibold text-ink">Connect</span> tab. You usually
            don't need this — discovery is automatic.
          </p>
          <a href="/guides.html#manual-connection" class="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-soft transition hover:text-gold">
            How to connect manually
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="size-3.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </a>
        </div>

        <div class="rounded-xl border border-line/70 bg-elevated/40 p-4">
          <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">No peers showing?</p>
          <p class="mt-2 text-[13px] leading-relaxed text-muted">
            A fresh node takes ~30–90s to announce and dial out. Confirm the right network is selected, then
            give it a minute.
          </p>
          <a href="/guides.html#troubleshooting" class="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-soft transition hover:text-gold">
            Troubleshooting checklist
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="size-3.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </a>
        </div>
      </div>
    </aside>`;
}

// --- shell (built once) + grid (re-rendered per frame) ---
function renderShell(): void {
  app.innerHTML = `
    <div class="fixed inset-x-0 bottom-0 top-[4.5rem] grid lg:grid-cols-[18rem_1fr] overflow-hidden">
      ${sidebarHtml()}

      <section class="min-h-0 min-w-0 grid grid-rows-[auto_1fr_auto_auto] overflow-hidden">
        <!-- console toolbar: live count + status + a mobile Guides shortcut -->
        <div class="edge-light flex items-center gap-2 sm:gap-3 border-b border-line/60 bg-surface/50 px-4 sm:px-6 py-2.5">
          <span class="live-dot" aria-hidden="true"></span>
          <span class="text-sm font-semibold tracking-tight text-ink">Live peers</span>
          <a href="/guides.html" class="lg:hidden ml-1 rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-muted transition hover:border-brand/50 hover:text-ink">Guides</a>
          <div class="ml-auto flex items-center gap-2 sm:gap-3">
            <div class="flex items-center gap-1.5 rounded-lg bg-elevated px-2 sm:px-2.5 py-1.5 ring-1 ring-line">
              <span class="hidden sm:inline text-[10px] uppercase tracking-wider text-muted">online</span>
              <span id="online-chip" class="text-sm font-bold tabular-nums text-muted">0</span>
            </div>
            <div id="status-pill"></div>
          </div>
        </div>

        <div id="grid" class="min-h-0 overflow-hidden w-full grid peer-grid gap-3 content-start auto-rows-max px-4 sm:px-6 py-3 sm:py-4"></div>
        <nav id="pager" class="shrink-0 flex items-center justify-center gap-2 pb-2"></nav>

        <footer class="shrink-0 border-t border-line/60 bg-bg/85 px-4 py-2 text-center text-[10px] sm:text-[11px] leading-tight text-muted/80 backdrop-blur-md">
          Convenience discovery only — the directory never signs or validates chain data; nodes verify
          each other peer-to-peer. Announcing is restricted to the PYRAX apps (authenticated, app-only API).
        </footer>
      </section>
    </div>`;

  gridEl = document.getElementById("grid");
  pagerEl = document.getElementById("pager");

  document.onkeydown = (e) => {
    const tag = (document.activeElement as HTMLElement | null)?.tagName;
    if (tag === "SELECT" || tag === "INPUT" || tag === "TEXTAREA") return;
    if (e.key === "ArrowLeft") gotoPage(page - 1);
    else if (e.key === "ArrowRight") gotoPage(page + 1);
  };

  if (gridEl) {
    let scheduled = false;
    new ResizeObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        const next = computePageSize();
        if (next !== pageSize) {
          pageSize = next;
          clampPage();
          renderGrid();
        }
      });
    }).observe(gridEl);
  }
}

/** Switch the active network (called by the navbar net-selector via mountChrome). */
function selectNetwork(id: string): void {
  if (id === current) return;
  current = id;
  peers = [];
  page = 0;
  prevCount = 0;
  renderGrid();
  connect();
}

function patchHeader(): void {
  const chip = document.getElementById("online-chip");
  if (chip) {
    chip.textContent = String(peers.length);
    chip.classList.toggle("text-positive", peers.length > 0);
    chip.classList.toggle("text-muted", peers.length === 0);
    if (peers.length > prevCount) {
      chip.classList.add("tick-flash");
      setTimeout(() => chip.classList.remove("tick-flash"), 600);
    }
  }
  const pill = document.getElementById("status-pill");
  if (pill) {
    const tone = inactive
      ? "bg-line/40 text-muted ring-1 ring-line"
      : connected
        ? "bg-positive/10 text-positive ring-1 ring-positive/30"
        : "bg-gold/10 text-gold ring-1 ring-gold/30";
    pill.className = `flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${tone}`;
    const dot = inactive ? "bg-muted" : connected ? "bg-positive animate-pulse-glow" : "bg-gold";
    const text = inactive ? "Idle" : connected ? "Live" : "Reconnecting…";
    pill.innerHTML = `<span class="size-1.5 rounded-full ${dot}"></span><span class="hidden sm:inline">${text}</span>`;
  }
}

function renderGrid(): void {
  if (!gridEl || !pagerEl) return;
  clampPage();
  gridEl.style.opacity = connected ? "1" : "0.7";
  gridEl.innerHTML = gridInner();
  pagerEl.innerHTML = pagerInner();
  patchHeader();
  justChanged = false;
  prevCount = peers.length;

  for (const b of gridEl.querySelectorAll<HTMLButtonElement>("button.copy")) {
    b.onclick = () => {
      void navigator.clipboard?.writeText(b.dataset.copy ?? "");
      const prev = b.innerHTML;
      b.innerHTML = ICON_CHECK;
      b.classList.add("animate-copy-pop");
      setTimeout(() => {
        b.innerHTML = prev;
        b.classList.remove("animate-copy-pop");
      }, 1200);
    };
  }
  document.getElementById("prev")?.addEventListener("click", () => gotoPage(page - 1));
  document.getElementById("next")?.addEventListener("click", () => gotoPage(page + 1));

  maybeRemeasure(); // re-fit page size to the REAL card height once peers render
}

function gotoPage(p: number): void {
  const target = Math.min(Math.max(0, p), pageCount() - 1);
  if (target === page) return;
  page = target;
  justChanged = true;
  renderGrid();
}

function connect(): void {
  source?.close();
  source = null;
  // A network this directory doesn't track has no stream — show a clear idle state
  // instead of an endless reconnect/skeleton loop.
  inactive = !enabledSet.has(current);
  if (inactive) {
    connected = false;
    peers = [];
    renderGrid();
    return;
  }
  source = new EventSource(`/api/peers/stream?network=${encodeURIComponent(current)}`);
  source.onopen = () => {
    connected = true;
    renderGrid();
  };
  source.onmessage = (e) => {
    try {
      peers = (JSON.parse(e.data).peers as Peer[]) ?? [];
      connected = true;
      renderGrid();
    } catch {
      /* ignore malformed frame */
    }
  };
  source.onerror = () => {
    connected = false;
    renderGrid();
    fetch(`/api/peers?network=${encodeURIComponent(current)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.peers) {
          peers = d.peers;
          renderGrid();
        }
      })
      .catch(() => {});
  };
}

// Re-tick relative timestamps every 5s by patching the time spans in place — no
// innerHTML rebuild, so an in-progress drag-select of an address/key survives.
setInterval(() => {
  if (peers.length) tickTimes();
}, 5000);

async function init(): Promise<void> {
  try {
    const h = (await (await fetch("/api/health")).json()) as { networks?: string[] };
    const active = new Set(h.networks ?? []);
    if (active.size) enabledSet = active;
  } catch {
    /* server unreachable — assume every network is tracked */
  }
  // The full PYRAX site navbar (fixed, top), with the shared store-driven network selector. We follow
  // the store: subscribe() pushes the current selection immediately + on every change; we map the
  // selected chainId to this directory's SSE network-id and (re)open that stream.
  mountChrome({ navOrigin: DOMAINS.site, searchEntries: PEERS_SEARCH });

  renderShell();
  // The immediate push sets the initial network + opens the first stream (selectNetwork renders +
  // connects). Subscribed AFTER renderShell so the grid element exists when selectNetwork renders.
  subscribe((snap) => {
    const id = CHAIN_TO_SSE[snap.selected.chainId];
    if (id && id !== current) selectNetwork(id);
  });
  // Initial fit using the skeleton estimate; the real card height is measured by
  // maybeRemeasure() (called from renderGrid) once live peers arrive.
  requestAnimationFrame(() => {
    const next = computePageSize();
    if (next !== pageSize) {
      pageSize = next;
      clampPage();
      renderGrid();
    }
  });
}

void init();
