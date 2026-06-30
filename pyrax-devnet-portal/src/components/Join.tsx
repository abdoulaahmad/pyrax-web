// SPDX-License-Identifier: LicenseRef-Proprietary
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button, BrandMark } from "./ui";

export default function Join({ token, email, telegram, error }: { token: string; email: string; telegram: string; error: string }) {
  const [displayName, setDisplayName] = useState("");
  const [wallet, setWallet] = useState("");
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) { setErrs({ displayName: "Display name is required." }); return; }
    setBusy(true); setErrs({});
    try {
      const res = await fetch("/api/join", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, displayName, payoutWallet: wallet, sessionDays: days }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) { setErrs(data.errors || { _: data.error || "Could not complete sign-up." }); setBusy(false); return; }
      window.location.href = "/app";
    } catch { setErrs({ _: "Network error — please try again." }); setBusy(false); }
  }

  return (
    <div className="grid min-h-screen place-items-center px-6 py-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandMark variant="vertical" className="h-20 w-20 drop-shadow-[0_0_40px_rgba(245,134,34,0.28)]" />
          <div className="chip chip-brand mt-4">Closed Alpha Invite</div>
        </div>
        <div className="card overflow-hidden">
          <div className="flame-bar h-1 w-full" />
          <div className="p-7">
            {error ? (
              <div className="text-center">
                <h1 className="text-xl font-extrabold">Invite unavailable</h1>
                <p className="mt-2 text-sm text-muted">{error}</p>
                <a href="/" className="btn btn-ghost mt-6 w-full justify-center">Go to sign in</a>
              </div>
            ) : (
              <form onSubmit={submit}>
                <h1 className="text-xl font-extrabold">Welcome aboard, tester.</h1>
                <p className="mt-1 text-sm text-muted">Finish setting up your account to get started.</p>
                <div className="mt-5 grid gap-3">
                  <div><label className="label">Email</label><input className="input opacity-60" value={email} readOnly /></div>
                  <div><label className="label">Chat handle <span className="font-normal text-faint">(your Telegram)</span></label><input className="input opacity-60" value={telegram ? "@" + telegram.replace(/^@/, "") : "—"} readOnly /></div>
                  <div><label className="label">Display name <span className="text-[color:var(--color-ember)]">*</span></label><input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="How you'll appear" />{errs.displayName && <p className="mt-1 text-xs text-[color:var(--color-negative)]">{errs.displayName}</p>}</div>
                  <div><label className="label">PYRAX payout address <span className="font-normal text-faint">(optional · add later)</span></label><input className="input font-mono text-sm" value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder="0x…" />{errs.payoutWallet && <p className="mt-1 text-xs text-[color:var(--color-negative)]">{errs.payoutWallet}</p>}</div>
                  <div>
                    <label className="label">Keep me signed in for</label>
                    <select className="input" value={days} onChange={(e) => setDays(Number(e.target.value))}>
                      {[1, 2, 3, 5, 7].map((d) => <option key={d} value={d}>{d} day{d > 1 ? "s" : ""}</option>)}
                    </select>
                    <p className="mt-1 text-xs text-faint">Max 7 days. You can change this anytime in Settings.</p>
                  </div>
                </div>
                {errs._ && <p className="mt-3 text-sm text-[color:var(--color-negative)]">{errs._}</p>}
                <Button type="submit" variant="primary" className="mt-6 w-full justify-center" disabled={busy}>{busy ? "Setting up…" : "Enter the portal →"}</Button>
              </form>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
