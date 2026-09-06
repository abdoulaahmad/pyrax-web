// SPDX-License-Identifier: LicenseRef-Proprietary
//
// The homepage hero: a live, drifting GhostDAG canvas (nodes + multi-parent edges in the brand ramp)
// behind a staggered framer-motion headline. The DAG is the signature — a literal "web of blocks."
import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useT } from "../i18n";
import { localizePath } from "../i18n/config";
import { DOMAINS } from "../lib/endpoints";
import LiveStats from "./LiveStats.tsx";

function DagCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!,
      ctx = canvas.getContext("2d")!;
    let raf = 0,
      w = 0,
      h = 0,
      dpr = Math.min(2, window.devicePixelRatio || 1);
    const COLORS = ["#f68a24", "#5cbace", "#3983c3", "#fed23c"];
    type N = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      c: string;
      parents: number[];
    };
    let nodes: N[] = [];
    const seedRand = (() => {
      let s = 0x9e3779b9;
      return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 0xffffffff;
      };
    })();
    const build = () => {
      const count = Math.min(46, Math.max(22, Math.floor((w * h) / 42000)));
      nodes = Array.from({ length: count }, (_, i) => ({
        x: seedRand() * w,
        y: seedRand() * h,
        vx: (seedRand() - 0.5) * 0.18,
        vy: (seedRand() - 0.5) * 0.18,
        r: 1.4 + seedRand() * 2.2,
        c: COLORS[Math.floor(seedRand() * COLORS.length)],
        parents: i > 1 ? [i - 1 - Math.floor(seedRand() * Math.min(3, i))] : [],
      }));
      for (let i = 2; i < nodes.length; i++)
        if (seedRand() > 0.55)
          nodes[i].parents.push(
            Math.max(0, i - 2 - Math.floor(seedRand() * 3)),
          );
    };
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    };
    resize();
    window.addEventListener("resize", resize);
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      }
      // edges
      for (const n of nodes)
        for (const p of n.parents) {
          const q = nodes[p];
          if (!q) continue;
          const grad = ctx.createLinearGradient(n.x, n.y, q.x, q.y);
          grad.addColorStop(0, n.c + "00");
          grad.addColorStop(0.5, n.c + "44");
          grad.addColorStop(1, q.c + "00");
          ctx.strokeStyle = grad;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      // nodes
      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, 6.2832);
        ctx.fillStyle = n.c;
        ctx.shadowColor = n.c;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);
  return (
    <canvas
      ref={ref}
      className="absolute inset-0 h-full w-full opacity-70"
      aria-hidden
    />
  );
}

const fade = {
  hidden: { opacity: 0, y: 22 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 * i, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function Hero({ lang = "en" }: { lang?: string }) {
  const t = useT(lang);
  const L = (p: string) => localizePath(lang, p);
  return (
    <div className="relative overflow-hidden border-b border-line">
      <div className="pointer-events-none absolute inset-0">
        <DagCanvas />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(5,6,9,0.3),rgba(5,6,9,0.72)_78%,var(--color-bg))]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1100px_600px_at_74%_14%,rgba(218,84,39,0.17),transparent_60%)]" />

      {/* vertical rails — signature framing element from the brand system */}
      <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-14 items-center justify-center border-r border-line lg:flex">
        <span className="whitespace-nowrap font-mono text-[0.62rem] tracking-[0.42em] text-faint" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
          THE PRIVATE, HIGH-THROUGHPUT LAYER-1 — PYRAXNETWORK.ORG
        </span>
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-14 flex-col items-center justify-between border-l border-line py-6 lg:flex">
        <span className="font-mono text-[0.62rem] text-faint" style={{ writingMode: "vertical-rl" }}>/ 001</span>
        <span className="inline-flex h-5 items-end gap-[3px]">
          <span className="block h-[11px] w-1 skew-x-[-12deg] rounded-[1px] bg-[color:var(--color-bolt)]" />
          <span className="block h-[15px] w-1 skew-x-[-12deg] rounded-[1px] bg-[color:var(--color-brand)]" />
          <span className="block h-5 w-1 skew-x-[-12deg] rounded-[1px] bg-[color:var(--color-gold)]" />
        </span>
        <span className="font-mono text-[0.62rem] text-faint" style={{ writingMode: "vertical-rl" }}>EST. 2026</span>
      </div>

      <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-24 lg:px-16 lg:pt-28">
        <motion.div custom={0} variants={fade} initial="hidden" animate="show" className="mb-8 flex flex-wrap items-center gap-3">
          <span className="rounded-full border px-4 py-2 font-mono text-[0.68rem] uppercase tracking-[0.26em]" style={{ borderColor: "rgba(246,138,36,0.4)", color: "var(--color-brand)" }}>
            {t("hero.eyebrow")}
          </span>
          <span className="font-mono text-[0.68rem] tracking-[0.14em] text-faint">GHOSTDAG · SHIELDED · MIXNET</span>
        </motion.div>

        <motion.h1 custom={1} variants={fade} initial="hidden" animate="show" className="max-w-4xl font-display text-[clamp(2.5rem,6.2vw,5.5rem)] font-semibold uppercase leading-[0.98] tracking-tight">
          {lang === "en" ? (
            <>
              The blockchain<br />
              <span className="outline-text">built like the</span><br />
              <span className="flame-text">future demands<span className="text-ink" style={{ WebkitTextStroke: 0 }}>.</span></span>
            </>
          ) : (
            <span className="flame-text">{t("hero.title")}</span>
          )}
        </motion.h1>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <motion.div custom={2} variants={fade} initial="hidden" animate="show">
            <p className="max-w-xl border-l border-line-soft pl-5 text-base leading-relaxed text-muted sm:text-lg">
              {t("hero.subtitle")}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href={DOMAINS.explorer}
                className="rounded-full bg-gradient-to-r from-[color:var(--color-gold)] via-[color:var(--color-brand)] to-[color:var(--color-ember)] px-7 py-4 text-sm font-bold text-[#140803] shadow-[0_14px_44px_-12px_rgba(218,84,39,0.4)] transition hover:brightness-110"
              >
                {t("hero.ctaPrimary")}
              </a>
              <a
                href={L("/whitepaper")}
                className="rounded-full border border-line-soft px-7 py-4 text-sm font-semibold text-ink transition hover:border-[color:var(--color-bolt-bright)] hover:text-[color:var(--color-bolt-bright)]"
              >
                {t("hero.ctaSecondary")} →
              </a>
            </div>
          </motion.div>
          <motion.div custom={3} variants={fade} initial="hidden" animate="show">
            <LiveStats lang={lang} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
