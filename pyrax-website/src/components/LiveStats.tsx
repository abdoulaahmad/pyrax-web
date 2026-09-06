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

interface NetRow { chainId: number; name: string; short: string; mode: string; color: string; online: boolean; simulated?: boolean; height?: number; peers?: number; tps?: number; finalized?: number }

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

  const hasData = !!sel && (sel.online || sel.simulated);
  const height = useCountUp(hasData ? sel?.height ?? 0 : 0);
  const online = !!sel?.online;
  const simulated = !!sel?.simulated;
  const tps = sel?.tps ?? 0;
  const tpsColor = simulated ? "var(--color-bolt-bright)" : !online || tps < 1 ? "var(--color-muted)" : tps < TARGET_TPS * 0.5 ? "var(--color-negative)" : tps < TARGET_TPS ? "var(--color-warning)" : "var(--color-positive)";

  const cells = [
    { label: t("homeExtra.labelBlockHeight", "Block height"), value: hasData ? "#" + fmtInt(height) : "—", sub: hasData ? `${t("homeExtra.subBlueScore", "blue score")} ${fmtInt(sel?.finalized ?? 0)} ${t("homeExtra.subFinal", "final")}` : t("homeExtra.subOffline", "offline") },
    { label: t("homeExtra.labelConnectedPeers", "Connected peers"), value: hasData ? fmtInt(sel?.peers ?? 0) : "—", sub: hasData ? t("homeExtra.subP2pMesh", "P2P mesh") : "" },
    { label: simulated ? "Simulated TPS" : t("homeExtra.labelLiveTps", "Live TPS"), value: hasData ? fmtTps(tps) : "—", sub: `${t("homeExtra.subTarget", "target")} ${fmtTps(TARGET_TPS)}`, color: tpsColor },
    { label: t("homeExtra.labelFinality", "Finality"), value: hasData ? "BLS BFT" : "—", sub: t("homeExtra.subStreamC", "Stream C · >2/3 stake") },
  ];

  return (
    <div className={`relative overflow-hidden rounded-[1.25rem] border bg-[rgba(7,9,14,0.92)] backdrop-blur-md ${hasData ? "border-[color:var(--color-line-soft)]" : "border-line"}`}>
      <span className="absolute -top-px left-5 h-px w-10" style={{ background: simulated ? "var(--color-bolt-bright)" : online ? "linear-gradient(110deg,#da5427,#f68a24 55%,#fed23c)" : "var(--color-line-soft)" }} />
      <div className={`flex items-center justify-between border-b border-line-soft ${compact ? "px-4 py-3" : "px-5 py-4"}`}>
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2"><span className="inline-flex h-full w-full rounded-full" style={{ background: simulated ? "var(--color-bolt-bright)" : online ? "#3ddc84" : "#5b6270", boxShadow: hasData ? "0 0 8px currentColor" : "none" }} /></span>
          <span className="font-mono text-xs tracking-wide text-ink">{sel?.name || "PYRAX Seed"} <span className="text-faint">· {sel?.mode || "Simulated"}</span></span>
        </div>
        <span className="rounded-full border px-2.5 py-1 font-mono text-[0.62rem] font-semibold tracking-wider" style={simulated ? { color: "var(--color-bolt-bright)", borderColor: "rgba(92,186,206,0.35)", background: "rgba(92,186,206,0.1)" } : online ? { color: "#3ddc84", borderColor: "rgba(61,220,132,0.3)", background: "rgba(61,220,132,0.1)" } : { color: "#5b6270", borderColor: "var(--color-line-soft)", background: "rgba(91,98,112,0.12)" }}>{simulated ? "SIMULATED DATA" : online ? t("homeExtra.statusLive", "LIVE RPC") : t("homeExtra.statusAwaitingRpc", "AWAITING RPC")}</span>
      </div>
      <div className="grid grid-cols-2">
        {cells.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={`min-w-0 px-5 py-4 ${i < 2 ? "border-b border-line-soft" : ""} ${i % 2 === 0 ? "border-r border-line-soft" : ""}`}>
            <div className="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-faint">{c.label}</div>
            <div className="mt-1.5 font-display text-xl font-medium tabular-nums leading-none" style={{ color: c.color || (hasData ? "var(--color-ink)" : "var(--color-faint)") }}>{c.value}</div>
            {c.sub && <div className="mt-1.5 font-mono text-[0.62rem] text-faint">{c.sub}</div>}
          </motion.div>
        ))}
      </div>
      <div className="border-t border-line-soft bg-[rgba(5,6,9,0.6)] px-5 py-3 text-[0.68rem] leading-relaxed text-faint">
        {simulated
          ? "Seed sandbox figures are simulated locally and are not live network measurements. Live RPC data replaces them automatically when available."
          : online
          ? t("homeExtra.liveFootnote", "Live on PYRAX Seed · switch networks in the navbar. Numbers are real — an offline network shows em-dashes, never fabricated figures.")
          : t("homeExtra.offlineFootnote", "Network unreachable. Figures read from public RPC at page load; until live, every figure is an em-dash.")}
      </div>
    </div>
  );
}
