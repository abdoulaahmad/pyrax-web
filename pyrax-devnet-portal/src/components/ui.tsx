// SPDX-License-Identifier: LicenseRef-Proprietary
import React from "react";
import { motion } from "framer-motion";
import { HORIZONTAL_LOGO, VERTICAL_LOGO } from "../lib/brand";

/* Brand mark rendered as a NON-SAVEABLE background image (inline data URI — no fetchable file),
 * with drag + context-menu disabled. Blocks casual logo theft (screenshots are unavoidable). */
export function BrandMark({ variant = "horizontal", className = "" }: { variant?: "horizontal" | "vertical"; className?: string }) {
  const uri = variant === "vertical" ? VERTICAL_LOGO : HORIZONTAL_LOGO;
  return (
    <div role="img" aria-label="PYRAX" onContextMenu={(e) => e.preventDefault()} onDragStart={(e) => e.preventDefault()}
      className={`nodrag bg-contain bg-center bg-no-repeat ${className}`} style={{ backgroundImage: `url("${uri}")` }} />
  );
}

/* ----------------------------------------------------------------- icons (stroke, 1.6) */
const P = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
export const Icon: Record<string, (p: { className?: string }) => React.ReactNode> = {
  grid: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>),
  droplet: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P}><path d="M12 3s6 6.5 6 11a6 6 0 1 1-12 0c0-4.5 6-11 6-11Z"/></svg>),
  download: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P}><path d="M12 4v11m0 0 4-4m-4 4-4-4"/><path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2"/></svg>),
  users: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P}><circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 5.5a3.2 3.2 0 0 1 0 6.3"/><path d="M17.5 14.5A5.5 5.5 0 0 1 21 20"/></svg>),
  power: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P}><path d="M12 3v8"/><path d="M6.5 6.5a8 8 0 1 0 11 0"/></svg>),
  activity: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>),
  edit: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/></svg>),
  trophy: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P}><path d="M7 4h10v4a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M9 14.5V18m6-3.5V18M8 21h8M9 18h6"/></svg>),
  chat: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P}><path d="M21 15a3 3 0 0 1-3 3H8l-4 3V6a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3Z"/></svg>),
  copy: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P}><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>),
  shield: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P}><path d="M12 3 5 6v5c0 4.5 3 7.8 7 9 4-1.2 7-4.5 7-9V6l-7-3Z"/><path d="m9.5 12 1.8 1.8L15 10"/></svg>),
  user: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P}><circle cx="12" cy="8" r="3.4"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/></svg>),
  alert: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P}><path d="M12 3 2 20h20L12 3Z"/><path d="M12 9v5m0 3h.01"/></svg>),
  logout: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P}><path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3"/><path d="M10 12H3m0 0 3.5-3.5M3 12l3.5 3.5"/></svg>),
  check: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P}><path d="m5 12 4.5 4.5L19 7"/></svg>),
  clock: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>),
  mail: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>),
  plus: (p) => (<svg viewBox="0 0 24 24" className={p.className} {...P}><path d="M12 5v14M5 12h14"/></svg>),
  windows: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="currentColor"><path d="M3 5.5 10.5 4.4v7.1H3V5.5Zm0 13L10.5 19.6v-7H3v6Zm8.5 1.3L21 21V12.5h-9.5v7.3Zm0-15.6V11.5H21V3l-9.5 1.2Z"/></svg>),
  apple: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="currentColor"><path d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.8-3.5.8s-1.8-.8-3-.8c-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7 2-1.1 2.8-2.2c.9-1.3 1.2-2.5 1.3-2.6-.1 0-2.5-1-2.5-3.8Zm-2.3-7c.6-.8 1-1.9.9-3-.9 0-2 .6-2.6 1.4-.6.7-1.1 1.8-1 2.8 1 .1 2-.5 2.7-1.2Z"/></svg>),
  linux: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="currentColor"><path d="M12 2c-2 0-3 1.8-3 4 0 1.3-.6 2.2-1.4 3.4C6.4 11.2 5 12.8 5 15c0 1 .5 1.8 1.2 2.5-.3.6-.7 1.4-.2 2.1.6.8 2 .6 3.2.9.8.2 1.3.7 2.8.7s2-.5 2.8-.7c1.2-.3 2.6-.1 3.2-.9.5-.7.1-1.5-.2-2.1.7-.7 1.2-1.5 1.2-2.5 0-2.2-1.4-3.8-2.6-5.6C13.6 8.2 13 7.3 13 6c0-2.2-1-4-1-4Z"/></svg>),
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
 *  the hollow section numeral watermark the marketing site uses to anchor each section. */
export function PageHeader({ title, subtitle, eyebrow, index, action }: { title: string; subtitle?: string; eyebrow?: string; index?: string; action?: React.ReactNode }) {
  return (
    <div className="relative mb-8 overflow-hidden">
      {index && <div className="ghost-index pointer-events-none absolute -top-3 right-0 text-[5.5rem] sm:text-[7rem]">{index}</div>}
      <div className="relative flex flex-wrap items-end justify-between gap-4 pb-5 section-rule-b">
        <div className="min-w-0">
          {eyebrow && <div className="eyebrow eyebrow-rule mb-2.5">{eyebrow}</div>}
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

export function platformIcon(pl: string, className = "h-4 w-4") {
  if (pl === "windows") return <Icon.windows className={className} />;
  if (pl === "macos") return <Icon.apple className={className} />;
  return <Icon.linux className={className} />;
}
