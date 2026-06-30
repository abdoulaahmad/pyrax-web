// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Fixed, animated, fully-responsive top navigation. Glass bar that tightens on scroll, a phoenix
// brand mark, animated nav with a sliding active indicator, a live NETWORK dropdown (green pulse =
// online / flat red = offline, with online-peer counts), a primary CTA, and a mobile drawer.
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BrandMark, Icon } from "./ui";

interface NetRow { label: string; name: string; chainId: number; kind: string; color: string; note: string; online: boolean; peers: number }
const NAV = [
  { href: "/", label: "Home" },
  { href: "/map", label: "Network Map" },
  { href: "/peers", label: "Peers" },
  { href: "/run", label: "Run a Node" },
  { href: "/downloads", label: "Downloads" },
];
const SEL_KEY = "pyrax:net";

function useNetworks() {
  const [nets, setNets] = useState<NetRow[]>([]);
  const [def, setDef] = useState<string>("forge");
  useEffect(() => {
    let alive = true;
    const load = () => fetch("/api/networks").then((r) => r.json()).then((d) => { if (alive && d.ok) { setNets(d.networks); setDef(d.default); } }).catch(() => {});
    load();
    const i = window.setInterval(load, 12_000);
    return () => { alive = false; window.clearInterval(i); };
  }, []);
  return { nets, def };
}

function StatusDot({ online }: { online: boolean }) {
  return online ? (
    <span className="relative flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--color-positive)] opacity-70" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[color:var(--color-positive)]" />
    </span>
  ) : (
    <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[color:var(--color-negative)] opacity-60" />
  );
}

function NetworkMenu({ nets, current, onPick }: { nets: NetRow[]; current?: string; onPick: (n: NetRow) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, []);
  const sel = nets.find((n) => n.label === current) || nets[0];
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 rounded-lg border border-line bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-sm text-muted transition hover:text-ink hover:border-[#34405a]">
        {sel ? <StatusDot online={sel.online} /> : <span className="h-2.5 w-2.5 rounded-full bg-faint" />}
        <span className="font-medium text-ink">{sel?.name ?? "Network"}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="text-faint"><svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="m6 9 6 6 6-6" /></svg></motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.98 }} transition={{ duration: 0.16 }}
            className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border border-line bg-[rgba(10,12,19,0.98)] shadow-2xl backdrop-blur">
            <div className="border-b border-line px-3 py-2 text-[0.66rem] font-semibold uppercase tracking-wider text-faint">Networks</div>
            {nets.map((n) => (
              <button key={n.label} onClick={() => { onPick(n); setOpen(false); }} className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-[rgba(255,255,255,0.03)] ${n.label === current ? "bg-[rgba(245,134,34,0.06)]" : ""}`}>
                <span className="flex items-center gap-2.5">
                  <StatusDot online={n.online} />
                  <span><span className="block text-sm font-medium text-ink">{n.name}</span><span className="block text-xs text-faint">{n.online ? `${n.peers} online` : "offline"} · {n.kind}</span></span>
                </span>
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: n.color }} />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Topbar({ current = "/" }: { current?: string }) {
  const { nets, def } = useNetworks();
  const [scrolled, setScrolled] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [sel, setSel] = useState<string>("");

  useEffect(() => {
    try { setSel(localStorage.getItem(SEL_KEY) || ""); } catch {}
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => { if (!sel && def) setSel(def); }, [def]);
  useEffect(() => { document.body.style.overflow = drawer ? "hidden" : ""; }, [drawer]);

  function pickNet(n: NetRow) {
    try { localStorage.setItem(SEL_KEY, n.label); } catch {}
    setSel(n.label);
    window.location.href = `/peers?net=${n.label}`;
  }

  return (
    <>
      <header className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${scrolled ? "border-b border-line bg-[rgba(5,6,9,0.82)] backdrop-blur-xl" : "border-b border-transparent bg-transparent"}`}>
        <div className="flame-bar h-[3px] w-full opacity-90" />
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <a href="/" className="group flex items-center gap-2.5 nodrag" aria-label="PYRAX Nodes home">
            <motion.span whileHover={{ scale: 1.04 }} className="block"><BrandMark variant="horizontal" className="h-7 w-[5.2rem]" /></motion.span>
            <span className="hidden rounded-md border border-line px-1.5 py-[0.18rem] text-[0.6rem] font-bold uppercase tracking-wider text-faint sm:inline">Nodes</span>
          </a>

          <div className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => {
              const on = current === item.href || (item.href !== "/" && current.startsWith(item.href));
              return (
                <a key={item.href} href={item.href} className="relative rounded-lg px-3 py-2 text-sm font-medium transition">
                  <span className={on ? "text-ink" : "text-muted hover:text-ink"}>{item.label}</span>
                  {on && <motion.span layoutId="nav-active" className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full flame-bar" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
                </a>
              );
            })}
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden sm:block"><NetworkMenu nets={nets} current={sel} onPick={pickNet} /></div>
            <a href="/downloads" className="hidden btn btn-primary sm:inline-flex">Get the node</a>
            <button onClick={() => setDrawer(true)} className="grid h-10 w-10 place-items-center rounded-lg border border-line text-muted lg:hidden" aria-label="Open menu">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            </button>
          </div>
        </nav>
      </header>

      <AnimatePresence>
        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDrawer(false)} />
            <motion.aside initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 380, damping: 38 }}
              className="absolute inset-y-0 right-0 flex w-80 max-w-[88vw] flex-col border-l border-line bg-[rgba(8,10,17,0.98)] p-5">
              <div className="flame-bar -mx-5 -mt-5 mb-5 h-1" />
              <div className="flex items-center justify-between">
                <BrandMark variant="horizontal" className="h-7 w-[5.2rem]" />
                <button onClick={() => setDrawer(false)} className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted" aria-label="Close">✕</button>
              </div>
              <div className="mt-6 flex flex-col gap-1">
                {NAV.map((item, i) => (
                  <motion.a key={item.href} href={item.href} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 + i * 0.04 }}
                    className={`rounded-lg px-3 py-2.5 text-base font-medium ${current === item.href ? "bg-[rgba(245,134,34,0.08)] text-ink" : "text-muted"}`}>{item.label}</motion.a>
                ))}
              </div>
              <div className="mt-6">
                <div className="mb-2 px-1 text-[0.66rem] font-semibold uppercase tracking-wider text-faint">Network</div>
                <div className="rounded-xl border border-line">
                  {nets.map((n) => (
                    <button key={n.label} onClick={() => pickNet(n)} className={`flex w-full items-center justify-between gap-2 border-b border-line-soft px-3 py-2.5 text-left last:border-0 ${n.label === sel ? "bg-[rgba(245,134,34,0.06)]" : ""}`}>
                      <span className="flex items-center gap-2.5"><StatusDot online={n.online} /><span className="text-sm text-ink">{n.name}</span></span>
                      <span className="text-xs text-faint">{n.online ? `${n.peers} online` : "offline"}</span>
                    </button>
                  ))}
                </div>
              </div>
              <a href="/downloads" className="btn btn-primary mt-auto w-full justify-center">Get the node</a>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
