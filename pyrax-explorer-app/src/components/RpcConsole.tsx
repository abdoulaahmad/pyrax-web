// SPDX-License-Identifier: LicenseRef-Proprietary
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Method = { name: string; params: unknown[]; desc: string };
type Group = { label: string; tone: string; methods: Method[] };

// A curated catalog of read-only methods spanning the standard eth_* set and PYRAX's native
// pyrax_* namespace. Example params are pre-filled so a click runs immediately.
const CATALOG: Group[] = [
  { label: "Chain", tone: "#f58622", methods: [
    { name: "eth_blockNumber", params: [], desc: "Latest block height (blue score)" },
    { name: "eth_chainId", params: [], desc: "EIP-155 chain id" },
    { name: "eth_gasPrice", params: [], desc: "Suggested gas price (wei)" },
    { name: "pyrax_blockNumber", params: [], desc: "Native block height" },
    { name: "pyrax_syncStatus", params: [], desc: "Sync height, target, finality, peers" },
  ] },
  { label: "Blocks & DAG", tone: "#60b8cc", methods: [
    { name: "eth_getBlockByNumber", params: ["latest", false], desc: "Block by number/tag" },
    { name: "pyrax_dagRecent", params: [16], desc: "Recent GhostDAG blocks (parents, stream)" },
    { name: "pyrax_consensusInfo", params: [], desc: "Consensus mode + active streams" },
  ] },
  { label: "Accounts", tone: "#34d399", methods: [
    { name: "eth_getBalance", params: ["0x0000000000000000000000000000000000000200", "latest"], desc: "Account balance (wei)" },
    { name: "eth_getTransactionCount", params: ["0x0000000000000000000000000000000000000200", "latest"], desc: "Account nonce" },
    { name: "eth_getCode", params: ["0x0000000000000000000000000000000000000200", "latest"], desc: "Contract bytecode" },
  ] },
  { label: "Privacy", tone: "#7c5cff", methods: [
    { name: "pyrax_noteState", params: [], desc: "Shielded pool: anchor, note & nullifier counts" },
  ] },
  { label: "Network", tone: "#9aa4ba", methods: [
    { name: "pyrax_peerCount", params: [], desc: "Connected peer count" },
    { name: "pyrax_nodeInfo", params: [], desc: "This node's peer id + listen addresses" },
    { name: "net_version", params: [], desc: "Network id" },
  ] },
];

export default function RpcConsole() {
  const [method, setMethod] = useState("pyrax_dagRecent");
  const [params, setParams] = useState("[16]");
  const [running, setRunning] = useState(false);
  const [out, setOut] = useState<{ ok: boolean; text: string; ms?: number } | null>(null);

  function load(m: Method) {
    setMethod(m.name);
    setParams(JSON.stringify(m.params));
    setOut(null);
  }

  async function run() {
    let parsed: unknown[];
    try { parsed = JSON.parse(params || "[]"); if (!Array.isArray(parsed)) throw new Error("params must be a JSON array"); }
    catch (e: any) { setOut({ ok: false, text: "Invalid params JSON: " + e.message }); return; }
    setRunning(true); setOut(null);
    try {
      const r = await fetch("/api/rpc", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ method, params: parsed }) });
      const j = await r.json();
      if (j.error) setOut({ ok: false, text: j.error, ms: j.ms });
      else setOut({ ok: true, text: JSON.stringify(j.result, null, 2), ms: j.ms });
    } catch (e: any) { setOut({ ok: false, text: String(e.message || e) }); }
    finally { setRunning(false); }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
      {/* method catalog */}
      <div className="card p-3">
        <div className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-faint">Methods</div>
        <div className="space-y-3">
          {CATALOG.map((g) => (
            <div key={g.label}>
              <div className="px-2 text-[0.66rem] font-bold uppercase tracking-wider" style={{ color: g.tone }}>{g.label}</div>
              <div className="mt-1 space-y-0.5">
                {g.methods.map((m) => (
                  <button key={m.name} onClick={() => load(m)} title={m.desc}
                    className={`block w-full truncate rounded-md px-2 py-1.5 text-left font-mono text-xs transition ${method === m.name ? "bg-[rgba(245,134,34,0.12)] text-ink" : "text-muted hover:bg-[rgba(255,255,255,0.03)] hover:text-ink"}`}>
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* request + response */}
      <div className="min-w-0 space-y-4">
        <div className="card p-5">
          <label className="label">Method</label>
          <input className="input font-mono" value={method} onChange={(e) => setMethod(e.target.value)} spellCheck={false} />
          <label className="label mt-3">Params (JSON array)</label>
          <textarea className="input font-mono" rows={3} value={params} onChange={(e) => setParams(e.target.value)} spellCheck={false} />
          <div className="mt-3 flex items-center gap-3">
            <button className="btn btn-primary" onClick={run} disabled={running}>{running ? "Running…" : "Run request"}</button>
            <span className="text-xs text-faint">Calls the selected network · read-only methods only</span>
          </div>
        </div>

        <AnimatePresence>
          {out && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-line px-5 py-2.5">
                <span className={`text-sm font-semibold ${out.ok ? "text-[color:var(--color-positive)]" : "text-[color:var(--color-negative)]"}`}>{out.ok ? "200 · result" : "error"}</span>
                {out.ms !== undefined && <span className="font-mono text-xs text-faint">{out.ms} ms</span>}
              </div>
              <pre className="max-h-[28rem] overflow-auto px-5 py-4 font-mono text-xs leading-relaxed text-muted">{out.text}</pre>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
