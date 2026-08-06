// SPDX-License-Identifier: LicenseRef-Proprietary
import React from "react";
import { motion } from "framer-motion";
import { HORIZONTAL_LOGO, VERTICAL_LOGO } from "../lib/brand";
import { navMeta, type ModuleKey } from "../lib/nav";

/* Brand mark rendered as a NON-SAVEABLE background image (inline data URI — no fetchable file),
 * with drag + context-menu disabled. Blocks casual logo theft (screenshots are unavoidable). */
export function BrandMark({ variant = "horizontal", className = "" }: { variant?: "horizontal" | "vertical"; className?: string }) {
  const uri = variant === "vertical" ? VERTICAL_LOGO : HORIZONTAL_LOGO;
  return (
    <div role="img" aria-label="PYRAX" onContextMenu={(e) => e.preventDefault()} onDragStart={(e) => e.preventDefault()}
      className={`nodrag bg-contain bg-center bg-no-repeat ${className}`} style={{ backgroundImage: `url("${uri}")` }} />
  );
}

/* ----------------------------------------------------------------- icons
 * Single-weight outline set on a shared 24px grid with a 2px safe margin, so every glyph reads at
 * the same optical size when placed in the nav's 16px box or a stat tile's 8x8 ring.
 *
 * House rules (what separates this from a pile of scraped SVGs):
 *  - one stroke weight (1.5) everywhere, never scaled per-icon
 *  - `vector-effect: non-scaling-stroke` so the hairline stays 1.5px at any rendered size
 *  - geometry snapped to whole/half units on the 24 grid — no 11.37 coordinates
 *  - round caps and joins, matching the brand's rounded type and 0.875rem radii
 *  - brand-mark icons (windows/apple/linux) are the only filled glyphs, since their trademarks
 *    are defined as solids and outlining them would misrepresent the marks
 */
const P = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  vectorEffect: "non-scaling-stroke" as const,
};
export const Icon: Record<string, (p: { className?: string }) => React.ReactNode> = {
  /* Workspace */
  grid: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P} aria-hidden="true"><rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/></svg>),
  download: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P} aria-hidden="true"><path d="M12 3v11"/><path d="M8 10.5 12 14.5 16 10.5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>),
  tag: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P} aria-hidden="true"><path d="M12.5 3H19a2 2 0 0 1 2 2v6.5a2 2 0 0 1-.6 1.4l-7 7a2 2 0 0 1-2.8 0l-6.5-6.5a2 2 0 0 1 0-2.8l7-7A2 2 0 0 1 12.5 3Z"/><circle cx="16.5" cy="7.5" r="1.5"/></svg>),

  /* Onboarding */
  route: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P} aria-hidden="true"><circle cx="6" cy="5.5" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="M6 8v4a4 4 0 0 0 4 4h4"/><path d="M14 16.5 16.5 18.5"/></svg>),
  book: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P} aria-hidden="true"><path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H10a2.5 2.5 0 0 1 2 1v15a2.5 2.5 0 0 0-2-1H5.5A1.5 1.5 0 0 1 4 16.5Z"/><path d="M20 4.5A1.5 1.5 0 0 0 18.5 3H14a2.5 2.5 0 0 0-2 1v15a2.5 2.5 0 0 1 2-1h4.5A1.5 1.5 0 0 0 20 16.5Z"/></svg>),
  target: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P} aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/></svg>),
  certificate: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P} aria-hidden="true"><circle cx="12" cy="9" r="5.5"/><path d="m9.5 13.5-1 7 3.5-2 3.5 2-1-7"/><path d="m10 9 1.5 1.5L14.5 7.5"/></svg>),

  /* Testing */
  beaker: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P} aria-hidden="true"><path d="M9 3v6.5L4.5 17a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L15 9.5V3"/><path d="M8 3h8"/><path d="M6.5 14h11"/></svg>),
  bug: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P} aria-hidden="true"><path d="M8 8V6.5a4 4 0 0 1 8 0V8"/><rect x="6.5" y="8" width="11" height="11" rx="5.5"/><path d="M3.5 11.5H6.5M17.5 11.5h3M3.5 17H6.5M17.5 17h3M12 8v11"/></svg>),

  /* Community + account */
  trophy: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P} aria-hidden="true"><path d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0Z"/><path d="M7.5 5.5H4.5V7a3 3 0 0 0 3 3M16.5 5.5h3V7a3 3 0 0 1-3 3"/><path d="M12 13.5V17"/><path d="M8.5 20.5h7"/><path d="M9.5 17h5v3.5h-5Z"/></svg>),
  chat: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P} aria-hidden="true"><path d="M20.5 13.5a3.5 3.5 0 0 1-3.5 3.5H9l-4.5 3.5V6.5A3.5 3.5 0 0 1 8 3h9a3.5 3.5 0 0 1 3.5 3.5Z"/><path d="M9 8.5h7M9 12h4.5"/></svg>),
  user: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P} aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5.5 20.5a6.5 6.5 0 0 1 13 0"/></svg>),
  users: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P} aria-hidden="true"><circle cx="9.5" cy="8" r="3.5"/><path d="M3.5 20.5a6 6 0 0 1 12 0"/><path d="M16 5a3.5 3.5 0 0 1 0 6.5"/><path d="M17.5 15a6 6 0 0 1 3 5.5"/></svg>),

  /* Legal + admin */
  shield: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P} aria-hidden="true"><path d="M12 3 5 5.5V11c0 4.5 2.9 8 7 9.5 4.1-1.5 7-5 7-9.5V5.5Z"/><path d="m9.5 11.5 2 2 3.5-4"/></svg>),
  scale: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P} aria-hidden="true"><path d="M12 4v16"/><path d="M8 20h8"/><path d="M4 7.5h16"/><path d="M4 7.5 6.5 13h-5Z"/><path d="M20 7.5 22.5 13h-5Z"/></svg>),
  filter: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P} aria-hidden="true"><path d="M4 5.5h16l-6 7v6l-4 2v-8Z"/></svg>),

  /* Feedback + utility */
  activity: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P} aria-hidden="true"><path d="M3 12h3.5L9 5.5l3 13 2.5-6.5H21"/></svg>),
  check: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P} aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7"/></svg>),
  alert: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P} aria-hidden="true"><path d="M10.3 4a2 2 0 0 1 3.4 0l7 12.5a2 2 0 0 1-1.7 3H5a2 2 0 0 1-1.7-3Z"/><path d="M12 9.5v4"/><path d="M12 17h.01"/></svg>),
  clock: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P} aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>),
  droplet: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P} aria-hidden="true"><path d="M12 3.5c3 3.3 6 6.6 6 10.2A6 6 0 0 1 6 13.7C6 10.1 9 6.8 12 3.5Z"/><path d="M12 17.5a3.5 3.5 0 0 0 3.5-3.5"/></svg>),
  power: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P} aria-hidden="true"><path d="M12 3.5v8"/><path d="M6.5 6.8a8 8 0 1 0 11 0"/></svg>),
  edit: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P} aria-hidden="true"><path d="M12.5 20.5H21"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4.5 1.5L5 15Z"/><path d="m14.5 5.5 3 3"/></svg>),
  copy: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P} aria-hidden="true"><rect x="9" y="9" width="11.5" height="11.5" rx="2.5"/><path d="M15.5 6.5V5.5A2 2 0 0 0 13.5 3.5h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h1"/></svg>),
  logout: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P} aria-hidden="true"><path d="M14.5 3.5H18a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-3.5"/><path d="M10 12H3.5"/><path d="M6.5 8.5 3 12l3.5 3.5"/></svg>),
  mail: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P} aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4.5 8 6.4 4.7a2 2 0 0 0 2.2 0L19.5 8"/></svg>),
  plus: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P} aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>),
  lock: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P} aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><path d="M12 14.5v2.5"/></svg>),
  sparkle: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P} aria-hidden="true"><path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9Z"/><path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7Z"/></svg>),

  /* Platform marks — filled, per trademark guidance. */
  windows: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="currentColor" aria-hidden="true"><path d="M3 5.5 10.5 4.4v7.1H3V5.5Zm0 13L10.5 19.6v-7H3v6Zm8.5 1.3L21 21V12.5h-9.5v7.3Zm0-15.6V11.5H21V3l-9.5 1.2Z"/></svg>),
  apple: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="currentColor" aria-hidden="true"><path d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.8-3.5.8s-1.8-.8-3-.8c-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7 2-1.1 2.8-2.2c.9-1.3 1.2-2.5 1.3-2.6-.1 0-2.5-1-2.5-3.8Zm-2.3-7c.6-.8 1-1.9.9-3-.9 0-2 .6-2.6 1.4-.6.7-1.1 1.8-1 2.8 1 .1 2-.5 2.7-1.2Z"/></svg>),
  linux: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="currentColor" aria-hidden="true"><path d="M12 2c-2 0-3 1.8-3 4 0 1.3-.6 2.2-1.4 3.4C6.4 11.2 5 12.8 5 15c0 1 .5 1.8 1.2 2.5-.3.6-.7 1.4-.2 2.1.6.8 2 .6 3.2.9.8.2 1.3.7 2.8.7s2-.5 2.8-.7c1.2-.3 2.6-.1 3.2-.9.5-.7.1-1.5-.2-2.1.7-.7 1.2-1.5 1.2-2.5 0-2.2-1.4-3.8-2.6-5.6C13.6 8.2 13 7.3 13 6c0-2.2-1-4-1-4Z"/></svg>),
};

/* ----------------------------------------------------------------- logo (real horizontal mark) */
export function Logo({ className = "h-7 w-[5.1rem]", tag = "Team" }: { className?: string; tag?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <BrandMark variant="horizontal" className={className} />
      {tag && <span className="rounded-md border border-line px-1.5 py-[0.18rem] font-mono text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-faint">{tag}</span>}
    </div>
  );
}

/* ----------------------------------------------------------------- primitives */
export function Card({ children, className = "", hover = false, delay = 0, onClick }: { children: React.ReactNode; className?: string; hover?: boolean; delay?: number; onClick?: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick} className={`card ${hover ? "card-hover" : ""} ${className}`}>{children}</motion.div>
  );
}

export function Button({ children, variant = "ghost", className = "", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  return <button className={`btn btn-${variant} ${className}`} {...rest}>{children}</button>;
}

/** Compact, centered pager for client-side paginated lists so a page never scrolls endlessly.
 *  Renders nothing when there is only one page. */
export function Pagination({ page, total, pageSize, onPage }: { page: number; total: number; pageSize: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  if (pages <= 1) return null;
  const clamped = Math.min(Math.max(1, page), pages);
  return (
    <div className="mt-4 flex items-center justify-center gap-3 text-sm">
      <Button variant="ghost" disabled={clamped <= 1} onClick={() => onPage(clamped - 1)}>← Prev</Button>
      <span className="text-faint tabular-nums">Page {clamped} of {pages} · {total} total</span>
      <Button variant="ghost" disabled={clamped >= pages} onClick={() => onPage(clamped + 1)}>Next →</Button>
    </div>
  );
}

export function StatTile({ label, value, sub, accent = "brand", icon, delay = 0 }: { label: string; value: React.ReactNode; sub?: string; accent?: "brand" | "water" | "positive"; icon?: React.ReactNode; delay?: number }) {
  const ring = accent === "water" ? "rgba(92,186,206,0.3)" : accent === "positive" ? "rgba(61,220,132,0.3)" : "rgba(246,138,36,0.3)";
  const tick = accent === "water" ? "tick-water" : accent === "positive" ? "tick-positive" : "";
  return (
    <Card hover delay={delay} className={`tick ${tick} p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="stat-caption">{label}</div>
        {icon && <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border" style={{ borderColor: ring }}>{icon}</div>}
      </div>
      {/* Tabular figures keep stat columns from jittering as live values update. */}
      <div className="stat-figure mt-4 text-[1.75rem]">{value}</div>
      {sub && <div className="mt-1.5 text-xs text-faint">{sub}</div>}
    </Card>
  );
}

export function Badge({ children, tone = "muted", className = "" }: { children: React.ReactNode; tone?: "brand" | "water" | "positive" | "muted" | "warning" | "danger", className?: string }) {
  const cls = tone === "brand" ? "chip-brand" : tone === "water" ? "chip-water" : tone === "positive" ? "chip-positive" : "chip-muted";
  return <span className={`chip ${cls} ${className}`.trim()}>{children}</span>;
}

/** Page title block. `eyebrow` renders the redesign's mono kicker above the heading; `index` draws
 *  the hollow section numeral watermark the marketing site uses to anchor each section.
 *
 *  Prefer passing `navKey` — eyebrow and index are then derived from the sidebar so they track the
 *  nav automatically. The explicit props stay for headers that aren't nav destinations (drawers,
 *  sub-views), and override the derived values when both are given. */
export function PageHeader({ title, subtitle, eyebrow, index, navKey, action }: { title: string; subtitle?: string; eyebrow?: string; index?: string; navKey?: ModuleKey; action?: React.ReactNode }) {
  const derived = navKey ? navMeta(navKey) : null;
  const kicker = eyebrow ?? derived?.eyebrow;
  const numeral = index ?? derived?.index;
  return (
    <div className="relative mb-8 overflow-hidden">
      {numeral && <div className="ghost-index pointer-events-none absolute -top-3 right-0 text-[5.5rem] sm:text-[7rem]">{numeral}</div>}
      <div className="relative flex flex-wrap items-end justify-between gap-4 pb-5 section-rule-b">
        <div className="min-w-0">
          {kicker && <div className="eyebrow eyebrow-rule mb-2.5">{kicker}</div>}
          <h1 className="display-caps text-[1.6rem] leading-[1.05] sm:text-[1.9rem]">{title}</h1>
          {subtitle && <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}

/** Heading for a block inside a page — the smaller sibling of PageHeader. */
export function SectionHeader({ title, eyebrow, action, className = "" }: { title: string; eyebrow?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={`mb-4 flex flex-wrap items-center justify-between gap-3 ${className}`.trim()}>
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
        <h3 className="panel-title">{title}</h3>
      </div>
      {action}
    </div>
  );
}

/** Flat surface for content nested inside a Card — no blur/gradient, so layers don't compound. */
export function Panel({ children, className = "", inset = false }: { children: React.ReactNode; className?: string; inset?: boolean }) {
  return <div className={`${inset ? "panel-inset" : "panel"} ${className}`.trim()}>{children}</div>;
}

/** One row of a divider-separated list. Pass `cols` as a grid-template-columns value. */
export function Row({ children, cols, className = "" }: { children: React.ReactNode; cols?: string; className?: string }) {
  return <div className={`row ${className}`.trim()} style={cols ? { gridTemplateColumns: cols } : undefined}>{children}</div>;
}

/** Slim gradient progress bar. `value` is a 0–100 percentage. */
export function Progress({ value, className = "" }: { value: number; className?: string }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className={`track ${className}`.trim()} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <motion.div className="track-fill" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} />
    </div>
  );
}

/**
 * Scrolling stat strip, ported from the marketing site's hero ticker.
 *
 * Two structural rules make this safe inside the portal shell, and both are load-bearing:
 *  1. The track is `w-max` — deliberately wider than the viewport — so the OUTER element must own
 *     `overflow-hidden`. Without it this component is itself a horizontal scrollbar.
 *  2. Items are duplicated and the keyframe translates -50%, so the loop seam is invisible. The
 *     duplicate is `aria-hidden`, otherwise screen readers announce every stat twice.
 */
export function Ticker({ items, className = "" }: { items: { k: string; v: string }[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <div className={`marquee-mask overflow-hidden border-y border-line bg-[rgba(8,10,17,0.55)] ${className}`.trim()}>
      <div className="ticker-track flex w-max py-3">
        {[...items, ...items].map((it, i) => (
          <span key={i} aria-hidden={i >= items.length ? "true" : undefined}
            className="inline-flex items-center gap-2.5 whitespace-nowrap border-r border-line-soft px-7 font-mono text-[0.74rem] text-muted">
            <b className="font-semibold text-[color:var(--color-gold)]">{it.k}</b>{it.v}
          </span>
        ))}
      </div>
    </div>
  );
}

export function platformIcon(pl: string, className = "h-4 w-4") {
  if (pl === "windows") return <Icon.windows className={className} />;
  if (pl === "macos") return <Icon.apple className={className} />;
  return <Icon.linux className={className} />;
}
