// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Live transactions table — seeded from the SSR getTxs() payload (instant first paint, identical to the
// server render, SEO/no-JS intact), then polls /api/txs every 5s and re-renders the table WITHOUT a full
// page reload. New rows animate in via framer-motion. The ?offset= cursor is threaded through so a paged
// view keeps polling its own page (and the Newer/Older links stay correct). Poll errors are swallowed so
// a transient hiccup keeps the last-good rows on screen.
//
// The DOM is a byte-faithful reproduction of txs.astro's live sections — same classes, same markup.
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { shortHash, shortAddr, fmtNum, timeAgo, TX_TYPE_TONE } from "../lib/format";
import { TX_TYPE_LABEL } from "../server/sample";

interface Tx { hash: string; type: string; block: number; timestamp: number; status: number; from: string | null; to: string | null; value: string | null; valueBalance: string | null }

const PAGE = 25;

export default function LiveTxs({ initial, initialSource, offset }: { initial: Tx[]; initialSource: "live" | "sample" | "indexer"; offset: number }) {
  const [txs, setTxs] = useState<Tx[]>(initial);
  const [source, setSource] = useState<string>(initialSource);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    const q = offset > 0 ? `?offset=${offset}` : "";
    const load = () => {
      fetch(`/api/txs${q}`, { headers: { accept: "application/json" } })
        .then((r) => r.json())
        .then((d) => { if (alive.current && d.ok && Array.isArray(d.txs)) { setTxs(d.txs); setSource(d.source); } })
        .catch(() => { /* keep last-good rows on a transient failure */ });
    };
    const i = window.setInterval(load, 5000);
    return () => { alive.current = false; window.clearInterval(i); };
  }, [offset]);

  const sample = source === "sample";

  return (
    <>
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Transactions</h1>
        {sample && <span className="rounded-full border border-[color:rgba(252,208,61,0.4)] bg-[rgba(252,208,61,0.08)] px-2 py-0.5 text-[0.66rem] font-semibold uppercase tracking-wider text-[color:var(--color-gold)]">sample</span>}
      </div>
      <p className="mt-1 text-sm text-muted">PYRAX carries six transaction kinds — transparent, Ethereum, shielded, escrow, stake and governance.</p>
      <div className="card mt-5 overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-line text-left text-xs uppercase tracking-wider text-faint">
              <th className="px-4 py-3 font-semibold">Type</th><th className="px-4 py-3 font-semibold">Hash</th><th className="px-4 py-3 font-semibold">Block</th><th className="px-4 py-3 font-semibold">Age</th><th className="px-4 py-3 font-semibold">From → To</th><th className="px-4 py-3 text-right font-semibold">Value</th>
            </tr></thead>
            <tbody>
              <AnimatePresence initial={false} mode="popLayout">
                {txs.map((t) => (
                  <motion.tr key={t.hash} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                    className="border-b border-line-soft last:border-0 hover:bg-[rgba(255,255,255,0.02)]">
                    <td className="px-4 py-3"><span className="rounded-md px-1.5 py-0.5 text-[0.62rem] font-bold" style={{ color: TX_TYPE_TONE[t.type], background: `${TX_TYPE_TONE[t.type]}1a` }}>{TX_TYPE_LABEL[t.type]}</span></td>
                    <td className="px-4 py-3"><a href={`/tx/${t.hash}`} className="font-mono text-[color:var(--color-brand)]">{shortHash(t.hash)}</a></td>
                    <td className="px-4 py-3"><a href={`/block/${t.block}`} className="font-mono text-muted hover:text-ink">{fmtNum(t.block)}</a></td>
                    <td className="px-4 py-3 text-muted">{timeAgo(t.timestamp)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">{t.type === "shielded" ? <span className="text-[color:#7c5cff]">private ⇄ private</span> : <>{shortAddr(t.from)} → {t.to ? shortAddr(t.to) : "create"}</>}</td>
                    <td className="px-4 py-3 text-right font-mono">{t.value !== null ? `${t.value}` : t.valueBalance ?? "—"}</td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs text-faint">{offset > 0 ? `from #${fmtNum(offset + 1)}` : ""}</div>
        <div className="flex gap-2">
          {offset > 0 && <a className="btn btn-ghost" href={`/txs?offset=${Math.max(0, offset - PAGE)}`}>← Newer</a>}
          {!sample && txs.length === PAGE && <a className="btn btn-ghost" href={`/txs?offset=${offset + PAGE}`}>Older →</a>}
        </div>
      </div>
    </>
  );
}
