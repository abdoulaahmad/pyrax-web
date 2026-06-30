// SPDX-License-Identifier: LicenseRef-Proprietary
//
// The explorer's animated dashboard sidebar — same shell language as the team/devnet portals:
// glass rail, grouped nav, a sliding active pill (framer-motion layoutId), a collapse toggle, and a
// mobile drawer. Persists across Astro view-transition navigations; tracks the active route via the
// astro:page-load event. Fully responsive.
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BrandMark } from "./ui";

const I: Record<string, React.ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  box: <><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" /><path d="m3 8 9 5 9-5M12 13v8" /></>,
  swap: <><path d="M7 10h13M7 10l3-3M7 10l3 3" /><path d="M17 14H4m13 0-3-3m3 3-3 3" /></>,
  dag: <><circle cx="6" cy="6" r="2.4" /><circle cx="18" cy="6" r="2.4" /><circle cx="12" cy="18" r="2.4" /><path d="M7.6 7.6 11 16M16.4 7.6 13 16M8 6h8" /></>,
  file: <><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8l-5-5Z" /><path d="M14 3v5h5M8 13h8M8 17h8" /></>,
  coin: <><ellipse cx="12" cy="6" rx="8" ry="3.2" /><path d="M4 6v6c0 1.8 3.6 3.2 8 3.2s8-1.4 8-3.2V6M4 12v6c0 1.8 3.6 3.2 8 3.2s8-1.4 8-3.2v-6" /></>,
  check: <path d="m5 12 4.5 4.5L19 7" />,
  shield: <><path d="M12 3 5 6v5c0 4.5 3 7.8 7 9 4-1.2 7-4.5 7-9V6l-7-3Z" /><path d="m9.5 12 1.8 1.8L15 10" /></>,
  activity: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  flame: <path d="M12 3c1 3 4 4 4 8a4 4 0 0 1-8 0c0-1.5.6-2.3 1.2-3C9.8 9 10 7 9 5c2 .5 3 1.5 3 3 0-1.7 0-3.5 0-5Z" />,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 5.5a3.2 3.2 0 0 1 0 6.3" /><path d="M17.5 14.5A5.5 5.5 0 0 1 21 20" /></>,
  list: <><path d="M8 6h12M8 12h12M8 18h12" /><circle cx="3.5" cy="6" r="1" /><circle cx="3.5" cy="12" r="1" /><circle cx="3.5" cy="18" r="1" /></>,
  terminal: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="m7 9 3 3-3 3M13 15h4" /></>,
};
const Glyph = ({ k }: { k: string }) => <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{I[k]}</svg>;

const NAV: { group: string; items: { href: string; label: string; icon: string }[] }[] = [
  { group: "Chain", items: [
    { href: "/", label: "Overview", icon: "grid" },
    { href: "/blocks", label: "Blocks", icon: "box" },
    { href: "/txs", label: "Transactions", icon: "swap" },
    { href: "/dag", label: "DAG & Streams", icon: "dag" },
  ]},
  { group: "Smart Contracts", items: [
    { href: "/contracts", label: "Contracts", icon: "file" },
    { href: "/tokens", label: "Tokens", icon: "coin" },
    { href: "/verify", label: "Verify", icon: "check" },
  ]},
  { group: "Privacy", items: [
    { href: "/shielded", label: "Shielded Pool", icon: "shield" },
  ]},
  { group: "Network", items: [
    { href: "/network", label: "Network", icon: "activity" },
    { href: "/gas", label: "Gas Tracker", icon: "flame" },
    { href: "/validators", label: "Validators", icon: "users" },
  ]},
  { group: "Tools", items: [
    { href: "/logs", label: "Event Logs", icon: "list" },
    { href: "/rpc", label: "RPC Playground", icon: "terminal" },
  ]},
];

const isActive = (href: string, path: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/") || path.startsWith(href.replace(/s$/, "") + "/"));

function NavList({ path, collapsed, pillId, onPick }: { path: string; collapsed: boolean; pillId: string; onPick?: () => void }) {
  return (
    <nav className="space-y-5">
      {NAV.map((g) => (
        <div key={g.group}>
          {!collapsed && <div className="px-3 pb-1 text-[0.62rem] font-semibold uppercase tracking-wider text-faint">{g.group}</div>}
          <div className="space-y-0.5">
            {g.items.map((it) => {
              const on = isActive(it.href, path);
              return (
                <a key={it.href} href={it.href} onClick={onPick} title={collapsed ? it.label : undefined}
                  className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${on ? "text-ink" : "text-muted hover:text-ink"} ${collapsed ? "justify-center" : ""}`}>
                  {on && <motion.span layoutId={pillId} className="absolute inset-0 rounded-lg border border-[color:rgba(245,134,34,0.35)] bg-[rgba(245,134,34,0.08)]" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                  <span className="relative z-10"><Glyph k={it.icon} /></span>
                  {!collapsed && <span className="relative z-10 font-medium">{it.label}</span>}
                </a>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export default function Sidebar() {
  const [path, setPath] = useState("/");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const update = () => setPath(window.location.pathname);
    update();
    try { setCollapsed(localStorage.getItem("pyrax:expl-collapsed") === "1"); } catch {}
    document.addEventListener("astro:page-load", update);
    const openMobile = () => setMobileOpen(true);
    window.addEventListener("pyrax:open-nav", openMobile);
    return () => { document.removeEventListener("astro:page-load", update); window.removeEventListener("pyrax:open-nav", openMobile); };
  }, []);
  useEffect(() => { setMobileOpen(false); }, [path]);
  function toggleCollapse() { setCollapsed((c) => { const n = !c; try { localStorage.setItem("pyrax:expl-collapsed", n ? "1" : "0"); } catch {} document.documentElement.style.setProperty("--expl-rail", n ? "5rem" : "16rem"); return n; }); }
  useEffect(() => { document.documentElement.style.setProperty("--expl-rail", collapsed ? "5rem" : "16rem"); }, [collapsed]);

  return (
    <>
      {/* desktop rail */}
      <aside className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-[rgba(8,10,17,0.72)] p-3 backdrop-blur transition-[width] duration-300 md:flex ${collapsed ? "w-20" : "w-64"}`}>
        <div className={`flex items-center px-2 py-2 ${collapsed ? "justify-center" : "justify-between"}`}>
          <a href="/" className="flex items-center gap-2 nodrag">{collapsed ? <BrandMark variant="vertical" className="h-7 w-7" /> : <><BrandMark variant="horizontal" className="h-7 w-[5.1rem]" /><span className="rounded-md border border-line px-1.5 py-[0.15rem] text-[0.55rem] font-bold uppercase tracking-wider text-faint">Explorer</span></>}</a>
        </div>
        <div className="mt-4 flex-1 overflow-y-auto pr-0.5"><NavList path={path} collapsed={collapsed} pillId="pill-d" /></div>
        <button onClick={toggleCollapse} className="mt-2 flex items-center justify-center gap-2 rounded-lg border border-line py-1.5 text-xs text-muted hover:text-ink" aria-label="Collapse sidebar">
          <motion.svg animate={{ rotate: collapsed ? 180 : 0 }} viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m15 6-6 6 6 6" /></motion.svg>{!collapsed && "Collapse"}
        </button>
      </aside>

      {/* mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="md:hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <motion.aside initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", stiffness: 380, damping: 38 }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[84vw] flex-col border-r border-line bg-[rgba(8,10,17,0.98)] p-4">
              <div className="flame-bar -mx-4 -mt-4 mb-4 h-1" />
              <div className="flex items-center justify-between px-1"><a href="/" className="flex items-center gap-2"><BrandMark variant="horizontal" className="h-7 w-[5.1rem]" /><span className="rounded-md border border-line px-1.5 py-[0.15rem] text-[0.55rem] font-bold uppercase tracking-wider text-faint">Explorer</span></a><button onClick={() => setMobileOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted">✕</button></div>
              <div className="mt-5 flex-1 overflow-y-auto"><NavList path={path} collapsed={false} pillId="pill-m" onPick={() => setMobileOpen(false)} /></div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
