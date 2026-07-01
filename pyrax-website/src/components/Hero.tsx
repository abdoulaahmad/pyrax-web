// SPDX-License-Identifier: LicenseRef-Proprietary
//
// The homepage hero: a live, drifting GhostDAG canvas (nodes + multi-parent edges in the brand ramp)
// behind a staggered framer-motion headline. The DAG is the signature — a literal "web of blocks."
import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useT } from "../i18n";
import { localizePath } from "../i18n/config";
import { DOMAINS } from "../lib/endpoints";

function DagCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!, ctx = canvas.getContext("2d")!;
    let raf = 0, w = 0, h = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
    const COLORS = ["#f58722", "#60b8cc", "#7c5cff", "#fcd03d"];
    type N = { x: number; y: number; vx: number; vy: number; r: number; c: string; parents: number[] };
    let nodes: N[] = [];
    const seedRand = (() => { let s = 0x9e3779b9; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; }; })();
    const build = () => {
      const count = Math.min(46, Math.max(22, Math.floor((w * h) / 42000)));
      nodes = Array.from({ length: count }, (_, i) => ({
        x: seedRand() * w, y: seedRand() * h, vx: (seedRand() - 0.5) * 0.18, vy: (seedRand() - 0.5) * 0.18,
        r: 1.4 + seedRand() * 2.2, c: COLORS[Math.floor(seedRand() * COLORS.length)],
        parents: i > 1 ? [i - 1 - Math.floor(seedRand() * Math.min(3, i))] : [],
      }));
      for (let i = 2; i < nodes.length; i++) if (seedRand() > 0.55) nodes[i].parents.push(Math.max(0, i - 2 - Math.floor(seedRand() * 3)));
    };
    const resize = () => {
      const rect = canvas.getBoundingClientRect(); w = rect.width; h = rect.height;
      canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); build();
    };
    resize(); window.addEventListener("resize", resize);
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      }
      // edges
      for (const n of nodes) for (const p of n.parents) {
        const q = nodes[p]; if (!q) continue;
        const grad = ctx.createLinearGradient(n.x, n.y, q.x, q.y);
        grad.addColorStop(0, n.c + "00"); grad.addColorStop(0.5, n.c + "44"); grad.addColorStop(1, q.c + "00");
        ctx.strokeStyle = grad; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(q.x, q.y); ctx.stroke();
      }
      // nodes
      for (const n of nodes) {
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, 6.2832);
        ctx.fillStyle = n.c; ctx.shadowColor = n.c; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0;
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full opacity-70" aria-hidden />;
}

const fade = { hidden: { opacity: 0, y: 22 }, show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: 0.08 * i, duration: 0.6, ease: [0.22, 1, 0.36, 1] } }) };

export default function Hero({ lang = "en" }: { lang?: string }) {
  const t = useT(lang);
  const L = (p: string) => localizePath(lang, p);
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0"><DagCanvas /></div>
      <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(245,134,34,0.18),transparent_62%)] blur-3xl animate-floaty" />
      <div className="pointer-events-none absolute -right-32 top-20 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(28,99,166,0.16),transparent_62%)] blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,transparent,rgba(5,6,9,0.6)_70%,var(--color-bg))]" />
      <div className="relative mx-auto max-w-5xl px-6 pb-8 pt-28 text-center sm:pt-36">
        <motion.div custom={0} variants={fade} initial="hidden" animate="show" className="inline-flex items-center gap-2 rounded-full border border-line bg-[rgba(255,255,255,0.03)] px-3.5 py-1.5 text-xs font-semibold text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-brand)]" />{t("hero.eyebrow")}
        </motion.div>
        <motion.h1 custom={1} variants={fade} initial="hidden" animate="show" className="mx-auto mt-6 max-w-4xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
          {lang === "en"
            ? (<>The blockchain built like <span className="flame-text">the future demands</span>.</>)
            : (<span className="flame-text">{t("hero.title")}</span>)}
        </motion.h1>
        <motion.p custom={2} variants={fade} initial="hidden" animate="show" className="mx-auto mt-6 max-w-2xl text-lg text-muted">
          {t("hero.subtitle")}
        </motion.p>
        <motion.div custom={3} variants={fade} initial="hidden" animate="show" className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <a href={DOMAINS.explorer} className="rounded-full bg-gradient-to-r from-[color:var(--color-gold)] via-[color:var(--color-brand)] to-[color:var(--color-ember)] px-6 py-3 text-sm font-bold text-[#1a0f06] shadow-[0_10px_40px_-12px_rgba(245,134,34,0.6)] transition hover:brightness-110">{t("hero.ctaPrimary")}</a>
          <a href={L("/whitepaper")} className="rounded-full border border-line bg-[rgba(255,255,255,0.03)] px-6 py-3 text-sm font-semibold text-ink transition hover:border-[color:#34405a]">{t("hero.ctaSecondary")}</a>
        </motion.div>
      </div>
    </div>
  );
}
