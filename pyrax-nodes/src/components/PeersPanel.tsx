// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Live online-peers directory for the SELECTED network. Reads /api/peers?network=<label> (same-origin)
// every few seconds; shows each peer's kind, location, copyable dial multiaddr, relay key, and uptime.
// The network is chosen here (chips) or via the navbar dropdown (?net= / localStorage), and only
// ONLINE peers for that one network are listed.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "./ui";

interface NetRow { label: string; name: string; color: string; kind: string; online: boolean; peers: number }
interface Peer { peerId: string; network: string; ip?: string; port: number; multiaddr: string; relayPubkey?: string; kind: string; lat?: number; lon?: number; country?: string; city?: string; firstSeen: number; lastSeen: number }
const SEL_KEY = "pyrax:net";

const ago = (ms: number) => { const s = Math.max(0, Math.floor((Date.now() - ms) / 1000)); return s < 60 ? `${s}s ago` : s < 3600 ? `${Math.floor(s / 60)}m ago` : `${Math.floor(s / 3600)}h ago`; };
const KIND: Record<string, { tone: any; label: string }> = { operator: { tone: "brand", label: "Operator" }, seed: { tone: "water", label: "Seed" }, rpc: { tone: "positive", label: "RPC" } };

function Copy({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1200); }); }}
      className="shrink-0 rounded-md border border-line px-2 py-1 text-[0.66rem] font-medium text-faint transition hover:text-ink hover:border-[#34405a]" title="Copy dial address">
      {done ? "✓ copied" : "copy"}
    </button>
  );
}

export default function PeersPanel() {
  const [nets, setNets] = useState<NetRow[]>([]);
  const [sel, setSel] = useState<string>("");
  const [peers, setPeers] = useState<Peer[] | null>(null);
  const selRef = useRef("");

  // resolve initial network: ?net= → localStorage → default (from /api/networks)
  useEffect(() => {
    let initial = "";
    try {
      const q = new URLSearchParams(location.search).get("net");
      initial = q || localStorage.getItem(SEL_KEY) || "";
    } catch {}
    if (initial) { setSel(initial); selRef.current = initial; }
    fetch("/api/networks").then((r) => r.json()).then((d) => {
      if (!d.ok) return;
      setNets(d.networks);
      if (!selRef.current) { const n = d.default || d.networks[0]?.label || ""; setSel(n); selRef.current = n; }
    }).catch(() => {});
  }, []);

  // poll the selected network's peers + refresh the roster counts
  useEffect(() => {
    if (!sel) return;
    let alive = true;
    const load = () => {
      fetch(`/api/peers?network=${encodeURIComponent(sel)}`, { headers: { accept: "application/json" } }).then((r) => r.json()).then((d) => { if (alive && d.ok) setPeers(d.peers); }).catch(() => {});
      fetch("/api/networks").then((r) => r.json()).then((d) => { if (alive && d.ok) setNets(d.networks); }).catch(() => {});
    };
    setPeers(null);
    load();
    const i = window.setInterval(load, 5000);
    return () => { alive = false; window.clearInterval(i); };
  }, [sel]);

  function pick(label: string) { setSel(label); selRef.current = label; try { localStorage.setItem(SEL_KEY, label); const u = new URL(location.href); u.searchParams.set("net", label); history.replaceState({}, "", u); } catch {} }

  const selNet = useMemo(() => nets.find((n) => n.label === sel), [nets, sel]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold sm:text-4xl">Peer directory</h1>
          <p className="mt-2 max-w-xl text-muted">Every node currently online on the selected network, announced live over the decentralized peer directory. Copy a dial address to connect manually.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted">
          <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--color-positive)] opacity-70" /><span className="relative inline-flex h-2 w-2 rounded-full bg-[color:var(--color-positive)]" /></span>
          live · refreshes every 5s
        </div>
      </div>

      {/* network chips */}
      <div className="mt-6 flex flex-wrap gap-2">
        {nets.map((n) => (
          <button key={n.label} onClick={() => pick(n.label)}
            className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition ${n.label === sel ? "border-[color:var(--color-brand)] bg-[rgba(245,134,34,0.08)] text-ink" : "border-line text-muted hover:text-ink hover:border-[#34405a]"}`}>
            {n.online ? <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--color-positive)] opacity-70" /><span className="relative inline-flex h-2 w-2 rounded-full bg-[color:var(--color-positive)]" /></span> : <span className="h-2 w-2 rounded-full bg-[color:var(--color-negative)] opacity-60" />}
            {n.name}
            <span className="text-xs text-faint">{n.online ? n.peers : "·"}</span>
          </button>
        ))}
      </div>

      {/* list */}
      <div className="mt-6">
        {peers === null ? (
          <div className="card p-10 text-center text-sm text-muted"><span className="mr-2 inline-block h-4 w-4 animate-spin-slow rounded-full border-2 border-line border-t-[color:var(--color-brand)] align-middle" />Discovering peers on {selNet?.name || sel}…</div>
        ) : peers.length === 0 ? (
          <div className="card p-10 text-center">
            <div className="text-base font-semibold">No peers online on {selNet?.name || sel} yet</div>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">When a node connects to this network it appears here within ~10 seconds. Be the first — run a node and join the mesh.</p>
            <a href="/downloads" className="btn btn-primary mt-4">Run a node</a>
          </div>
        ) : (
          <>
            <div className="mb-3 text-sm text-muted">{peers.length} peer{peers.length === 1 ? "" : "s"} online on <span className="text-ink">{selNet?.name || sel}</span></div>
            <div className="grid gap-3 md:grid-cols-2">
              <AnimatePresence mode="popLayout">
                {peers.map((p) => (
                  <motion.div key={p.peerId} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.2 }}
                    className="card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Badge tone={KIND[p.kind]?.tone || "muted"}>{KIND[p.kind]?.label || p.kind}</Badge>
                        <span className="text-sm text-muted">{p.city ? `${p.city}, ` : ""}{p.country || "Location pending"}</span>
                      </div>
                      <span className="shrink-0 text-xs text-faint">seen {ago(p.lastSeen)}</span>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <code className="min-w-0 flex-1 truncate rounded-lg border border-line bg-[rgba(5,6,9,0.5)] px-2.5 py-1.5 font-mono text-xs text-muted" title={p.multiaddr}>{p.multiaddr}</code>
                      <Copy text={p.multiaddr} />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.7rem] text-faint">
                      <span>peer {p.peerId.slice(0, 10)}…{p.peerId.slice(-4)}</span>
                      {p.relayPubkey && <span>relay {p.relayPubkey.slice(0, 8)}…</span>}
                      <span>up {ago(p.firstSeen).replace(" ago", "")}</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
