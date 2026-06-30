// SPDX-License-Identifier: LicenseRef-Proprietary
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const COMPILERS = ["v0.8.28", "v0.8.26", "v0.8.24", "v0.8.20", "v0.8.19", "v0.7.6", "v0.6.12"];

export default function VerifyForm() {
  const [address, setAddress] = useState("");
  const [compiler, setCompiler] = useState(COMPILERS[0]);
  const [optimize, setOptimize] = useState(true);
  const [runs, setRuns] = useState("200");
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setResult(null);
    try {
      const r = await fetch("/api/verify", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ address, compiler, optimize, runs: Number(runs) || 200, source }) });
      const j = await r.json();
      setResult({ ok: !!j.ok, message: j.ok ? j.message : j.error });
    } catch (e: any) { setResult({ ok: false, message: String(e.message || e) }); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="card p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Contract address</label>
            <input className="input font-mono" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x…" spellCheck={false} />
          </div>
          <div>
            <label className="label">Compiler version</label>
            <select className="input" value={compiler} onChange={(e) => setCompiler(e.target.value)}>
              {COMPILERS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Optimizer runs</label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setOptimize(!optimize)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${optimize ? "bg-[color:var(--color-brand)]" : "bg-[rgba(255,255,255,0.1)]"}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${optimize ? "left-[1.4rem]" : "left-0.5"}`} />
              </button>
              <input className="input font-mono" value={runs} onChange={(e) => setRuns(e.target.value)} disabled={!optimize} style={{ opacity: optimize ? 1 : 0.5 }} />
            </div>
          </div>
        </div>
        <div className="mt-4">
          <label className="label">Solidity source</label>
          <textarea className="input font-mono" rows={12} value={source} onChange={(e) => setSource(e.target.value)}
            placeholder={"// SPDX-License-Identifier: MIT\npragma solidity ^0.8.20;\n\ncontract MyContract { … }"} spellCheck={false} />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Submitting…" : "Verify & publish"}</button>
          <span className="text-xs text-faint">solc compile + bytecode match runs server-side</span>
        </div>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="card p-5" style={{ borderColor: result.ok ? "rgba(52,211,153,0.4)" : "rgba(251,111,115,0.4)" }}>
            <div className={`text-sm font-bold ${result.ok ? "text-[color:var(--color-positive)]" : "text-[color:var(--color-negative)]"}`}>{result.ok ? "Submission accepted" : "Could not submit"}</div>
            <p className="mt-1 text-sm text-muted">{result.message}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
