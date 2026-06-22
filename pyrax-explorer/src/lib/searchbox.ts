// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// The explorer's universal search: detects an address / transaction hash / block number and routes to
// the right detail page. searchBarHtml() renders the bar; wireSearch() attaches the submit behaviour.

import { icon } from "@pyrax/shared";
import { isAddress, isHash32, isBlockNumber } from "./format.js";

export function searchBarHtml(big = false): string {
  return `
    <form class="expl-search${big ? " expl-search-lg" : ""}" data-search role="search">
      <span class="expl-search-ic">${icon("search", "h-5 w-5")}</span>
      <input type="text" class="expl-search-input" data-search-input autocomplete="off" autocapitalize="off"
        spellcheck="false" placeholder="Search by address · txn hash · block number" aria-label="Search the blockchain" />
      <button type="submit" class="expl-search-btn">Search</button>
      <div class="expl-search-hint" data-search-hint hidden></div>
    </form>`;
}

/** Resolve a query to a destination URL, or null if unrecognised. */
export function resolveQuery(raw: string): string | null {
  const q = raw.trim();
  if (!q) return null;
  if (isAddress(q)) return `/address.html?a=${q}`;
  if (isHash32(q)) return `/tx.html?hash=${q}`; // 32-byte hash → tx first; the tx page falls back to a block lookup
  if (isBlockNumber(q)) return `/block.html?number=${q}`;
  return null;
}

export function wireSearch(root: ParentNode = document): void {
  root.querySelectorAll<HTMLFormElement>("[data-search]").forEach((form) => {
    if (form.dataset.searchWired) return;
    form.dataset.searchWired = "1";
    const input = form.querySelector<HTMLInputElement>("[data-search-input]");
    const hint = form.querySelector<HTMLElement>("[data-search-hint]");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const dest = resolveQuery(input?.value ?? "");
      if (dest) {
        window.location.assign(dest);
      } else if (hint) {
        hint.hidden = false;
        hint.textContent = "Enter a valid address (0x + 40 hex), transaction hash (0x + 64 hex), or block number.";
      }
    });
    input?.addEventListener("input", () => {
      if (hint && !hint.hidden) hint.hidden = true;
    });
  });
}
