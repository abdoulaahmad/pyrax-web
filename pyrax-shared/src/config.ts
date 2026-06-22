// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// Shared chrome configuration — lets every PYRAX property render the SAME nav with correct link
// targets. On the main marketing site `navOrigin` stays "" (links remain root-relative); on a
// subdomain (explorer / nodes / peers) it is set to "https://pyraxchain.com" so every marketing
// link in the shared header/footer/command-palette resolves to the main site.
//
// `homeHref` is where the logo points — the consuming site's OWN home ("/" for the explorer), which
// is deliberately NOT origin-prefixed so the brand mark returns you to the property you're on.

let navOrigin = "";
let homeHref = "/";

export function configureChrome(opts: { navOrigin?: string; homeHref?: string }): void {
  if (opts.navOrigin !== undefined) navOrigin = opts.navOrigin.replace(/\/+$/, "");
  if (opts.homeHref !== undefined) homeHref = opts.homeHref;
}

export function getNavOrigin(): string {
  return navOrigin;
}

export function getHomeHref(): string {
  return homeHref;
}

/**
 * Resolve a nav href for the current property:
 *   • absolute (http/https), mailto/tel, and #anchors pass through untouched,
 *   • a root-relative marketing path ("/network.html") gets the origin prefix on subdomains,
 *   • anything else (a bare relative path) is left as-is.
 */
export function resolveHref(href: string): string {
  if (!href) return href;
  if (/^(https?:|mailto:|tel:|#)/i.test(href)) return href;
  if (href.startsWith("/")) return navOrigin + href;
  return href;
}
