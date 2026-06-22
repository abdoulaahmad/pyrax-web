// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
import "../styles.css";

import { mountChrome } from "../lib/chrome.js";
import { codeBlock, wireCode } from "../lib/code.js";
import { DOCS, type DocBlock, type DocPage } from "../lib/docs-data.js";
import { icon, esc } from "../lib/ui.js";

// Flat index: slug → { page, category }, in document order.
const flat: { page: DocPage; category: string }[] = DOCS.flatMap((c) =>
  c.pages.map((page) => ({ page, category: c.name })),
);
const bySlug = new Map(flat.map((e) => [e.page.slug, e]));
const firstSlug = flat[0]?.page.slug ?? "introduction";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function renderBlock(b: DocBlock): string {
  switch (b.t) {
    case "h2":
      return `<h2 id="${slugify(b.text)}" class="scroll-mt-28">${esc(b.text)}</h2>`;
    case "h3":
      return `<h3 id="${slugify(b.text)}" class="scroll-mt-28">${esc(b.text)}</h3>`;
    case "p":
      return `<p>${b.html}</p>`;
    case "list":
      return `<ul>${b.items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
    case "code":
      return codeBlock({ lang: b.lang, title: b.title ?? "", code: b.code });
    case "table":
      return `<div class="doc-table-wrap"><table class="doc-table">
        <thead><tr>${b.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
        <tbody>${b.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody>
      </table></div>`;
    case "callout":
      return `<div class="doc-callout doc-callout-${b.kind}">${icon(b.kind === "warn" ? "shield" : "check", "h-5 w-5 shrink-0")}<div>${b.html}</div></div>`;
  }
}

function sidebarHtml(activeSlug: string): string {
  return DOCS.map(
    (c) => `
    <div class="mb-5">
      <div class="px-3 pb-2 text-[0.7rem] font-semibold uppercase tracking-wider text-[var(--color-faint)]">${esc(c.name)}</div>
      <ul class="space-y-0.5">
        ${c.pages
          .map(
            (p) => `<li><a href="#/${p.slug}" data-slug="${p.slug}" class="block rounded-lg px-3 py-1.5 text-sm transition ${p.slug === activeSlug ? "bg-[var(--color-elevated)] font-semibold text-[var(--color-ink)]" : "text-[var(--color-muted)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-ink)]"}">${esc(p.title)}</a></li>`,
          )
          .join("")}
      </ul>
    </div>`,
  ).join("");
}

function pickerHtml(activeSlug: string): string {
  return `<select id="docpicker" class="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 text-[var(--color-ink)] lg:hidden">
    ${DOCS.map(
      (c) => `<optgroup label="${esc(c.name)}">${c.pages.map((p) => `<option value="${p.slug}" ${p.slug === activeSlug ? "selected" : ""}>${esc(p.title)}</option>`).join("")}</optgroup>`,
    ).join("")}
  </select>`;
}

function contentHtml(slug: string): string {
  const entry = bySlug.get(slug) ?? flat[0];
  if (!entry) return `<p class="text-[var(--color-muted)]">No docs found.</p>`;
  const { page, category } = entry;
  return `
    <div class="doc">
      <div class="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-soft)]">${esc(category)}</div>
      <h1 class="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">${esc(page.title)}</h1>
      <div class="mt-6">${page.blocks.map(renderBlock).join("")}</div>
    </div>`;
}

const shell = `
<section class="relative overflow-hidden pt-32 pb-8 sm:pt-36 sm:pb-10">
  <div class="hero-aurora" aria-hidden="true"></div>
  <div class="absolute inset-0 grid-bg opacity-50"></div>
  <div class="container-x relative max-w-3xl">
    <span class="chip">Developer documentation</span>
    <div class="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
      Build on <span class="brand-text text-anim">PYRAX</span>
    </div>
    <p class="mt-5 max-w-2xl text-lg leading-relaxed text-[var(--color-muted)]">
      Everything you need to run a node, connect your tooling, deploy across three contract VMs, and reach the network over standard RPC. Pick a topic from the sidebar — the guides flow from first principles to reference.
    </p>
  </div>
</section>
<div class="container-x grid gap-10 pb-10 lg:grid-cols-[16rem_1fr]">
  <aside class="lg:sticky lg:top-24 lg:self-start">
    <div id="docpickerwrap" class="mb-4"></div>
    <nav id="docsidebar" class="hidden lg:block"></nav>
  </aside>
  <div id="doccontent" class="min-w-0"></div>
</div>`;

function currentSlug(): string {
  const s = location.hash.replace(/^#\//, "").trim();
  return bySlug.has(s) ? s : firstSlug;
}

function renderRoute(scroll = false): void {
  const slug = currentSlug();
  const sidebar = document.getElementById("docsidebar");
  const content = document.getElementById("doccontent");
  const pickerWrap = document.getElementById("docpickerwrap");
  if (sidebar) sidebar.innerHTML = sidebarHtml(slug);
  if (pickerWrap) pickerWrap.innerHTML = pickerHtml(slug);
  if (content) content.innerHTML = contentHtml(slug);
  const picker = document.getElementById("docpicker") as HTMLSelectElement | null;
  picker?.addEventListener("change", () => {
    location.hash = `#/${picker.value}`;
  });
  wireCode();
  if (scroll) window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
}

const main = document.getElementById("main");
if (main) main.innerHTML = shell;
mountChrome("Develop");
renderRoute(false);
window.addEventListener("hashchange", () => renderRoute(true));
