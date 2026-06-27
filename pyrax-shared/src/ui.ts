// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// Tiny presentational helpers + a stroke-icon set shared across every page, so the whole site
// speaks one visual language. Icons are inline SVG (no icon-font / network request).

const PATHS: Record<string, string> = {
  // network
  lanes: '<path d="M3 7h18M3 12h18M3 17h18"/><circle cx="7" cy="7" r="1.6"/><circle cx="14" cy="12" r="1.6"/><circle cx="10" cy="17" r="1.6"/>',
  streams: '<path d="M4 5c6 0 6 14 12 14M4 12h16M4 19c6 0 6-14 12-14"/>',
  shield: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
  cube: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  pulse: '<path d="M3 12h4l2-6 4 12 2-6h6"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 1 1 8 0v3"/>',
  // neurax / ai
  chip: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/><rect x="10" y="10" width="4" height="4" rx="1"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  wave: '<path d="M3 12c2 0 2-5 4-5s2 10 4 10 2-10 4-10 2 5 4 5"/>',
  spatial: '<circle cx="12" cy="12" r="3"/><path d="M5 5l2.5 2.5M19 5l-2.5 2.5M5 19l2.5-2.5M19 19l-2.5-2.5M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  market: '<path d="M4 9h16l-1 11H5z"/><path d="M8 9V7a4 4 0 0 1 8 0v2"/>',
  stack: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5M3 16.5l9 5 9-5"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
  code: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13 5l-2 14"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M3 17l5-4 4 3 3-2 6 5"/>',
  film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M17 9h4M3 15h4M17 15h4"/>',
  vector: '<circle cx="6" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 6h8M6 8v8a2 2 0 0 0 2 2h8"/>',
  // token
  coin: '<ellipse cx="12" cy="7" rx="8" ry="3.5"/><path d="M4 7v6c0 1.9 3.6 3.5 8 3.5s8-1.6 8-3.5V7M4 13v4c0 1.9 3.6 3.5 8 3.5s8-1.6 8-3.5v-4"/>',
  bolt: '<path d="M13 2L4 14h6l-1 8 9-12h-6z"/>',
  pie: '<path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M12 3v9h9A9 9 0 0 0 12 3z"/>',
  blocks: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>',
  scale: '<path d="M12 3v18M5 7h14M5 7l-2.5 6h5zM19 7l-2.5 6h5zM8 21h8"/>',
  rocket: '<path d="M12 3c3.5 1.5 5.5 5 5.5 9l-2.5 3h-6l-2.5-3c0-4 2-7.5 5.5-9z"/><circle cx="12" cy="9" r="1.6"/><path d="M9 18c-1 1.5-1 3-1 3s1.5 0 3-1M15 18c1 1.5 1 3 1 3s-1.5 0-3-1"/>',
  // tristream / hardware
  asic: '<rect x="4" y="8" width="16" height="9" rx="1.5"/><path d="M7 8V6M12 8V6M17 8V6M9 17v2M15 17v2"/><path d="M8 12h8"/>',
  gpu: '<rect x="3" y="7" width="18" height="10" rx="2"/><circle cx="9" cy="12" r="2.2"/><circle cx="15.5" cy="12" r="1.6"/><path d="M6 17v3"/>',
  stake: '<path d="M12 3v9M12 12l5-3M12 12l-5-3"/><path d="M5 12c0 4 3 7 7 9 4-2 7-5 7-9"/>',
  // extras
  flame: '<path d="M12 3c1 3-1 4-1 6a3 3 0 0 0 5 1c1 2 1 3 1 4a5 5 0 1 1-10 0c0-3 2-5 3-7 .8-1.6 1.5-2.7 2-4z"/>',
  map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>',
  download: '<path d="M12 3v12M8 11l4 4 4-4M4 19h16"/>',
  server: '<rect x="3" y="4" width="18" height="7" rx="1.5"/><rect x="3" y="13" width="18" height="7" rx="1.5"/><path d="M7 7.5h.01M7 16.5h.01"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M13 15h4"/>',
  book: '<path d="M5 4h11a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5H5z"/><path d="M5 4v13.5"/>',
  // ui
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/>',
  pause: '<path d="M9 5v14M15 5v14"/>',
  play: '<path d="M7 5l12 7-12 7z"/>',
  chevron: '<path d="M6 9l6 6 6-6"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  // socials
  x: '<path d="M4 4l16 16M20 4L4 20" />',
  discord: '<path d="M7 8c2-1 8-1 10 0M7 16c2 1 8 1 10 0M6 8c-1 3-1 6 0 9M18 8c1 3 1 6 0 9"/><circle cx="9.5" cy="12" r="1"/><circle cx="14.5" cy="12" r="1"/>',
  telegram: '<path d="M21 4L3 11l5 2 2 6 3-4 5 4z"/>',
  github: '<path d="M9 19c-4 1.5-4-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.3 4.3 0 0 0-.1-3.2s-1-.3-3.4 1.3a11.7 11.7 0 0 0-6 0C7.3 2.6 6.3 2.9 6.3 2.9a4.3 4.3 0 0 0-.1 3.2A4.6 4.6 0 0 0 5 9.3c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>',
};

/** An inline stroke SVG by name (unknown → a small dot). */
export function icon(name: string, cls = "h-5 w-5"): string {
  const body = PATHS[name] ?? '<circle cx="12" cy="12" r="3"/>';
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

/** The orb wrapper class for a feature tone. */
export function orbClass(tone?: string): string {
  if (tone === "bolt") return "icon-orb icon-orb-bolt";
  if (tone === "violet") return "icon-orb icon-orb-violet";
  return "icon-orb";
}

/** Minimal HTML escape for any user/dynamic text rendered into innerHTML. */
export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** A section eyebrow + heading + optional lead, centered. */
export function heading(eyebrow: string, title: string, lead?: string): string {
  return `
    <div class="reveal mx-auto max-w-2xl text-center">
      <span class="chip">${eyebrow}</span>
      <h2 class="mt-4 t-h2">${title}</h2>
      ${lead ? `<p class="mt-4 t-lead text-[var(--color-muted)]">${lead}</p>` : ""}
    </div>`;
}

/** A standard feature tile (icon orb + title + copy). */
export function featureCard(f: { title: string; desc: string; icon: string; tone?: string }): string {
  return `
    <article class="reveal card card-hover p-6" data-hoverlift>
      <div class="${orbClass(f.tone)}">${icon(f.icon)}</div>
      <h3 class="mt-4 t-h3">${f.title}</h3>
      <p class="mt-2 t-body text-[var(--color-muted)]">${f.desc}</p>
    </article>`;
}
