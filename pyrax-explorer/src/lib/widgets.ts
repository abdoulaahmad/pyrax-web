// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// Reusable explorer UI building blocks — HTML-string builders (brand-styled via styles.css) plus the
// copy-to-clipboard wiring. Keeps the pages declarative and consistent.

import { icon } from "@pyrax/shared";
import { escapeHtml, shorten } from "./format.js";

/** Page header: title + optional subtitle + optional right-aligned slot. */
export function pageHead(title: string, subtitle = "", right = ""): string {
  return `
    <header class="expl-pagehead">
      <div>
        <h1 class="expl-h1">${escapeHtml(title)}</h1>
        ${subtitle ? `<p class="expl-sub">${subtitle}</p>` : ""}
      </div>
      ${right ? `<div class="expl-pagehead-right">${right}</div>` : ""}
    </header>`;
}

export const card = (inner: string, cls = ""): string => `<div class="expl-card ${cls}">${inner}</div>`;

/** A compact stat tile. tone: brand | bolt | violet | positive | negative | "". */
export function statTile(label: string, value: string, sub = "", tone = ""): string {
  return `
    <div class="expl-stat${tone ? " expl-stat-" + tone : ""}">
      <div class="expl-stat-label">${escapeHtml(label)}</div>
      <div class="expl-stat-value">${value}</div>
      ${sub ? `<div class="expl-stat-sub">${sub}</div>` : ""}
    </div>`;
}

/** A detail key/value row (value is raw HTML). */
export const kv = (label: string, valueHtml: string): string => `
  <div class="expl-kv">
    <div class="expl-kv-k">${escapeHtml(label)}</div>
    <div class="expl-kv-v">${valueHtml}</div>
  </div>`;

export function badge(text: string, tone = ""): string {
  return `<span class="expl-badge${tone ? " expl-badge-" + tone : ""}">${escapeHtml(text)}</span>`;
}

// ---- monospace + copyable values --------------------------------------------------------------
export const mono = (s: string): string => `<span class="expl-mono">${escapeHtml(s)}</span>`;

/** A mono value with a copy button. */
export function copyable(value: string, displayText?: string): string {
  const shown = displayText ?? value;
  return `<span class="expl-copywrap"><span class="expl-mono">${escapeHtml(shown)}</span>${copyBtn(value)}</span>`;
}
export const copyBtn = (value: string): string =>
  `<button type="button" class="expl-copy" data-copy="${escapeHtml(value)}" aria-label="Copy to clipboard">${icon("blocks", "h-3.5 w-3.5")}</button>`;

// ---- entity links -----------------------------------------------------------------------------
export const addrLink = (a: string, short = true): string =>
  `<a class="expl-link-addr" href="/address.html?a=${a}">${escapeHtml(short ? shorten(a, 6, 6) : a)}</a>`;
export const txLink = (h: string, short = true): string =>
  `<a class="expl-link-tx" href="/tx.html?hash=${h}">${escapeHtml(short ? shorten(h, 8, 6) : h)}</a>`;
export const blockLink = (n: number | string, label?: string): string =>
  `<a class="expl-link-block" href="/block.html?number=${n}">${escapeHtml(label ?? "#" + n)}</a>`;

// ---- status panels ----------------------------------------------------------------------------
export const loading = (label = "Loading…"): string =>
  `<div class="expl-loading"><span class="expl-spinner" aria-hidden="true"></span>${escapeHtml(label)}</div>`;

export const errorPanel = (msg: string): string =>
  card(`<div class="expl-state expl-state-error">${icon("close", "h-5 w-5")}<div><div class="expl-state-title">Something went wrong</div><p>${escapeHtml(msg)}</p></div></div>`);

export const emptyPanel = (msg: string): string =>
  card(`<div class="expl-state">${icon("search", "h-5 w-5")}<div><p>${escapeHtml(msg)}</p></div></div>`);

export function offlinePanel(netName: string): string {
  return card(`
    <div class="expl-state expl-state-offline">
      ${icon("globe", "h-5 w-5")}
      <div>
        <div class="expl-state-title">${escapeHtml(netName)} isn't live yet</div>
        <p>No public RPC endpoint is wired for this network, so there's nothing to read right now. It will light up automatically the moment its node is online — or switch networks in the navbar above.</p>
      </div>
    </div>`);
}

/** Attach copy-to-clipboard behaviour to every [data-copy] inside `root`. Idempotent per element. */
export function wireCopy(root: ParentNode = document): void {
  root.querySelectorAll<HTMLButtonElement>("[data-copy]").forEach((btn) => {
    if (btn.dataset.copyWired) return;
    btn.dataset.copyWired = "1";
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const v = btn.dataset.copy ?? "";
      try {
        await navigator.clipboard.writeText(v);
        btn.classList.add("is-copied");
        window.setTimeout(() => btn.classList.remove("is-copied"), 1100);
      } catch {
        /* clipboard blocked — non-fatal */
      }
    });
  });
}
