// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Real-time network stats for the SELECTED network — block height (count-up), connected peers, live
// TPS (colored against the 500k target), and finality. Honest by default: an unreachable network shows
// a grey dot + em-dashes and lights up the instant its RPC is reachable. Polls /api/net every ~4s.
import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useT } from "../i18n";

const TARGET_TPS = 500_000;
const fmtInt = (n: number) => Math.round(n).toLocaleString("en-US");
const fmtTps = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n >= 10 ? n.toFixed(0) : n.toFixed(1));

function useCountUp(target: number) {
  const [v, setV] = useState(target);
  const raf = useRef(0);
  useEffect(() => {
    const from = v, to = target, start = performance.now(), dur = 700;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      setV(from + (to - from) * e);
      if (k < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return v;
}

interface NetRow { chainId: number; name: string; short: string; mode: string; color: string; online: boolean; height?: number; peers?: number; tps?: number; finalized?: number }

export default function LiveStats({ compact = false, lang = "en" }: { compact?: boolean; lang?: string }) {
  const t = useT(lang);
  const [sel, setSel] = useState<NetRow | null>(null);
  const [selectedChain, setSelectedChain] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => fetch("/api/net").then((r) => r.json()).then((d) => {
      if (!alive || !d.ok) return;
      setSelectedChain(d.selected);
      const row = d.networks.find((n: NetRow) => n.chainId === d.selected) || d.networks[0];
      setSel(row);
    }).catch(() => {});
    load();
    const iv = setInterval(load, 4000);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  const height = useCountUp(sel?.online ? sel.height ?? 0 : 0);
  const online = !!sel?.online;
  const tps = sel?.tps ?? 0;
  const tpsColor = !online || tps < 1 ? "var(--color-muted)" : tps < TARGET_TPS * 0.5 ? "var(--color-negative)" : tps < TARGET_TPS ? "var(--color-warning)" : "var(--color-positive)";

  const cells = [
    { label: t("homeExtra.labelBlockHeight", "Block height"), value: online ? "#" + fmtInt(height) : "—", sub: online ? `${t("homeExtra.subBlueScore", "blue score")} ${fmtInt(sel?.finalized ?? 0)} ${t("homeExtra.subFinal", "final")}` : t("homeExtra.subOffline", "offline") },
    { label: t("homeExtra.labelConnectedPeers", "Connected peers"), value: online ? fmtInt(sel?.peers ?? 0) : "—", sub: online ? t("homeExtra.subP2pMesh", "P2P mesh") : "" },
    { label: t("homeExtra.labelLiveTps", "Live TPS"), value: online ? fmtTps(tps) : "—", sub: `${t("homeExtra.subTarget", "target")} ${fmtTps(TARGET_TPS)}`, color: tpsColor },
    { label: t("homeExtra.labelFinality", "Finality"), value: online ? "BLS BFT" : "—", sub: t("homeExtra.subStreamC", "Stream C · >2/3 stake") },
  ];

  return (
    <div className={`rounded-2xl border border-line bg-[rgba(9,11,18,0.6)] backdrop-blur-md ${compact ? "p-4" : "p-5"}`}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="relative flex h-2 w-2"><span className="inline-flex h-full w-full rounded-full" style={{ background: online ? "#34d399" : "#6a7286", boxShadow: online ? "0 0 8px #34d399" : "none" }} />{online && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#34d399] opacity-60" />}</span>
          <span className="text-ink">{sel?.name || "PYRAX Seed"}</span>
          <span className="rounded px-1.5 py-0.5 text-[0.6rem] font-bold uppercase" style={{ color: sel?.color || "#60b8cc", background: `${sel?.color || "#60b8cc"}1a` }}>{sel?.mode || "Simulated"}</span>
        </div>
        <span className="text-[0.65rem] uppercase tracking-wider text-faint">{online ? t("homeExtra.statusLive", "live") : t("homeExtra.statusAwaitingRpc", "awaiting RPC")}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cells.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="min-w-0">
            <div className="font-mono text-xl font-extrabold tabular-nums sm:text-2xl" style={{ color: c.color || "var(--color-ink)" }}>{c.value}</div>
            <div className="mt-0.5 text-[0.7rem] font-semibold text-muted">{c.label}</div>
            <div className="text-[0.62rem] text-faint">{c.sub}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
