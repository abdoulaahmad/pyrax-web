// SPDX-License-Identifier: LicenseRef-Proprietary
//
// The custom, fully-animated mega-menu fixed topbar — the marketing site's signature chrome. Few
// top-level items, each opening a rich mega panel (Products, Industries, Technology, Developers), plus
// a live network selector, a 26-language switcher, and the Launch-App CTA. Fully responsive with a
// full-screen mobile drawer. React island (client:load); receives the active locale as a prop.
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CATEGORIES } from "../lib/industries";
import { LOCALES, localizePath, localeMeta } from "../i18n/config";
import { DOMAINS, SOCIAL } from "../lib/endpoints";
import { NETWORKS } from "../lib/networks";
import { useT } from "../i18n";

const P = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const Icon: Record<string, (c: string) => React.ReactNode> = {
  bank: (c) => (<svg viewBox="0 0 24 24" className={c} {...P}><path d="M3 10 12 4l9 6"/><path d="M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18"/></svg>),
  truck: (c) => (<svg viewBox="0 0 24 24" className={c} {...P}><path d="M3 6h11v9H3zM14 9h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/></svg>),
  health: (c) => (<svg viewBox="0 0 24 24" className={c} {...P}><path d="M12 21s-7-4.3-7-9.5A4.5 4.5 0 0 1 12 8a4.5 4.5 0 0 1 7 3.5C19 16.7 12 21 12 21Z"/><path d="M12 9v4M10 11h4"/></svg>),
  game: (c) => (<svg viewBox="0 0 24 24" className={c} {...P}><rect x="2" y="7" width="20" height="10" rx="5"/><path d="M7 11v2M6 12h2M15 12h.01M17 13h.01"/></svg>),
  building: (c) => (<svg viewBox="0 0 24 24" className={c} {...P}><rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01M10 21v-4h4v4"/></svg>),
  energy: (c) => (<svg viewBox="0 0 24 24" className={c} {...P}><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>),
  gov: (c) => (<svg viewBox="0 0 24 24" className={c} {...P}><path d="M3 10 12 4l9 6M4 10v8h16v-8M3 21h18M8 14v2M12 14v2M16 14v2"/></svg>),
  cart: (c) => (<svg viewBox="0 0 24 24" className={c} {...P}><path d="M3 4h2l2 12h11l2-8H6"/><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/></svg>),
  art: (c) => (<svg viewBox="0 0 24 24" className={c} {...P}><circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="10" r="1"/><circle cx="15" cy="9" r="1"/><path d="M12 21a3 3 0 0 1 0-6 2 2 0 0 0 0-4"/></svg>),
  chip: (c) => (<svg viewBox="0 0 24 24" className={c} {...P}><rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M10 2v3M14 2v3M10 19v3M14 19v3M2 10h3M2 14h3M19 10h3M19 14h3"/></svg>),
  explorer: (c) => (<svg viewBox="0 0 24 24" className={c} {...P}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>),
  node: (c) => (<svg viewBox="0 0 24 24" className={c} {...P}><circle cx="12" cy="5" r="2.4"/><circle cx="5" cy="18" r="2.4"/><circle cx="19" cy="18" r="2.4"/><path d="M12 7.4 6.6 15.8M12 7.4l5.4 8.4M7.4 18h9.2"/></svg>),
  wallet: (c) => (<svg viewBox="0 0 24 24" className={c} {...P}><rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18M16 14h2"/></svg>),
  flask: (c) => (<svg viewBox="0 0 24 24" className={c} {...P}><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3"/></svg>),
  book: (c) => (<svg viewBox="0 0 24 24" className={c} {...P}><path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z"/><path d="M8 3v16"/></svg>),
  shield: (c) => (<svg viewBox="0 0 24 24" className={c} {...P}><path d="M12 3 5 6v5c0 4.5 3 7.8 7 9 4-1.2 7-4.5 7-9V6z"/><path d="m9.5 12 1.8 1.8L15 10"/></svg>),
  layers: (c) => (<svg viewBox="0 0 24 24" className={c} {...P}><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5M3 17l9 5 9-5"/></svg>),
  lock: (c) => (<svg viewBox="0 0 24 24" className={c} {...P}><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>),
  coin: (c) => (<svg viewBox="0 0 24 24" className={c} {...P}><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5h4a1.8 1.8 0 0 1 0 3.6H9.5M9.5 13.1h4.2a1.8 1.8 0 0 1 0 3.6H9.5"/></svg>),
};

type PanelKey = "products" | "industries" | "technology" | "developers" | null;

export default function MegaNav({ lang = "en" }: { lang?: string }) {
  const t = useT(lang);
  const L = (p: string) => localizePath(lang, p);
  const [open, setOpen] = useState<PanelKey>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [netOpen, setNetOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [net, setNet] = useState<any>(null); // /api/net payload
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll(); window.addEventListener("scroll", onScroll, { passive: true });
    fetch("/api/net").then((r) => r.json()).then((d) => d.ok && setNet(d)).catch(() => {});
    const iv = window.setInterval(() => fetch("/api/net").then((r) => r.json()).then((d) => d.ok && setNet(d)).catch(() => {}), 12000);
    return () => { window.removeEventListener("scroll", onScroll); window.clearInterval(iv); };
  }, []);

  const enter = (k: PanelKey) => { if (closeTimer.current) window.clearTimeout(closeTimer.current); setOpen(k); };
  const leave = () => { closeTimer.current = window.setTimeout(() => setOpen(null), 120); };

  const selected = net?.networks?.find((n: any) => n.chainId === net?.selected) || NETWORKS[0];
  const pickNet = (chainId: number) => { document.cookie = `pyrax_net=${chainId}; path=/; max-age=31536000; samesite=lax`; location.reload(); };

  // Language switch: strip the current locale prefix from the LIVE path and rebuild it in the target
  // locale, then do a FULL navigation (not a client-side view transition). A full load is deliberate —
  // it guarantees the whole page (including this nav) re-renders server-side in the new language, which a
  // transition:persist'd island cannot do on its own.
  const restOf = (pathname: string) => {
    const parts = pathname.split("/").filter(Boolean);
    return parts.length && LOCALES.some((l) => l.code === parts[0]) ? "/" + parts.slice(1).join("/") : (pathname || "/");
  };
  const langHref = (code: string) => localizePath(code, restOf(typeof window !== "undefined" ? window.location.pathname : `/${lang}`));
  const switchLang = (code: string, e?: React.MouseEvent) => { e?.preventDefault(); window.location.assign(langHref(code)); };

  const topItems: { key: PanelKey; label: string }[] = [
    { key: "products", label: t("nav.products") },
    { key: "industries", label: t("nav.industries") },
    { key: "technology", label: t("nav.technology") },
    { key: "developers", label: t("nav.developers") },
  ];

  return (
    <>
      <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled || open ? "border-b border-[color:var(--color-line)] bg-[rgba(5,6,9,0.82)] backdrop-blur-xl" : "border-b border-transparent"}`} onMouseLeave={leave}>
        <nav className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:px-6">
          {/* logo */}
          <a href={L("/")} className="flex shrink-0 items-center" aria-label="PYRAX Network — home">
            <img src="/brand/logo-horizontal.svg" alt="PYRAX™ Network" className="nodrag h-8 w-auto sm:h-9" />
          </a>

          {/* desktop top-level */}
          <div className="ml-3 hidden items-center lg:flex">
            {topItems.map((it) => (
              <button key={it.key} onMouseEnter={() => enter(it.key)} onFocus={() => enter(it.key)}
                className={`relative rounded-lg px-3.5 py-2 text-sm font-medium transition ${open === it.key ? "text-ink" : "text-muted hover:text-ink"}`}>
                {it.label}
                {open === it.key && <motion.span layoutId="navpill" className="absolute inset-0 -z-10 rounded-lg bg-[rgba(255,255,255,0.05)]" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
              </button>
            ))}
            <a href={L("/token")} className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted transition hover:text-ink">{t("nav.token")}</a>
          </div>

          {/* right cluster */}
          <div className="ml-auto flex items-center gap-1.5">
            {/* network selector */}
            <div className="relative hidden sm:block">
              <button onClick={() => { setNetOpen((v) => !v); setLangOpen(false); }} className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-[color:#34405a] hover:text-ink">
                <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full rounded-full" style={{ background: selected?.online ? "#34d399" : "#6a7286", boxShadow: selected?.online ? "0 0 8px #34d399" : "none" }} />{selected?.online && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#34d399] opacity-60" />}</span>
                {selected?.short || "Seed"}
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" {...P}><path d="m6 9 6 6 6-6"/></svg>
              </button>
              <AnimatePresence>
                {netOpen && (
                  <motion.div initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.98 }} transition={{ duration: 0.16 }}
                    className="absolute right-0 mt-2 w-72 overflow-hidden rounded-2xl border border-line bg-[rgba(10,12,19,0.98)] p-1.5 shadow-2xl backdrop-blur-xl">
                    <div className="px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-faint">{t("footer.selectNetwork")}</div>
                    {(net?.networks || NETWORKS).map((n: any) => (
                      <button key={n.chainId} onClick={() => pickNet(n.chainId)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-[rgba(255,255,255,0.04)] ${n.chainId === net?.selected ? "bg-[rgba(255,255,255,0.03)]" : ""}`}>
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: n.online ? "#34d399" : "#3a4152", boxShadow: n.online ? "0 0 7px #34d399" : "none" }} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2 text-sm font-semibold text-ink">{n.name}<span className="rounded px-1 py-0.5 text-[0.55rem] font-bold uppercase" style={{ color: n.color, background: `${n.color}1a` }}>{n.mode}</span></span>
                          <span className="block truncate text-[0.68rem] text-faint">{n.online ? `#${Number(n.height || 0).toLocaleString()} · ${n.peers ?? 0} peers` : "offline"}</span>
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* language switcher */}
            <div className="relative hidden md:block">
              <button onClick={() => { setLangOpen((v) => !v); setNetOpen(false); }} className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:border-[color:#34405a] hover:text-ink" aria-label="Language">
                <svg viewBox="0 0 24 24" className="h-4 w-4" {...P}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>
                {lang.toUpperCase()}
              </button>
              <AnimatePresence>
                {langOpen && (
                  <motion.div initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.98 }} transition={{ duration: 0.16 }}
                    className="absolute right-0 mt-2 max-h-[70vh] w-56 overflow-y-auto rounded-2xl border border-line bg-[rgba(10,12,19,0.98)] p-1.5 shadow-2xl backdrop-blur-xl">
                    <div className="px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-faint">{t("footer.selectLanguage")}</div>
                    {LOCALES.map((lc) => (
                      <a key={lc.code} href={langHref(lc.code)} onClick={(e) => switchLang(lc.code, e)} className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm transition hover:bg-[rgba(255,255,255,0.04)] ${lc.code === lang ? "text-[color:var(--color-brand)]" : "text-ink"}`}>
                        <span>{lc.native}</span><span className="text-[0.62rem] uppercase text-faint">{lc.code}</span>
                      </a>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <a href={DOMAINS.explorer} className="hidden rounded-full bg-gradient-to-r from-[color:var(--color-gold)] via-[color:var(--color-brand)] to-[color:var(--color-ember)] px-4 py-2 text-sm font-bold text-[#1a0f06] transition hover:brightness-110 sm:inline-block">{t("nav.launchApp")}</a>

            <button onClick={() => setMobile(true)} className="grid h-9 w-9 place-items-center rounded-lg text-muted lg:hidden" aria-label="Menu"><svg viewBox="0 0 24 24" className="h-5 w-5" {...P}><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
          </div>
        </nav>

        {/* mega panels */}
        <AnimatePresence>
          {open && (
            <motion.div key={open} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}
              onMouseEnter={() => enter(open)} className="hidden lg:block">
              <div className="mx-auto max-w-7xl px-4 pb-6 sm:px-6">
                <div className="rounded-3xl border border-line bg-[rgba(9,11,18,0.98)] p-6 shadow-2xl backdrop-blur-xl">
                  {open === "products" && <ProductsPanel lang={lang} t={t} L={L} />}
                  {open === "industries" && <IndustriesPanel lang={lang} t={t} L={L} />}
                  {open === "technology" && <TechnologyPanel t={t} L={L} />}
                  {open === "developers" && <DevelopersPanel t={t} L={L} />}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* mobile drawer */}
      <AnimatePresence>
        {mobile && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] lg:hidden">
            <div className="absolute inset-0 bg-[rgba(3,4,7,0.7)] backdrop-blur-sm" onClick={() => setMobile(false)} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 400, damping: 40 }}
              className="absolute right-0 top-0 h-full w-[86%] max-w-sm overflow-y-auto border-l border-line bg-[rgba(8,10,17,0.99)] p-5">
              <div className="flex items-center justify-between">
                <img src="/brand/logo-horizontal.svg" alt="PYRAX™ Network" className="nodrag h-8 w-auto" />
                <button onClick={() => setMobile(false)} className="grid h-9 w-9 place-items-center rounded-lg text-muted"><svg viewBox="0 0 24 24" className="h-5 w-5" {...P}><path d="M6 6l12 12M18 6 6 18"/></svg></button>
              </div>
              <div className="mt-5 space-y-1">
                <MobileGroup title={t("nav.products")}>
                  <a href={DOMAINS.explorer} className="mobile-link">{t("nav.explorer")}</a>
                  <a href={DOMAINS.nodes} className="mobile-link">{t("nav.nodes")}</a>
                  <a href={DOMAINS.devnet} className="mobile-link">{t("nav.devnet")}</a>
                </MobileGroup>
                <MobileGroup title={t("nav.industries")}>
                  {CATEGORIES.map((c) => <a key={c.slug} href={L(`/industries/${c.slug}`)} className="mobile-link">{c.name}</a>)}
                  <a href={L("/industries")} className="mobile-link text-[color:var(--color-brand)]">{t("nav.exploreIndustries")}</a>
                </MobileGroup>
                <a href={L("/technology")} className="mobile-top">{t("nav.technology")}</a>
                <a href={L("/token")} className="mobile-top">{t("nav.token")}</a>
                <a href={L("/network")} className="mobile-top">{t("nav.network")}</a>
                <a href={L("/developers")} className="mobile-top">{t("nav.developers")}</a>
                <a href={L("/pitch")} className="mobile-top">{t("nav.pitch")}</a>
              </div>
              <a href={DOMAINS.explorer} className="mt-5 block rounded-full bg-gradient-to-r from-[color:var(--color-gold)] via-[color:var(--color-brand)] to-[color:var(--color-ember)] px-4 py-2.5 text-center text-sm font-bold text-[#1a0f06]">{t("nav.launchApp")}</a>
              <div className="mt-4 flex flex-wrap gap-2">
                {LOCALES.map((lc) => <a key={lc.code} href={langHref(lc.code)} onClick={(e) => switchLang(lc.code, e)} className={`rounded-full border px-2 py-1 text-xs ${lc.code === lang ? "border-[color:var(--color-brand)] text-[color:var(--color-brand)]" : "border-line text-faint"}`}>{lc.native}</a>)}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="h-16" />
    </>
  );
}

function MobileGroup({ title, children }: { title: string; children: React.ReactNode }) {
  const [o, setO] = useState(false);
  return (
    <div className="border-b border-line-soft">
      <button onClick={() => setO((v) => !v)} className="flex w-full items-center justify-between py-3 text-left text-base font-semibold text-ink">{title}<svg viewBox="0 0 24 24" className={`h-4 w-4 transition ${o ? "rotate-180" : ""}`} {...P}><path d="m6 9 6 6 6-6"/></svg></button>
      <AnimatePresence>{o && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pb-2">{children}</motion.div>}</AnimatePresence>
    </div>
  );
}

const featTone = "rounded-2xl border border-line bg-[radial-gradient(120%_120%_at_0%_0%,rgba(245,134,34,0.08),transparent_60%)] p-5";

function ProductsPanel({ t, L }: any) {
  const items = [
    { icon: "explorer", name: t("nav.explorer"), desc: t("navPanels.productsExplorerDesc", "GhostDAG blocks, shielded pool, multi-VM contracts."), href: DOMAINS.explorer, ext: true },
    { icon: "node", name: t("nav.nodes"), desc: t("navPanels.productsNodesDesc", "Run an Inferno node, join the mesh, earn rewards."), href: DOMAINS.nodes, ext: true },
    { icon: "flask", name: t("nav.devnet"), desc: t("navPanels.productsDevnetDesc", "The closed-alpha tester portal for PYRAX Forge."), href: DOMAINS.devnet, ext: true },
    { icon: "wallet", name: t("nav.wallet"), desc: t("navPanels.productsWalletDesc", "Shielded + transparent, keys never leave your device."), href: L("/technology"), ext: false },
  ];
  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <div className="grid gap-2.5 sm:grid-cols-2">
        {items.map((it) => (
          <a key={it.name} href={it.href} className="group flex items-start gap-3 rounded-2xl border border-transparent p-3 transition hover:border-line hover:bg-[rgba(255,255,255,0.02)]">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line text-[color:var(--color-brand)]">{Icon[it.icon]("h-5 w-5")}</span>
            <span><span className="flex items-center gap-1 text-sm font-bold text-ink">{it.name}{it.ext && <svg viewBox="0 0 24 24" className="h-3 w-3 text-faint transition group-hover:text-[color:var(--color-brand)]" {...P}><path d="M7 17 17 7M9 7h8v8"/></svg>}</span><span className="mt-0.5 block text-xs text-muted">{it.desc}</span></span>
          </a>
        ))}
      </div>
      <a href={L("/network")} className={`${featTone} flex flex-col justify-between`}>
        <div><div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-brand)]">{t("navPanels.productsFeatureEyebrow", "Network")}</div><div className="mt-2 font-display text-xl font-extrabold">{t("navPanels.productsFeatureTitle", "One binary, four networks")}</div><p className="mt-1.5 text-sm text-muted">{t("navPanels.productsFeatureBody", "Seed, Forge, Rise, and One — a faithful simulation on real primitives, gated to mainnet by external audit.")}</p></div>
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--color-brand)]">{t("navPanels.productsFeatureLink", "Explore the network →")}</span>
      </a>
    </div>
  );
}

function IndustriesPanel({ t, L }: any) {
  return (
    <div>
      <div className="mb-4 flex items-end justify-between">
        <div><div className="font-display text-lg font-extrabold">{t("navPanels.industriesTitle", "PYRAX for every industry")}</div><p className="text-sm text-muted">{t("navPanels.industriesBody", "10 categories · 100 business types · projections + buildathon dApp ideas.")}</p></div>
        <a href={L("/industries")} className="hidden shrink-0 text-sm font-semibold text-[color:var(--color-brand)] sm:inline">{t("nav.exploreIndustries")} →</a>
      </div>
      <div className="grid grid-cols-2 gap-1.5 md:grid-cols-5">
        {CATEGORIES.map((c) => (
          <a key={c.slug} href={L(`/industries/${c.slug}`)} className="group rounded-2xl border border-transparent p-3 transition hover:border-line hover:bg-[rgba(255,255,255,0.02)]">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-line" style={{ color: c.color }}>{Icon[c.icon]?.("h-5 w-5")}</span>
            <span className="mt-2 block text-sm font-bold text-ink">{c.name}</span>
            <span className="mt-0.5 block text-[0.7rem] text-faint">{c.tagline}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function TechnologyPanel({ t, L }: any) {
  const items = [
    { icon: "layers", name: t("navPanels.techConsensusName", "GhostDAG + TriStream"), desc: t("navPanels.techConsensusDesc", "A blockDAG ordered by GhostDAG; three streams, five seal lanes."), href: L("/technology#consensus") },
    { icon: "lock", name: t("navPanels.techPrivacyName", "Private by default"), desc: t("navPanels.techPrivacyDesc", "Shielded transfers with no-trusted-setup ZK proofs."), href: L("/technology#privacy") },
    { icon: "chip", name: t("navPanels.techVmsName", "Multi-VM (EVM/WASM/Cairo)"), desc: t("navPanels.techVmsDesc", "Three virtual machines, cross-VM calls, one chain."), href: L("/technology#vms") },
    { icon: "chip", name: t("navPanels.techNeuraxName", "NEURAX compute market"), desc: t("navPanels.techNeuraxDesc", "Verifiable, on-chain-settled AI & GPU compute."), href: L("/technology#neurax") },
    { icon: "shield", name: t("navPanels.techSecurityName", "Security & audits"), desc: t("navPanels.techSecurityDesc", "Formal invariants, threat model, external audit gate."), href: L("/technology#security") },
    { icon: "book", name: t("navPanels.techWhitepaperName", "Whitepaper v4"), desc: t("navPanels.techWhitepaperDesc", "The full technical + plain-English papers."), href: L("/whitepaper") },
  ];
  return (
    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it) => (
        <a key={it.name} href={it.href} className="group flex items-start gap-3 rounded-2xl border border-transparent p-3 transition hover:border-line hover:bg-[rgba(255,255,255,0.02)]">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line text-[color:var(--color-brand)]">{Icon[it.icon]("h-5 w-5")}</span>
          <span><span className="block text-sm font-bold text-ink">{it.name}</span><span className="mt-0.5 block text-xs text-muted">{it.desc}</span></span>
        </a>
      ))}
    </div>
  );
}

function DevelopersPanel({ t, L }: any) {
  const items = [
    { icon: "book", name: t("nav.docs"), desc: t("navPanels.devDocsDesc", "Guides, RPC reference, SDK."), href: L("/developers") },
    { icon: "book", name: t("nav.whitepaper"), desc: t("navPanels.devWhitepaperDesc", "Technical + plain-English v4."), href: L("/whitepaper") },
    { icon: "chip", name: "GitHub", desc: t("navPanels.devGithubDesc", "Apache-2.0 protocol, node & SDK."), href: SOCIAL.github, ext: true },
    { icon: "coin", name: t("nav.token"), desc: t("navPanels.devTokenDesc", "Tokenomics: 50B cap, emissions, fees."), href: L("/token") },
  ];
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
      <div className="grid gap-2.5 sm:grid-cols-2">
        {items.map((it) => (
          <a key={it.name} href={it.href} className="group flex items-start gap-3 rounded-2xl border border-transparent p-3 transition hover:border-line hover:bg-[rgba(255,255,255,0.02)]">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line text-[color:var(--color-brand)]">{Icon[it.icon]("h-5 w-5")}</span>
            <span><span className="flex items-center gap-1 text-sm font-bold text-ink">{it.name}{(it as any).ext && <svg viewBox="0 0 24 24" className="h-3 w-3 text-faint" {...P}><path d="M7 17 17 7M9 7h8v8"/></svg>}</span><span className="mt-0.5 block text-xs text-muted">{it.desc}</span></span>
          </a>
        ))}
      </div>
      <a href={L("/pitch")} className={`${featTone} flex flex-col justify-between`}>
        <div><div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-brand)]">{t("navPanels.devFeatureEyebrow", "Investors")}</div><div className="mt-2 font-display text-xl font-extrabold">{t("navPanels.devFeatureTitle", "See the pitch")}</div><p className="mt-1.5 text-sm text-muted">{t("navPanels.devFeatureBody", "An interactive, animated investor deck — the vision, the tech, the tokenomics, the ask.")}</p></div>
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--color-brand)]">{t("navPanels.devFeatureLink", "Open the deck →")}</span>
      </a>
    </div>
  );
}
