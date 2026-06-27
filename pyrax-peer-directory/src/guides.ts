// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// The PYRAX help hub — a responsive, hash-routed docs page that renders the
// guides from guides-data.ts. Desktop: sticky sidebar + content. Mobile: a guide
// picker dropdown + content. No framework.

import { GUIDES, type Guide, type GuideBlock } from "./guides-data.js";
import { mountChrome, DOMAINS } from "@pyrax/shared";
import { PEERS_SEARCH } from "./content.js";

const app = document.getElementById("app")!;

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

function renderBlock(b: GuideBlock): string {
  switch (b.type) {
    case "prose":
      return `<p class="mt-4 t-body text-muted break-words [overflow-wrap:anywhere]">${esc(b.text ?? "")}</p>`;
    case "callout": {
      const tone =
        b.tone === "warn"
          ? { accent: "border-gold", icon: "⚠", ic: "text-gold" }
          : b.tone === "tip"
            ? { accent: "border-positive", icon: "✦", ic: "text-positive" }
            : { accent: "border-bolt", icon: "ℹ", ic: "text-bolt" };
      return `<div class="mt-5 flex gap-3 rounded-xl border border-line border-l-2 ${tone.accent} bg-elevated/50 px-4 py-3 t-body">
        <span class="${tone.ic} font-bold shrink-0">${tone.icon}</span><span class="text-muted">${esc(b.text ?? "")}</span></div>`;
    }
    case "list":
      return `<ul class="mt-4 space-y-2.5">${(b.items ?? [])
        .map(
          (it) =>
            `<li class="flex gap-3 t-body text-muted"><span class="mt-2 size-1.5 shrink-0 rounded-full bg-brand"></span><span class="min-w-0 break-words [overflow-wrap:anywhere]">${esc(it.text ?? it.body ?? "")}</span></li>`,
        )
        .join("")}</ul>`;
    case "steps":
      return `<ol class="mt-5 space-y-3">${(b.items ?? [])
        .map(
          (it, i) =>
            `<li class="card rounded-xl p-4 flex gap-4">
               <span class="grid size-7 shrink-0 place-items-center rounded-full bg-brand/15 text-brand text-sm font-bold">${i + 1}</span>
               <div class="t-body min-w-0 break-words [overflow-wrap:anywhere]">
                 ${it.title ? `<p class="text-ink font-semibold">${esc(it.title)}</p>` : ""}
                 <p class="text-muted ${it.title ? "mt-1" : ""}">${esc(it.body ?? it.text ?? "")}</p>
               </div>
             </li>`,
        )
        .join("")}</ol>`;
    case "commands":
      return `<div class="mt-4 space-y-3">${(b.items ?? [])
        .map(
          (it) =>
            `<div>
               ${it.label ? `<div class="text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">${esc(it.label)}</div>` : ""}
               <pre class="field rounded-lg px-3 py-2.5 overflow-x-auto"><code class="font-mono text-[12px] leading-relaxed text-ink select-all whitespace-pre">${esc(it.code ?? "")}</code></pre>
               ${it.note ? `<p class="text-xs text-muted/80 mt-1.5">${esc(it.note)}</p>` : ""}
             </div>`,
        )
        .join("")}</div>`;
    case "table":
      return `<div class="mt-4 overflow-x-auto rounded-xl border border-line">
        <table class="w-full min-w-[34rem] border-collapse text-sm">
          <thead><tr class="bg-elevated text-left">${(b.columns ?? [])
            .map((c) => `<th class="px-3 py-2.5 font-semibold text-ink">${esc(c)}</th>`)
            .join("")}</tr></thead>
          <tbody>${(b.rows ?? [])
            .map(
              (r) =>
                `<tr class="border-t border-line">${r
                  .map((cell) => `<td class="px-3 py-2.5 align-top text-muted">${esc(cell)}</td>`)
                  .join("")}</tr>`,
            )
            .join("")}</tbody>
        </table></div>`;
    default:
      return "";
  }
}

function renderGuide(g: Guide): string {
  return `
    <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">${esc(g.eyebrow)}</p>
    <h1 class="mt-2 t-h1">${esc(g.title)}</h1>
    <p class="mt-3 t-lead text-muted">${esc(g.summary)}</p>
    ${g.sections
      .map(
        (s) => `<section class="mt-9 sm:mt-10">
          <h2 class="t-h3 tracking-tight">${esc(s.heading)}</h2>
          ${s.blocks.map(renderBlock).join("")}
        </section>`,
      )
      .join("")}`;
}

function navItem(g: Guide, active: boolean): string {
  return `<a href="#${g.slug}" ${active ? 'aria-current="page"' : ""} class="flex items-start gap-2.5 rounded-lg px-3 py-2 transition ${
    active ? "bg-brand/10 text-brand ring-1 ring-brand/30" : "text-muted hover:text-ink hover:bg-elevated/60"
  }">
    <span class="text-base leading-none mt-0.5">${g.icon}</span>
    <span class="min-w-0">
      <span class="block text-sm font-semibold leading-tight">${esc(g.title)}</span>
      <span class="block text-[11px] leading-tight ${active ? "text-brand/70" : "text-muted/70"} mt-0.5">${esc(g.eyebrow)}</span>
    </span>
  </a>`;
}

function currentSlug(): string {
  const slug = location.hash.replace(/^#/, "");
  return GUIDES.some((g) => g.slug === slug) ? slug : GUIDES[0].slug;
}

function render(): void {
  const slug = currentSlug();
  const guide = GUIDES.find((g) => g.slug === slug)!;

  // The full PYRAX site navbar (fixed, top) + the shared footer.
  mountChrome({ navOrigin: DOMAINS.site, searchEntries: PEERS_SEARCH });

  app.innerHTML = `
    <div class="w-full mx-auto max-w-6xl px-4 sm:px-6 pt-[5.5rem] sm:pt-24 pb-6 sm:pb-10 flex gap-8 sm:gap-10">
      <aside class="hidden lg:block w-60 shrink-0">
        <div class="sticky top-24 space-y-1">
          <p class="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted/70">Guides</p>
          ${GUIDES.map((g) => navItem(g, g.slug === slug)).join("")}
        </div>
      </aside>

      <main class="min-w-0 flex-1 max-w-3xl pb-8">
        <div class="lg:hidden mb-6 relative">
          <select id="guide-picker" class="w-full appearance-none rounded-xl bg-elevated px-4 py-3 pr-10 text-sm font-medium ring-1 ring-line focus:ring-brand/60 focus:outline-none">
            ${GUIDES.map((g) => `<option value="${g.slug}" ${g.slug === slug ? "selected" : ""}>${g.icon}  ${esc(g.title)}</option>`).join("")}
          </select>
          <svg class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-muted" viewBox="0 0 20 20" fill="currentColor"><path d="M5.5 7.5 10 12l4.5-4.5z"/></svg>
        </div>
        ${renderGuide(guide)}

        <div class="mt-14 border-t border-line/60 pt-5 text-center text-[11px] leading-relaxed text-muted/70">
          Convenience discovery only — the directory never signs or validates chain data; nodes verify
          each other peer-to-peer. Announcing is restricted to the PYRAX apps (authenticated, app-only API).
        </div>
      </main>
    </div>`;

  const picker = document.getElementById("guide-picker") as HTMLSelectElement | null;
  if (picker) picker.onchange = () => (location.hash = picker.value);
  // Scroll to top on guide change (the main column, page already at top on nav).
  document.scrollingElement?.scrollTo({ top: 0 });
}

window.addEventListener("hashchange", render);
render();
