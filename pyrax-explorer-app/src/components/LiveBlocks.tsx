// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Live blocks table — seeded from the SSR getBlocks() payload (instant first paint, identical to the
// server render, SEO/no-JS intact), then polls /api/blocks every 5s and re-renders the table WITHOUT a
// full page reload. New rows animate in via framer-motion. The ?before= cursor is threaded through so a
// paged view keeps polling its own window (and its "Older blocks" link points at the right cursor).
// Poll errors are swallowed so a transient hiccup keeps the last-good rows on screen.
//
// The DOM is a byte-faithful reproduction of blocks.astro's live sections — same classes, same markup.
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { shortAddr, fmtNum, timeAgo, STREAM_TONE } from "../lib/format";
import { SEAL_LABEL } from "../server/sample";

interface Block { number: number; blueScore: number; hash: string; stream: string; sealAlgo: string; sealDerived?: boolean; miner: string; timestamp: number; txCount: number; gasUsed: number; gasLimit: number; baseFee: string; size: number }

export default function LiveBlocks({ initial, initialSource, before }: { initial: Block[]; initialSource: "live" | "sample" | "indexer"; before?: number }) {
  const [blocks, setBlocks] = useState<Block[]>(initial);
  const [source, setSource] = useState<string>(initialSource);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    const q = before !== undefined ? `?before=${before}` : "";
    const load = () => {
      fetch(`/api/blocks${q}`, { headers: { accept: "application/json" } })
        .then((r) => r.json())
        .then((d) => { if (alive.current && d.ok && Array.isArray(d.blocks)) { setBlocks(d.blocks); setSource(d.source); } })
        .catch(() => { /* keep last-good rows on a transient failure */ });
    };
    const i = window.setInterval(load, 5000);
    return () => { alive.current = false; window.clearInterval(i); };
  }, [before]);

  const oldest = blocks.length ? blocks[blocks.length - 1].number : 0;

  return (
    <>
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Blocks</h1>
        {source === "sample" && <span className="rounded-full border border-[color:rgba(252,208,61,0.4)] bg-[rgba(252,208,61,0.08)] px-2 py-0.5 text-[0.66rem] font-semibold uppercase tracking-wider text-[color:var(--color-gold)]">sample</span>}
      </div>
      <p className="mt-1 text-sm text-muted">Each block carries its GhostDAG blue score, emission stream (A/B/C) and the seal lane that produced it.</p>

      <div className="card mt-5 overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-line text-left text-xs uppercase tracking-wider text-faint">
              <th className="px-4 py-3 font-semibold">Block</th><th className="px-4 py-3 font-semibold">Age</th><th className="px-4 py-3 font-semibold">Stream</th><th className="px-4 py-3 font-semibold">Seal</th><th className="px-4 py-3 font-semibold">Txns</th><th className="px-4 py-3 font-semibold">Producer</th><th className="px-4 py-3 text-right font-semibold">Gas used</th>
            </tr></thead>
            <tbody>
              <AnimatePresence initial={false} mode="popLayout">
                {blocks.map((b) => (
                  <motion.tr key={b.hash || b.number} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                    className="border-b border-line-soft last:border-0 hover:bg-[rgba(255,255,255,0.02)]">
                    <td className="px-4 py-3"><a href={`/block/${b.number}`} className="font-mono font-semibold text-[color:var(--color-brand)]">#{fmtNum(b.number)}</a></td>
                    <td className="px-4 py-3 text-muted">{timeAgo(b.timestamp)}</td>
                    <td className="px-4 py-3"><span className="rounded-md px-1.5 py-0.5 text-[0.62rem] font-bold" style={{ color: STREAM_TONE[b.stream], background: `${STREAM_TONE[b.stream]}1a` }}>{b.stream}</span></td>
                    <td className="px-4 py-3 text-xs text-muted">{SEAL_LABEL[b.sealAlgo] || b.sealAlgo}</td>
                    <td className="px-4 py-3 text-muted">{b.txCount}</td>
                    <td className="px-4 py-3"><a href={`/address/${b.miner}`} className="font-mono text-xs text-muted hover:text-ink">{shortAddr(b.miner)}</a></td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-muted">{fmtNum(b.gasUsed)} <span className="text-faint">/ {fmtNum(b.gasLimit)}</span></td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-4 flex justify-end"><a href={`/blocks?before=${oldest - 1}`} className="btn btn-ghost">Older blocks →</a></div>
    </>
  );
}
