// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Live overview dashboard — seeded from the SSR getOverview() payload (so the first paint is instant,
// identical to the server render, and SEO/no-JS still shows data), then polls /api/overview every 5s
// and re-renders the sections that change (stat tiles, TriStream distribution, shielded pool, supply,
// and the latest-blocks / latest-transactions feeds) WITHOUT a full page reload. New blocks and txs
// animate in via framer-motion, mirroring the peer-directory pattern. Poll errors are swallowed so a
// transient node/RPC hiccup keeps the last-good data on screen instead of blanking the UI.
//
// The DOM here is a byte-faithful reproduction of the live sections previously inlined in index.astro —
// same Tailwind classes, same markup — so the page looks unchanged.
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { shortHash, shortAddr, fmtNum, timeAgo, TX_TYPE_TONE, STREAM_TONE } from "../lib/format";
import { SEAL_LABEL, STREAM_LABEL, TX_TYPE_LABEL } from "../server/sample";

interface OverviewBlock { number: number; blueScore: number; hash: string; stream: string; sealAlgo: string; sealDerived?: boolean; miner: string; timestamp: number; txCount: number; gasUsed: number; gasLimit: number; baseFee: string; size: number }
interface OverviewTx { hash: string; type: string; block: number; timestamp: number; status: number; from: string | null; to: string | null; value: string | null; valueBalance: string | null }
export interface Overview {
  source: "live" | "sample";
  height: number; blueScore: number; finalizedHeight: number;
  streamMode: string; activeStreams: string[]; streamCounts: Record<string, number>;
  gasPrice: string; baseFee: string; peers: number; tps: string;
  supplyCirculating: string; supplyCap: string;
  shielded: { anchor: string; noteCount: number; nullifierCount: number; shieldedTxShare: string };
  blocks: OverviewBlock[]; txs: OverviewTx[];
}

export default function LiveOverview({ initial, netName, chainId }: { initial: Overview; netName: string; chainId: number }) {
  const [o, setO] = useState<Overview>(initial);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    const load = () => {
      fetch("/api/overview", { headers: { accept: "application/json" } })
        .then((r) => r.json())
        .then((d) => { if (alive.current && d.ok && d.overview) setO(d.overview); })
        .catch(() => { /* keep last-good data on a transient failure */ });
    };
    const i = window.setInterval(load, 5000);
    return () => { alive.current = false; window.clearInterval(i); };
  }, []);

  const sample = o.source === "sample";
  const streamTotal = Math.max(1, (o.streamCounts.A || 0) + (o.streamCounts.B || 0) + (o.streamCounts.C || 0));
  const tiles = [
    { label: "Block height", value: "#" + fmtNum(o.height), sub: `blue score ${fmtNum(o.blueScore)}`, accent: "brand" },
    { label: "Finalized", value: "#" + fmtNum(o.finalizedHeight), sub: "Stream C · BFT", accent: "positive" },
    { label: "Gas price", value: o.gasPrice + " gwei", sub: `base fee ${o.baseFee}`, accent: "water" },
    { label: "Shielded notes", value: fmtNum(o.shielded.noteCount), sub: `${fmtNum(o.shielded.nullifierCount)} nullifiers`, accent: "violet" },
  ];

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold sm:text-3xl">{netName} <span className="text-faint">Explorer</span></h1>
            {sample && <span className="rounded-full border border-[color:rgba(252,208,61,0.4)] bg-[rgba(252,208,61,0.08)] px-2 py-0.5 text-[0.66rem] font-semibold uppercase tracking-wider text-[color:var(--color-gold)]">sample data · node offline</span>}
          </div>
          <p className="mt-1 text-sm text-muted">GhostDAG · TriStream consensus · chain {chainId} · {o.streamMode}</p>
        </div>
        <div className="text-sm text-muted">{o.tps !== "—" ? `${o.tps} TPS` : ""}{o.peers ? ` · ${o.peers} peers` : ""}</div>
      </div>

      {/* stat tiles */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="card p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-faint">{t.label}</div>
            <div className={`mt-1.5 text-2xl font-extrabold ${t.accent === "brand" ? "flame-text" : ""}`} style={t.accent !== "brand" ? { color: `var(--color-${t.accent === "violet" ? "ink" : t.accent})` } : undefined}>{t.value}</div>
            <div className="mt-0.5 text-xs text-faint">{t.sub}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {/* TriStream distribution */}
        <div className="card p-5">
          <h3 className="text-base font-bold">TriStream consensus</h3>
          <p className="text-xs text-muted">Block production across the three emission streams (recent window).</p>
          <div className="mt-4 space-y-3">
            {(["A", "B", "C"] as const).map((s) => (
              <div key={s}>
                <div className="flex items-center justify-between text-sm"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: STREAM_TONE[s], boxShadow: `0 0 8px ${STREAM_TONE[s]}` }}></span>{STREAM_LABEL[s]}</span><span className="font-mono text-muted">{o.streamCounts[s] || 0}</span></div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.05)]"><div className="h-full rounded-full" style={{ width: `${Math.round(((o.streamCounts[s] || 0) / streamTotal) * 100)}%`, background: STREAM_TONE[s] }}></div></div>
              </div>
            ))}
          </div>
        </div>

        {/* Shielded pool */}
        <div className="card p-5">
          <h3 className="flex items-center gap-2 text-base font-bold"><svg viewBox="0 0 24 24" className="h-4 w-4 text-[color:#7c5cff]" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3 5 6v5c0 4.5 3 7.8 7 9 4-1.2 7-4.5 7-9V6l-7-3Z"/></svg> Shielded pool</h3>
          <p className="text-xs text-muted">Privacy-preserving note pool — only structural stats are public.</p>
          <div className="mt-4 space-y-2.5 text-sm">
            <div className="flex justify-between"><span className="text-muted">Note commitments</span><span className="font-mono text-ink">{fmtNum(o.shielded.noteCount)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Nullifiers spent</span><span className="font-mono text-ink">{fmtNum(o.shielded.nullifierCount)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Shielded tx share</span><span className="font-mono text-[color:#7c5cff]">{o.shielded.shieldedTxShare === "—" ? "—" : o.shielded.shieldedTxShare + "%"}</span></div>
            <div className="flex items-center justify-between gap-2"><span className="text-muted">Anchor</span><code className="truncate font-mono text-xs text-faint" title={o.shielded.anchor}>{shortHash(o.shielded.anchor)}</code></div>
          </div>
          <a href="/shielded" className="mt-4 inline-flex text-sm font-semibold text-[color:#7c5cff]">Explore the shielded pool →</a>
        </div>

        {/* Supply */}
        <div className="card p-5">
          <h3 className="text-base font-bold">Supply</h3>
          <p className="text-xs text-muted">PYRX — 50B hard cap (37.5B premine + 12.5B emissions).</p>
          <div className="mt-4"><div className="text-2xl font-extrabold flame-text">{o.supplyCirculating}</div><div className="text-xs text-faint">of {o.supplyCap} PYRX cap</div></div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.05)]"><div className="h-full flame-bar" style={{ width: "75%" }}></div></div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted"><span>Base fee → 50% treasury · 25% DAO</span><span>Tip → 20% / 10%</span></div>
        </div>
      </div>

      {/* latest blocks + txs */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="card overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-line px-5 py-3"><h3 className="text-base font-bold">Latest blocks</h3><a href="/blocks" className="text-sm text-[color:var(--color-brand)]">View all →</a></div>
          <div className="divide-y divide-[color:var(--color-line-soft)]">
            <AnimatePresence initial={false} mode="popLayout">
              {o.blocks.map((b) => (
                <motion.a key={b.hash || b.number} layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                  href={`/block/${b.number}`} className="flex items-center justify-between gap-3 px-5 py-3 transition hover:bg-[rgba(255,255,255,0.02)]">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-[rgba(255,255,255,0.02)] text-xs font-bold text-muted">#</span>
                    <div><div className="font-mono text-sm font-semibold text-ink">{fmtNum(b.number)}</div><div className="text-xs text-faint">{timeAgo(b.timestamp)} · {b.txCount} txns</div></div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-md px-1.5 py-0.5 text-[0.6rem] font-bold" style={{ color: STREAM_TONE[b.stream], background: `${STREAM_TONE[b.stream]}1a` }}>{b.stream}</span>
                    <span className="hidden rounded-md border border-line px-1.5 py-0.5 text-[0.6rem] text-faint sm:inline">{SEAL_LABEL[b.sealAlgo] || b.sealAlgo}</span>
                  </div>
                </motion.a>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <div className="card overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-line px-5 py-3"><h3 className="text-base font-bold">Latest transactions</h3><a href="/txs" className="text-sm text-[color:var(--color-brand)]">View all →</a></div>
          <div className="divide-y divide-[color:var(--color-line-soft)]">
            <AnimatePresence initial={false} mode="popLayout">
              {o.txs.map((t) => (
                <motion.a key={t.hash} layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                  href={`/tx/${t.hash}`} className="flex items-center justify-between gap-3 px-5 py-3 transition hover:bg-[rgba(255,255,255,0.02)]">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2"><span className="rounded-md px-1.5 py-0.5 text-[0.6rem] font-bold" style={{ color: TX_TYPE_TONE[t.type], background: `${TX_TYPE_TONE[t.type]}1a` }}>{TX_TYPE_LABEL[t.type]}</span><code className="font-mono text-sm text-ink">{shortHash(t.hash)}</code></div>
                    <div className="mt-0.5 truncate text-xs text-faint">{t.type === "shielded" ? "shielded — sender & recipient private" : `${shortAddr(t.from)} → ${t.to ? shortAddr(t.to) : "contract creation"}`}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-mono text-sm text-ink">{t.value !== null ? `${t.value} PYRX` : t.valueBalance ? `${t.valueBalance} PYRX` : "—"}</div>
                    <div className="text-xs text-faint">{timeAgo(t.timestamp)}</div>
                  </div>
                </motion.a>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}
