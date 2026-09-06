// SPDX-License-Identifier: LicenseRef-Proprietary
//
// The interactive, animated investor pitch deck — a full-viewport slide stage with keyboard, click,
// dot, and swipe navigation, a progress bar, and framer-motion transitions. All figures are pulled from
// the code-verified shared data modules (tokenomics, industries, networks) so the deck can never drift
// from the /token page or the whitepaper. React island (client:load).
import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { TOKEN, ALLOCATIONS, FEES, fmt } from "../lib/tokenomics";
import { CATEGORIES, TOTAL_INDUSTRIES } from "../lib/industries";
import { NETWORKS } from "../lib/networks";
import { DOMAINS } from "../lib/endpoints";
import { useT } from "../i18n";

type T = (key: string, fallback?: string) => string;

const ease = [0.22, 1, 0.36, 1] as const;
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } } };

const Kicker = ({ children, color }: { children: React.ReactNode; color?: string }) => (
  <motion.div variants={item} className="eyebrow" style={color ? { color } : undefined}>{children}</motion.div>
);
const Title = ({ children }: { children: React.ReactNode }) => (
  <motion.h2 variants={item} className="mt-3 font-display text-3xl font-semibold uppercase leading-[1.02] sm:text-5xl">{children}</motion.h2>
);

// ---- slides -------------------------------------------------------------------------------------
type Slide = { id: string; label: string; render: (t: T) => React.ReactNode };

const marketRefs = (t: T) => [
  { m: "$16T", l: t("pitch.marketRef1Label", "Tokenized real-world assets by 2030"), s: t("pitch.marketRef1Source", "BCG") },
  { m: "$1.8T", l: t("pitch.marketRef2Label", "AI market by 2030"), s: t("pitch.marketRef2Source", "Statista / Grand View") },
  { m: "$3.6T", l: t("pitch.marketRef3Label", "Global digital payments by 2030"), s: t("pitch.marketRef3Source", "Statista") },
  { m: "100", l: t("pitch.marketRef4Label", "Business types PYRAX maps directly"), s: t("pitch.marketRef4Source", "This site") },
];

const built = (t: T) => [
  { n: "4", l: t("pitch.builtLabel1", "networks from one Rust binary") },
  { n: "3 VMs", l: t("pitch.builtLabel2", "EVM · WASM · Cairo, cross-VM") },
  { n: "500k", l: t("pitch.builtLabel3", "TPS design target (GhostDAG)") },
  { n: "ZK", l: t("pitch.builtLabel4", "shielded by default, no trusted setup") },
  { n: "100", l: t("pitch.builtLabel5", "industry playbooks + dApp ideas") },
  { n: "Apps", l: t("pitch.builtLabel6", "node, wallet, CLI, explorer — live") },
];

const SLIDES: Slide[] = [
  {
    id: "cover", label: "PYRAX",
    render: (t) => (
      <motion.div variants={stagger} initial="hidden" animate="show" className="flex h-full flex-col items-center justify-center text-center">
        <motion.img variants={item} src="/brand/logo-horizontal.svg" alt="PYRAX" className="nodrag h-16 w-auto sm:h-24" />
        <motion.h1 variants={item} className="mt-8 max-w-4xl font-display text-4xl font-extrabold uppercase leading-tight sm:text-6xl">{t("pitch.coverTitlePre", "The blockchain built like the ")}<span className="flame-text">{t("pitch.coverTitleFlame", "future demands")}</span></motion.h1>
        <motion.p variants={item} className="mt-5 max-w-2xl text-lg text-muted">{t("pitch.coverSubtitle", "Private by default. Parallel by design. Verifiable by proof. A from-scratch Layer-1 with a built-in market for AI compute.")}</motion.p>
        <motion.div variants={item} className="mt-8 flex items-center gap-3 rounded-full border border-line bg-[color:var(--color-surface)] px-5 py-2 text-sm text-muted">{t("pitch.coverInvestorDeck", "Investor Deck")} <span className="text-faint">·</span> <span className="text-ink">{t("pitch.coverConfidential", "Confidential")}</span></motion.div>
      </motion.div>
    ),
  },
  {
    id: "problem", label: "Problem",
    render: (t) => (
      <motion.div variants={stagger} initial="hidden" animate="show" className="mx-auto max-w-4xl">
        <Kicker>{t("pitch.kickerProblem", "The problem")}</Kicker>
        <Title>{t("pitch.problemTitle", "Public blockchains force a false choice")}</Title>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { t: t("pitch.problemCard1Title", "Privacy or transparency"), d: t("pitch.problemCard1Desc", "Transparent chains leak your entire financial life. Bolt-on privacy is an afterthought regulators can't audit.") },
            { t: t("pitch.problemCard2Title", "Speed or security"), d: t("pitch.problemCard2Desc", "Linear chains orphan honest work to stay safe, capping throughput far below what real applications need.") },
            { t: t("pitch.problemCard3Title", "Decentralized in name only"), d: t("pitch.problemCard3Desc", "Most networks lean on company-run bootstrap servers and privileged keys — single points of failure and control.") },
          ].map((x) => (
            <motion.div key={x.t} variants={item} className="rounded-3xl border border-line bg-[color:var(--color-surface)] p-6">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-[rgba(251,111,115,0.12)] text-[color:var(--color-negative)]"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></div>
              <h3 className="mt-4 font-bold text-ink">{x.t}</h3>
              <p className="mt-2 text-sm text-muted">{x.d}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    ),
  },
  {
    id: "solution", label: "Solution",
    render: (t) => (
      <motion.div variants={stagger} initial="hidden" animate="show" className="mx-auto max-w-4xl">
        <Kicker>{t("pitch.kickerSolution", "The solution")}</Kicker>
        <Title>{t("pitch.solutionTitle", "PYRAX refuses the trade-off")}</Title>
        <motion.p variants={item} className="mt-4 max-w-2xl text-lg text-muted">{t("pitch.solutionBody", "A GhostDAG for parallel throughput, shielded-by-default privacy with auditor viewing keys, three virtual machines, and a verifiable compute market — enforced as invariants in the lowest-level types.")}</motion.p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { t: t("pitch.solutionCard1Title", "Parallel"), d: t("pitch.solutionCard1Desc", "GhostDAG includes honest work instead of orphaning it."), c: "#f68a24" },
            { t: t("pitch.solutionCard2Title", "Private"), d: t("pitch.solutionCard2Desc", "Every transfer hides sender, receiver, amount — by default."), c: "#7c5cff" },
            { t: t("pitch.solutionCard3Title", "Decentralized"), d: t("pitch.solutionCard3Desc", "No bootstrap server. ISP-resistant Sphinx mixnet."), c: "#5cbace" },
            { t: t("pitch.solutionCard4Title", "Verifiable"), d: t("pitch.solutionCard4Desc", "Open-core, audit-gated, proofs over promises."), c: "#34d399" },
          ].map((x) => (
            <motion.div key={x.t} variants={item} className="rounded-3xl border border-line bg-[color:var(--color-surface)] p-6">
              <div className="h-1 w-10 rounded-full" style={{ background: x.c }} />
              <h3 className="mt-4 font-bold text-ink">{x.t}</h3>
              <p className="mt-2 text-sm text-muted">{x.d}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    ),
  },
  {
    id: "tech", label: "Technology",
    render: (t) => (
      <motion.div variants={stagger} initial="hidden" animate="show" className="mx-auto max-w-4xl">
        <Kicker>{t("pitch.kickerTechnology", "The technology")}</Kicker>
        <Title>{t("pitch.techTitle", "One binary, a whole stack")}</Title>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {[
            { t: t("pitch.techCard1Title", "GhostDAG + TriStream"), d: t("pitch.techCard1Desc", "Three streams over five seal lanes — ASIC, GPU, CPU — plus BLS proof-of-stake finality.") },
            { t: t("pitch.techCard2Title", "Shielded by default"), d: t("pitch.techCard2Desc", "Orchard-style notes and recursive zk-SNARKs with no trusted setup; viewing keys for oversight.") },
            { t: t("pitch.techCard3Title", "Multi-VM L2 + ZK-rollup L3"), d: t("pitch.techCard3Desc", "EVM, WASM, and Cairo with cross-VM calls; thousands of proofs fold into one.") },
            { t: t("pitch.techCard4Title", "NEURAX compute market"), d: t("pitch.techCard4Desc", "Idle GPUs run verifiable AI jobs, settled on-chain, priced at a fixed 8 PYRX per compute unit.") },
          ].map((x) => (
            <motion.div key={x.t} variants={item} className="rounded-2xl border border-line bg-[color:var(--color-surface)] p-5">
              <h3 className="font-bold text-ink">{x.t}</h3>
              <p className="mt-1.5 text-sm text-muted">{x.d}</p>
            </motion.div>
          ))}
        </div>
        <motion.div variants={item} className="mt-4 rounded-2xl border border-line bg-[radial-gradient(120%_120%_at_100%_0%,rgba(245,134,34,0.12),transparent_60%)] p-5 text-sm text-muted">
          {t("pitch.techFootnotePre", "51%-resistance across ")}<span className="text-ink">{t("pitch.techFootnoteEmph", "three uncorrelated resources")}</span>{t("pitch.techFootnotePost", " at once — ASIC + GPU/CPU hashpower and a staked supermajority — with finality that makes reverting a slashable offense.")}
        </motion.div>
      </motion.div>
    ),
  },
  {
    id: "market", label: "Market",
    render: (t) => (
      <motion.div variants={stagger} initial="hidden" animate="show" className="mx-auto max-w-4xl">
        <Kicker>{t("pitch.kickerMarket", "Why now")}</Kicker>
        <Title>{t("pitch.marketTitle", "Multi-trillion-dollar markets, one chain")}</Title>
        <motion.p variants={item} className="mt-4 max-w-2xl text-muted">{t("pitch.marketBodyPre", "PYRAX ships direct playbooks for ")}{TOTAL_INDUSTRIES}{t("pitch.marketBodyMid", " business types across ")}{CATEGORIES.length}{t("pitch.marketBodyPost", " industries — each with market projections, concrete integrations, and buildathon dApp ideas.")}</motion.p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {marketRefs(t).map((x) => (
            <motion.div key={x.l} variants={item} className="rounded-3xl border border-line bg-[color:var(--color-surface)] p-6">
              <div className="font-mono text-3xl font-extrabold flame-text">{x.m}</div>
              <div className="mt-2 text-xs text-muted">{x.l}</div>
              <div className="mt-1 text-[0.62rem] text-faint">{x.s}</div>
            </motion.div>
          ))}
        </div>
        <motion.div variants={item} className="mt-4 flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (<span key={c.slug} className="rounded-full border border-line px-3 py-1 text-xs text-muted" style={{ color: c.color }}>{c.name}</span>))}
        </motion.div>
      </motion.div>
    ),
  },
  {
    id: "neurax", label: "NEURAX",
    render: (t) => (
      <motion.div variants={stagger} initial="hidden" animate="show" className="mx-auto max-w-4xl">
        <Kicker>{t("pitch.kickerNeurax", "The wedge")}</Kicker>
        <Title>{t("pitch.neuraxTitle", "NEURAX — verifiable compute")}</Title>
        <motion.p variants={item} className="mt-4 max-w-2xl text-muted">{t("pitch.neuraxBody", "The same GPUs that secure the chain run paid AI and compute jobs. A four-rung verification ladder replaces blind trust — and the demand is exploding.")}</motion.p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { n: "8 PYRX", l: t("pitch.neuraxTile1Label", "per compute unit (fixed)") },
            { n: "4B PYRX", l: t("pitch.neuraxTile2Label", "bootstrap compute pool") },
            { n: "4-rung", l: t("pitch.neuraxTile3Label", "verification ladder") },
            { n: "RTX 3060", l: t("pitch.neuraxTile4Label", "local-first baseline GPU") },
          ].map((x) => (
            <motion.div key={x.l} variants={item} className="rounded-3xl border border-line bg-[rgba(124,92,255,0.06)] p-6">
              <div className="font-mono text-2xl font-extrabold text-[color:#7c5cff]">{x.n}</div>
              <div className="mt-1 text-xs text-muted">{x.l}</div>
            </motion.div>
          ))}
        </div>
        <motion.p variants={item} className="mt-4 text-sm text-faint">{t("pitch.neuraxFooter", "A crypto-economic AI-compute network that pays providers in the same token that secures consensus — a self-reinforcing flywheel.")}</motion.p>
      </motion.div>
    ),
  },
  {
    id: "traction", label: "Traction",
    render: (t) => (
      <motion.div variants={stagger} initial="hidden" animate="show" className="mx-auto max-w-4xl">
        <Kicker>{t("pitch.kickerTraction", "Traction")}</Kicker>
        <Title>{t("pitch.tractionTitle", "Built, not planned")}</Title>
        <motion.p variants={item} className="mt-4 max-w-2xl text-muted">{t("pitch.tractionBody", "The v4 whitepaper describes a system that is substantially implemented and tested — running today as a faithful simulation on real primitives, with the production consensus path wired end-to-end.")}</motion.p>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {built(t).map((x) => (
            <motion.div key={x.l} variants={item} className="rounded-2xl border border-line bg-[color:var(--color-surface)] p-5 text-center">
              <div className="font-mono text-2xl font-extrabold flame-text">{x.n}</div>
              <div className="mt-1 text-xs text-muted">{x.l}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    ),
  },
  {
    id: "tokenomics", label: "Tokenomics",
    render: (t) => {
      const R = 46, C = 2 * Math.PI * R;
      let acc = 0;
      const segs = ALLOCATIONS.map((a) => { const len = (a.pct / 100) * C; const s = { ...a, dash: `${len} ${C - len}`, offset: -acc * C / 100 }; acc += a.pct; return s; });
      return (
        <motion.div variants={stagger} initial="hidden" animate="show" className="mx-auto max-w-4xl">
          <Kicker>{t("pitch.kickerTokenomics", "Tokenomics")}</Kicker>
          <Title>{t("pitch.tokenomicsTitle", "A fixed 50B supply, frozen rules")}</Title>
          <div className="mt-8 grid items-center gap-8 lg:grid-cols-[auto_1fr]">
            <motion.div variants={item} className="relative mx-auto">
              <svg viewBox="0 0 120 120" className="h-52 w-52 -rotate-90">
                <circle cx="60" cy="60" r={R} fill="none" stroke="var(--color-line-soft)" strokeWidth="13" />
                {segs.map((s) => (<circle key={s.label} cx="60" cy="60" r={R} fill="none" stroke={s.color} strokeWidth="13" strokeDasharray={s.dash} strokeDashoffset={s.offset} />))}
              </svg>
              <div className="absolute inset-0 grid place-items-center"><div className="text-center"><div className="font-mono text-2xl font-extrabold flame-text">50B</div><div className="text-[0.6rem] text-faint">{t("pitch.tokenomicsHardCap", "hard cap")}</div></div></div>
            </motion.div>
            <motion.div variants={item} className="space-y-1.5">
              {ALLOCATIONS.map((a, ai) => (
                <div key={a.label} className="flex items-center gap-3 text-sm">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: a.color }} />
                  <span className="flex-1 text-ink">{t(`tokData.alloc${ai}Label`, a.label)}</span>
                  <span className="font-mono text-muted">{fmt(a.amount)} · {a.pct}%</span>
                </div>
              ))}
              <div className="mt-3 flex flex-wrap gap-2 pt-2 text-xs text-faint">
                <span className="rounded-full border border-line px-2.5 py-1">${TOKEN.genesisPrice}{t("pitch.tokenomicsGenesisSuffix", "/PYRX genesis")}</span>
                <span className="rounded-full border border-line px-2.5 py-1">{t("pitch.tokenomicsBaseFeePre", "Base fee ")}{FEES.baseFee[0].pct}{t("pitch.tokenomicsBaseFeePost", "% burned")}</span>
                <span className="rounded-full border border-line px-2.5 py-1">{t("pitch.tokenomicsFeeSplit", "Fee split frozen forever")}</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      );
    },
  },
  {
    id: "roadmap", label: "Roadmap",
    render: (t) => (
      <motion.div variants={stagger} initial="hidden" animate="show" className="mx-auto max-w-4xl">
        <Kicker>{t("pitch.kickerRoadmap", "Roadmap")}</Kicker>
        <Title>{t("pitch.roadmapTitle", "Audit-gated to mainnet")}</Title>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {NETWORKS.map((n, i) => (
            <motion.div key={n.key} variants={item} className="rounded-3xl border border-line bg-[color:var(--color-surface)] p-6">
              <div className="flex items-center justify-between">
                <span className="grid h-9 w-9 place-items-center rounded-xl font-display text-sm font-extrabold text-[#160a04]" style={{ background: `linear-gradient(135deg,${n.color},${n.color}88)` }}>{n.short[0]}</span>
                <span className="font-mono text-[0.62rem] text-faint">{i === 0 ? t("pitch.roadmapLive", "LIVE") : t("pitch.roadmapPlanned", "PLANNED")}</span>
              </div>
              <h3 className="mt-3 font-bold text-ink">{n.name}</h3>
              <p className="mt-1 text-xs text-muted">{n.mode} · chain {n.chainId.toLocaleString()}</p>
            </motion.div>
          ))}
        </div>
        <motion.div variants={item} className="mt-4 rounded-2xl border border-line bg-[color:var(--color-bg-2)] p-5 text-sm text-muted">
          <span className="font-semibold text-ink">{t("pitch.roadmapGateLabel", "The gate:")}</span> {t("pitch.roadmapGateBody", "a single external audit of consensus, ZK circuits, and the bridge. Nothing carrying real value ships before it clears.")}
        </motion.div>
      </motion.div>
    ),
  },
  {
    id: "ask", label: "The ask",
    render: (t) => (
      <motion.div variants={stagger} initial="hidden" animate="show" className="mx-auto max-w-4xl">
        <Kicker>{t("pitch.kickerAsk", "The ask")}</Kicker>
        <Title>{t("pitch.askTitle", "Fund the launch of PYRAX One")}</Title>
        <div className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <motion.div variants={item} className="rounded-3xl border border-line bg-[radial-gradient(120%_120%_at_0%_0%,rgba(245,134,34,0.14),transparent_60%)] p-7">
            <div className="eyebrow text-[color:var(--color-brand)]">{t("pitch.askGenesisEvent", "Genesis event")}</div>
            <div className="mt-2 font-display text-4xl font-extrabold flame-text">$50,000,000</div>
            <p className="mt-2 text-sm text-muted">{t("pitch.askGenesisBody", "20B PYRX at $0.0025, plus a 25% utility bonus (5B PYRX) — participants receive 25B in network access and compute credits. Never framed as an investment return.")}</p>
          </motion.div>
          <motion.div variants={item} className="rounded-3xl border border-line bg-[color:var(--color-surface)] p-7">
            <div className="eyebrow text-faint">{t("pitch.askUseOfFunds", "Use of funds")}</div>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              {[t("pitch.askFund1", "External audit + mainnet genesis ceremony"), t("pitch.askFund2", "Ecosystem, liquidity & buildathon grants"), t("pitch.askFund3", "NEURAX compute buildout and provider incentives"), t("pitch.askFund4", "Core protocol, apps, and global team")].map((u) => (
                <li key={u} className="flex gap-2"><span className="text-[color:var(--color-brand)]">→</span>{u}</li>
              ))}
            </ul>
          </motion.div>
        </div>
        <motion.div variants={item} className="mt-6 flex flex-wrap items-center gap-3">
          <a href="mailto:invest@pyrax.org" className="rounded-full bg-gradient-to-r from-[color:var(--color-gold)] via-[color:var(--color-brand)] to-[color:var(--color-ember)] px-6 py-3 text-sm font-bold text-[#1a0f06] transition hover:brightness-110">{t("pitch.askEmailButton", "invest@pyrax.org")}</a>
          <a href={DOMAINS.explorer} className="rounded-full border border-line px-6 py-3 text-sm font-semibold text-ink transition hover:border-[color:#34405a]">{t("pitch.askLiveButton", "See it live")}</a>
        </motion.div>
      </motion.div>
    ),
  },
];

// ---- controller ---------------------------------------------------------------------------------
export default function PitchDeck({ lang = "en" }: { lang?: string }) {
  const t = useT(lang);
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const touchX = useRef<number | null>(null);
  const n = SLIDES.length;

  const go = useCallback((next: number) => {
    setDir(next > i ? 1 : -1);
    setI(Math.max(0, Math.min(n - 1, next)));
  }, [i, n]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); go(i + 1); }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(i - 1); }
      else if (e.key === "Home") go(0);
      else if (e.key === "End") go(n - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, go, n]);

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: d > 0 ? 60 : -60 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: d > 0 ? -60 : 60 }),
  };

  return (
    <MotionConfig reducedMotion="user">
    <div
      className="relative flex h-[calc(100vh-4rem)] min-h-[560px] w-full flex-col overflow-hidden bg-[color:var(--color-bg)]"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => { if (touchX.current == null) return; const dx = e.changedTouches[0].clientX - touchX.current; if (Math.abs(dx) > 50) go(dx < 0 ? i + 1 : i - 1); touchX.current = null; }}
    >
      {/* progress */}
      <div className="absolute inset-x-0 top-0 z-20 h-0.5 bg-[color:var(--color-line-soft)]">
        <motion.div className="h-full flame-bar" animate={{ width: `${((i + 1) / n) * 100}%` }} transition={{ ease, duration: 0.4 }} />
      </div>

      {/* ambient */}
      <div className="pointer-events-none absolute -left-40 top-0 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(245,134,34,0.10),transparent_60%)] blur-3xl" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(124,92,255,0.10),transparent_60%)] blur-3xl" />

      {/* stage */}
      <div className="relative flex-1 overflow-y-auto px-6 py-10 sm:px-10">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div key={SLIDES[i].id} custom={dir} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35, ease }} className="mx-auto flex min-h-full w-full max-w-5xl items-center">
            <div className="w-full">{SLIDES[i].render(t)}</div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* click zones (desktop) */}
      <button aria-label={t("pitch.ctrlPrevAria", "Previous slide")} onClick={() => go(i - 1)} disabled={i === 0} className="absolute left-0 top-12 bottom-16 z-10 hidden w-[8%] cursor-w-resize disabled:cursor-default lg:block" />
      <button aria-label={t("pitch.ctrlNextAria", "Next slide")} onClick={() => go(i + 1)} disabled={i === n - 1} className="absolute right-0 top-12 bottom-16 z-10 hidden w-[8%] cursor-e-resize disabled:cursor-default lg:block" />

      {/* controls */}
      <div className="relative z-20 flex items-center justify-between gap-4 border-t border-line bg-[rgba(5,6,9,0.6)] px-4 py-3 backdrop-blur-xl sm:px-8">
        <button onClick={() => go(i - 1)} disabled={i === 0} className="flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-sm font-semibold text-muted transition hover:text-ink disabled:opacity-30">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="m15 6-6 6 6 6"/></svg>
          <span className="hidden sm:inline">{t("pitch.ctrlPrev", "Prev")}</span>
        </button>
        <div className="flex flex-1 items-center justify-center gap-1.5 overflow-x-auto">
          {SLIDES.map((s, idx) => (
            <button key={s.id} onClick={() => go(idx)} title={s.label} className="group flex shrink-0 items-center">
              <span className={`h-1.5 rounded-full transition-all ${idx === i ? "w-6 bg-[color:var(--color-brand)]" : "w-1.5 bg-[color:var(--color-line)] group-hover:bg-[color:#34405a]"}`} />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-faint">{String(i + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}</span>
          <button onClick={() => go(i + 1)} disabled={i === n - 1} className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[color:var(--color-gold)] via-[color:var(--color-brand)] to-[color:var(--color-ember)] px-3.5 py-1.5 text-sm font-bold text-[#1a0f06] transition hover:brightness-110 disabled:opacity-30">
            <span className="hidden sm:inline">{t("pitch.ctrlNext", "Next")}</span>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="m9 6 6 6-6 6"/></svg>
          </button>
        </div>
      </div>
    </div>
    </MotionConfig>
  );
}
