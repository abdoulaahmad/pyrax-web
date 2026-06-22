// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
import "../styles.css";
import "./whitepaper.css";

import { mountChrome } from "../lib/chrome.js";
import { icon } from "../lib/ui.js";
import { renderMarkdown, tocFromMarkdown } from "../lib/markdown.js";
import technicalMd from "../content/whitepaper/technical.md?raw";
import plainMd from "../content/whitepaper/plain-english.md?raw";

type Version = "plain" | "technical";

const SOURCES: Record<Version, string> = { plain: plainMd, technical: technicalMd };
const META: Record<Version, { label: string; blurb: string }> = {
  plain: { label: "Plain-English", blurb: "The whole protocol explained for any reader — no blockchain background required." },
  technical: { label: "Technical", blurb: "The full specification: consensus, privacy circuits, execution, and the mesh." },
};

// Per-version: an on-page Contents list (level-2 headings) + the rendered body.
function contentsHtml(md: string): string {
  const toc = tocFromMarkdown(md).filter((h) => h.level === 2);
  if (!toc.length) return "";
  return (
    `<nav class="wp-toc" aria-label="Contents"><div class="wp-toc-title">Contents</div><ul>` +
    toc.map((h) => `<li><a href="#${h.id}">${h.text}</a></li>`).join("") +
    `</ul></nav>`
  );
}

function versionHtml(v: Version): string {
  return contentsHtml(SOURCES[v]) + `<article class="wp-prose">${renderMarkdown(SOURCES[v])}</article>`;
}

const initial: Version = location.hash.replace("#", "") === "technical" ? "technical" : "plain";

const page = `
<section class="section container-x">
  <div class="reveal">
    <span class="chip">Whitepaper</span>
    <h1 class="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">PYRAX Network <span class="brand-text">Whitepaper</span></h1>
    <p class="mt-4 max-w-2xl text-[var(--color-muted)]">A from-scratch Layer-1 — GhostDAG consensus, shielded-by-default privacy, a multi-VM L2/L3, and an ISP-resistant mesh. Read it whichever way suits you:</p>
    <div class="mt-6 flex flex-wrap items-center gap-3">
      <div class="wp-toggle" role="tablist" aria-label="Whitepaper version">
        <button data-wp="plain" role="tab" class="wp-tab">${META.plain.label}</button>
        <button data-wp="technical" role="tab" class="wp-tab">${META.technical.label}</button>
      </div>
      <button id="wp-print" class="btn btn-ghost" type="button">${icon("book", "h-4 w-4")} Download / Print PDF</button>
    </div>
    <p id="wp-blurb" class="mt-3 text-sm text-[var(--color-faint)]"></p>
  </div>
</section>
<section class="container-x pb-24">
  <div id="wp-content" class="wp-content"></div>
</section>`;

const main = document.getElementById("main");
if (main) main.innerHTML = page;
mountChrome("Whitepaper");

const content = document.getElementById("wp-content");
const blurb = document.getElementById("wp-blurb");
const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>(".wp-tab"));

function setVersion(v: Version, updateHash = true): void {
  if (content) content.innerHTML = versionHtml(v);
  if (blurb) blurb.textContent = META[v].blurb;
  tabs.forEach((t) => t.classList.toggle("is-active", t.dataset.wp === v));
  if (updateHash) history.replaceState(null, "", `#${v}`);
}

tabs.forEach((t) => t.addEventListener("click", () => setVersion((t.dataset.wp as Version) ?? "plain")));

const printBtn = document.getElementById("wp-print");
if (printBtn) printBtn.addEventListener("click", () => window.print());

setVersion(initial, false);
