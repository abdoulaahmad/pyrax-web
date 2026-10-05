// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Specialized top navigation bar for the Neurax AI protocol page (/neurax).
// Features the Futuristic NEURAX Tech Logo, live Stream B status, Neurax chapter
// navigation, Pyrax ecosystem dropdown, language switcher, and Launch Compute CTA.
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LOCALES, localizePath } from "../i18n/config";
import { DOMAINS } from "../lib/endpoints";
import { useT } from "../i18n";

const P = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export default function NeuraxNav({ lang = "en" }: { lang?: string }) {
  const t = useT(lang);
  const L = (p: string) => localizePath(lang, p);
  const [scrolled, setScrolled] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [ecoOpen, setEcoOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const ecoTimer = useRef<number | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const enterEco = () => {
    if (ecoTimer.current) window.clearTimeout(ecoTimer.current);
    setEcoOpen(true);
  };
  const leaveEco = () => {
    ecoTimer.current = window.setTimeout(() => setEcoOpen(false), 140);
  };

  const switchLang = (code: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (code === "en") {
      url.searchParams.delete("lang");
    } else {
      url.searchParams.set("lang", code);
    }
    document.cookie = `pyrax_lang=${code}; path=/; max-age=31536000; samesite=lax`;
    window.location.assign(url.toString());
  };

  const navLinks = [
    { label: "Overview", href: "#overview" },
    { label: "Circuit Pipeline", href: "#marketplace" },
    { label: "Native L1", href: "#native" },
    { label: "Dual-Vault", href: "#sidecars" },
  ];

  const ecoLinks = [
    { label: "Pyrax L1 Home", desc: "GhostDAG Tri-Stream Blockchain", href: L("/") },
    { label: "Consensus & Tech", desc: "GhostDAG + Stream A/B/C Architecture", href: L("/technology") },
    { label: "$PYRX Tokenomics", desc: "Dual-Yield Mining & Deflation", href: L("/token") },
    { label: "Developer Docs", desc: "EVM & WASM SDKs, APIs & RPCs", href: L("/developers") },
    { label: "Whitepaper", desc: "Protocol Specification v4.0", href: L("/whitepaper") },
  ];

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 border-b border-[color:var(--color-line)] bg-[rgba(5,6,9,0.96)] backdrop-blur-xl transition-shadow duration-300 ${
          scrolled ? "shadow-[0_12px_32px_rgba(0,0,0,0.45)]" : ""
        }`}
      >
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          {/* Left: Futuristic NEURAX Tech Logo + L1 Badge */}
          <div className="flex items-center gap-3 sm:gap-4">
            <a href={L("/neurax")} className="flex shrink-0 items-center py-1 group" aria-label="Neurax AI — home">
              <img
                src="/brand/neurax-logo.png"
                alt="NEURAX AI"
                className="nodrag h-7 sm:h-8 md:h-8.5 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.02]"
              />
            </a>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#FF6A00]/40 bg-[#FF6A00]/10 px-2.5 py-0.5 text-[9px] font-mono font-bold text-[#FF6A00] uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF6A00] animate-pulse"></span>
              L1 COMPUTE
            </span>
          </div>

          {/* Center: Technical Anchor Links + Ecosystem Dropdown */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="rounded-lg px-3 py-1.5 text-xs font-mono font-semibold uppercase tracking-wider text-[#8B93A1] hover:text-white hover:bg-white/[0.04] transition-all"
              >
                {link.label}
              </a>
            ))}

            {/* Ecosystem Menu */}
            <div className="relative" onMouseEnter={enterEco} onMouseLeave={leaveEco}>
              <button
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-mono font-semibold uppercase tracking-wider transition-all ${
                  ecoOpen ? "text-[#FF6A00] bg-white/[0.04]" : "text-[#8B93A1] hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                <span>Pyrax L1</span>
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 opacity-70" {...P}>
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              <AnimatePresence>
                {ecoOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 mt-1 w-64 rounded-2xl border border-[#1a1f2e] bg-[rgba(9,11,18,0.98)] p-2 shadow-2xl backdrop-blur-xl"
                  >
                    <div className="px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[#565e6d]">
                      Pyrax Ecosystem
                    </div>
                    {ecoLinks.map((item) => (
                      <a
                        key={item.href}
                        href={item.href}
                        className="flex flex-col rounded-xl px-3 py-2 text-left hover:bg-white/[0.05] transition group"
                      >
                        <span className="text-xs font-semibold text-white group-hover:text-[#FF6A00] transition">
                          {item.label}
                        </span>
                        <span className="text-[10px] text-[#7C8796]">{item.desc}</span>
                      </a>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right Cluster */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Stream B Live Status Pill */}
            <div className="hidden xl:flex items-center gap-2 rounded-full border border-[#FF6A00]/30 bg-[#FF6A00]/10 px-3 py-1 text-[10px] font-mono text-[#FF6A00] font-bold uppercase tracking-wider">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#FF6A00] animate-ping opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF6A00]"></span>
              </span>
              STREAM B GPU MESH
            </div>

            {/* Language Switcher */}
            <div className="relative hidden md:block">
              <button
                onClick={() => setLangOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs font-mono font-semibold text-muted transition hover:border-[#34405a] hover:text-white"
                aria-label="Language"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" {...P}>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
                </svg>
                {lang.toUpperCase()}
                <svg viewBox="0 0 24 24" className="h-3 w-3 opacity-60" {...P}>
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              <AnimatePresence>
                {langOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: 0.16 }}
                    className="absolute right-0 mt-2 max-h-[70vh] w-52 overflow-y-auto rounded-2xl border border-line bg-[rgba(10,12,19,0.98)] p-1.5 shadow-2xl backdrop-blur-xl z-50"
                  >
                    <div className="px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-faint">
                      {t("footer.selectLanguage")}
                    </div>
                    {LOCALES.map((lc) => (
                      <a
                        key={lc.code}
                        href={lc.code === "en" ? "?" : `?lang=${lc.code}`}
                        onClick={(e) => switchLang(lc.code, e)}
                        className={`flex items-center justify-between rounded-xl px-3 py-1.5 text-xs transition hover:bg-white/[0.04] ${
                          lc.code === lang ? "font-semibold text-[#FF6A00]" : "text-white"
                        }`}
                      >
                        <span>{lc.native}</span>
                        <span className="text-[0.62rem] uppercase text-faint">{lc.code}</span>
                      </a>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Cybernetic Visit PYRAX CTA */}
            <a
              href={L("/")}
              className="relative group p-[1px] rounded-full overflow-hidden transition-all duration-300 hover:scale-[1.04] active:scale-[0.98]"
            >
              {/* Rotating Conic Light Beam */}
              <span className="absolute inset-[-100%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_0deg_at_50%_50%,#FF6A00_0%,#FF9E40_25%,transparent_50%,#FF6A00_75%,#FF3D00_100%)] opacity-85 group-hover:opacity-100 transition-opacity" />
              {/* Ambient Glow */}
              <span className="absolute inset-0 rounded-full bg-[#FF6A00]/25 blur-md group-hover:bg-[#FF6A00]/45 transition-all duration-300" />
              {/* Inner Obsidian Pill */}
              <span className="relative flex items-center gap-2 rounded-full bg-[#080B10] px-4 sm:px-5 py-1.5 sm:py-2 text-xs font-mono font-bold uppercase tracking-wider text-white transition-colors duration-200 group-hover:bg-[#0d1017]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[#FF6A00] animate-ping opacity-80" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF6A00]" />
                </span>
                <span className="tracking-wider bg-gradient-to-r from-white via-[#FFF0E5] to-[#FFA040] bg-clip-text text-transparent group-hover:from-white group-hover:to-[#FF8000]">
                  Visit PYRAX
                </span>
                <span className="text-[#FF6A00] font-mono text-xs transition-transform duration-300 group-hover:translate-x-1">
                  &gt;_
                </span>
              </span>
            </a>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobile(true)}
              className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:text-white lg:hidden"
              aria-label="Menu"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" {...P}>
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobile && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] lg:hidden">
            <div className="absolute inset-0 bg-[rgba(3,4,7,0.7)] backdrop-blur-sm" onClick={() => setMobile(false)} />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 40 }}
              className="absolute right-0 top-0 h-full w-[86%] max-w-sm overflow-y-auto border-l border-line bg-[rgba(8,10,17,0.99)] p-5"
            >
              <div className="flex items-center justify-between border-b border-line pb-4">
                <img src="/brand/neurax-logo.png" alt="NEURAX AI" className="nodrag h-7 w-auto object-contain" />
                <button
                  onClick={() => setMobile(false)}
                  className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:text-white"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" {...P}>
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>

              {/* Status Badge */}
              <div className="mt-4 flex items-center gap-2 rounded-full border border-[#FF6A00]/40 bg-[#FF6A00]/10 px-3 py-1 text-[10px] font-mono text-[#FF6A00] font-bold uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF6A00] animate-pulse"></span>
                STREAM B GPU MESH · ACTIVE
              </div>

              {/* Chapter Links */}
              <div className="mt-6 space-y-1">
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#565e6d] mb-2 px-1">
                  Protocol Sections
                </div>
                {navLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobile(false)}
                    className="block rounded-lg px-3 py-2 text-sm font-mono text-[#c5cdd8] hover:bg-white/[0.05] hover:text-[#FF6A00] transition"
                  >
                    {link.label}
                  </a>
                ))}
              </div>

              {/* Ecosystem Links */}
              <div className="mt-6 border-t border-line-soft pt-4 space-y-1">
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#565e6d] mb-2 px-1">
                  Pyrax Ecosystem
                </div>
                {ecoLinks.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="block rounded-lg px-3 py-2 text-sm text-[#8B93A1] hover:bg-white/[0.05] hover:text-white transition"
                  >
                    {item.label}
                  </a>
                ))}
              </div>

              {/* CTA */}
              <a
                href={L("/")}
                onClick={() => setMobile(false)}
                className="mt-6 relative group block p-[1px] rounded-full overflow-hidden transition-all duration-300"
              >
                <span className="absolute inset-[-100%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_0deg_at_50%_50%,#FF6A00_0%,#FF9E40_25%,transparent_50%,#FF6A00_75%,#FF3D00_100%)] opacity-85" />
                <span className="relative flex items-center justify-center gap-2 rounded-full bg-[#080B10] px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-wider text-white">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-[#FF6A00] animate-ping opacity-80" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF6A00]" />
                  </span>
                  <span className="bg-gradient-to-r from-white to-[#FFA040] bg-clip-text text-transparent">
                    Visit PYRAX
                  </span>
                  <span className="text-[#FF6A00]">&gt;_</span>
                </span>
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
