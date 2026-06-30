// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Explorer top bar: a prominent universal search (block height / tx hash / address), a live network
// selector (green-pulse online / red offline), and the mobile menu trigger. Selecting a network sets
// a cookie so SSR pages query the right RPC, then reloads.
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface NetRow { key: string; chainId: number; name: string; short: string; color: string; status: string; online: boolean; height?: number }

function setNetCookie(chainId: number) { try { document.cookie = `pyrax_net=${chainId}; path=/; max-age=31536000; samesite=lax`; } catch {} }

export default function Topbar() {
  const [nets, setNets] = useState<NetRow[]>([]);
  const [sel, setSel] = useState<number>(0);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = () => fetch("/api/net").then((r) => r.json()).then((d) => { if (d.ok) { setNets(d.networks); setSel(d.selected); } }).catch(() => {});
    load();
    const i = window.setInterval(load, 12000);
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("mousedown", h);
    return () => { window.clearInterval(i); window.removeEventListener("mousedown", h); };
  }, []);

  function go(e?: React.FormEvent) {
    e?.preventDefault();
    const v = q.trim();
    if (!v) return;
    if (/^\d+$/.test(v)) location.href = `/block/${v}`;
    else if (/^0x[0-9a-fA-F]{64}$/.test(v)) location.href = `/tx/${v}`;
    else if (/^0x[0-9a-fA-F]{40}$/.test(v)) location.href = `/address/${v}`;
    else location.href = `/search?q=${encodeURIComponent(v)}`;
  }
  function pick(n: NetRow) { setNetCookie(n.chainId); setSel(n.chainId); setOpen(false); location.reload(); }
  const current = nets.find((n) => n.chainId === sel);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-[rgba(5,6,9,0.82)] backdrop-blur-xl">
      <div className="flame-bar h-[2px] w-full opacity-80" />
      <div className="flex h-14 items-center gap-3 px-3 sm:px-5">
        <button onClick={() => window.dispatchEvent(new Event("pyrax:open-nav"))} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line text-muted md:hidden" aria-label="Menu">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>

        <form onSubmit={go} className="relative min-w-0 flex-1 max-w-2xl">
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by block / tx hash / address…"
            className="w-full rounded-lg border border-line bg-[rgba(5,6,9,0.6)] py-2 pl-9 pr-3 text-sm text-ink placeholder:text-faint focus:border-[color:var(--color-brand)] focus:outline-none focus:ring-2 focus:ring-[rgba(245,134,34,0.18)]" />
        </form>

        <div ref={ref} className="relative shrink-0">
          <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 rounded-lg border border-line bg-[rgba(255,255,255,0.03)] px-2.5 py-1.5 text-sm text-muted transition hover:text-ink">
            {current ? (current.online ? <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--color-positive)] opacity-70" /><span className="relative inline-flex h-2 w-2 rounded-full bg-[color:var(--color-positive)]" /></span> : <span className="h-2 w-2 rounded-full bg-[color:var(--color-negative)] opacity-60" />) : <span className="h-2 w-2 rounded-full bg-faint" />}
            <span className="hidden font-medium text-ink sm:inline">{current?.name ?? "Network"}</span><span className="font-medium text-ink sm:hidden">{current?.short ?? "Net"}</span>
            <motion.svg animate={{ rotate: open ? 180 : 0 }} viewBox="0 0 24 24" className="h-3.5 w-3.5 text-faint" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="m6 9 6 6 6-6" /></motion.svg>
          </button>
          <AnimatePresence>
            {open && (
              <motion.div initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.98 }} transition={{ duration: 0.15 }}
                className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-line bg-[rgba(10,12,19,0.98)] shadow-2xl">
                <div className="border-b border-line px-3 py-2 text-[0.62rem] font-semibold uppercase tracking-wider text-faint">Network</div>
                {nets.map((n) => (
                  <button key={n.chainId} onClick={() => pick(n)} className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition hover:bg-[rgba(255,255,255,0.03)] ${n.chainId === sel ? "bg-[rgba(245,134,34,0.06)]" : ""}`}>
                    <span className="flex items-center gap-2.5">{n.online ? <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--color-positive)] opacity-70" /><span className="relative inline-flex h-2 w-2 rounded-full bg-[color:var(--color-positive)]" /></span> : <span className="h-2 w-2 rounded-full bg-[color:var(--color-negative)] opacity-60" />}<span><span className="block text-sm font-medium text-ink">{n.name}</span><span className="block text-xs text-faint">{n.online ? (n.height ? `#${n.height.toLocaleString()}` : "online") : "offline"} · chain {n.chainId}</span></span></span>
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: n.color }} />
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
