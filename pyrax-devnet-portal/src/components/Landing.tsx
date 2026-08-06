// SPDX-License-Identifier: LicenseRef-Proprietary
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Icon, BrandMark } from "./ui";

const N = 9;
type Step = "email" | "code" | "expired" | "used";

export default function Landing() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState<string[]>(Array(N).fill(""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState(0);
  const [ttl, setTtl] = useState(600);
  const rid = useRef("");
  const endsAt = useRef(0);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  async function sendCode() {
    setError(""); setBusy(true);
    try {
      const res = await fetch("/api/auth/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) { setError(data.error || "Something went wrong. Please try again."); setBusy(false); return; }
      const t = Number(data.ttl) || 600;
      rid.current = data.rid || ""; endsAt.current = Date.now() + t * 1000;
      setTtl(t); setRemaining(t); setDigits(Array(N).fill("")); setStep("code");
      setTimeout(() => boxes.current[0]?.focus(), 60);
    } catch { setError("Network error. Please try again."); }
    setBusy(false);
  }
  async function requestCode(e: React.FormEvent) { e.preventDefault(); await sendCode(); }

  useEffect(() => {
    if (step !== "code") return;
    const tick = () => { const r = Math.max(0, Math.round((endsAt.current - Date.now()) / 1000)); setRemaining(r); if (r <= 0) setStep("expired"); };
    tick(); const i = window.setInterval(tick, 1000); return () => window.clearInterval(i);
  }, [step]);
  useEffect(() => {
    if (step !== "code" || !rid.current) return;
    const i = window.setInterval(async () => {
      try { const d = await (await fetch(`/api/auth/status?rid=${encodeURIComponent(rid.current)}`)).json(); if (d?.ok && d.state === "used") setStep("used"); else if (d?.ok && d.state === "expired") setStep("expired"); } catch {}
    }, 4000);
    return () => window.clearInterval(i);
  }, [step]);

  function setDigit(i: number, v: string) { const ch = v.replace(/\D/g, "").slice(-1); const n = [...digits]; n[i] = ch; setDigits(n); if (ch && i < N - 1) boxes.current[i + 1]?.focus(); }
  function onPaste(e: React.ClipboardEvent) { const t = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, N); if (!t) return; e.preventDefault(); const n = Array(N).fill(""); for (let i = 0; i < t.length; i++) n[i] = t[i]; setDigits(n); boxes.current[Math.min(t.length, N - 1)]?.focus(); }
  async function verify(e: React.FormEvent) {
    e.preventDefault(); const code = digits.join(""); if (code.length < N) return setError("Enter the full code.");
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/auth/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, code }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) { setError(data.error || "That code is invalid or expired."); setBusy(false); setDigits(Array(N).fill("")); boxes.current[0]?.focus(); return; }
      window.location.href = "/app";
    } catch { setError("Network error. Please try again."); setBusy(false); }
  }
  function reset() { setStep("email"); setDigits(Array(N).fill("")); setError(""); }

  const mm = Math.floor(remaining / 60), ss = remaining % 60, timeStr = `${mm}:${String(ss).padStart(2, "0")}`;
  const low = remaining <= 60, pct = ttl ? Math.max(0, Math.min(100, (remaining / ttl) * 100)) : 0;
  const clock = <svg viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;

  const StatePanel = ({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) => (
    <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[rgba(215,84,39,0.12)] text-[color:var(--color-ember)]"><span className="h-6 w-6">{icon}</span></div>
      <h2 className="mt-4 text-xl font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted">{body}</p>
      <Button type="button" variant="primary" className="mt-6 w-full justify-center" disabled={busy} onClick={sendCode}>{busy ? "Sending…" : "Send a new code"}</Button>
      <button type="button" className="mt-3 w-full text-center text-xs text-faint hover:text-muted" onClick={reset}>← Use a different email</button>
    </motion.div>
  );

  const card = (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }} className="card w-full max-w-sm overflow-hidden">
      <div className="flame-bar h-1 w-full" />
      <div className="p-7 sm:p-8">
        <AnimatePresence mode="wait">
          {step === "email" && (
            <motion.form key="e" onSubmit={requestCode} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.22 }}>
              <h2 className="text-xl font-semibold">Tester sign in</h2>
              <p className="mt-1 text-sm text-muted">We'll email a one-time sign-in code. No password.</p>
              <label className="label mt-6">Email</label>
              <div className="relative">
                <Icon.mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                <input className="input pl-9" type="email" autoComplete="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <p className="mt-2 text-xs text-faint">Use the email you were invited with.</p>
              {error && <p className="mt-3 text-sm text-[color:var(--color-negative)]">{error}</p>}
              <Button type="submit" variant="primary" className="mt-6 w-full justify-center" disabled={busy}>{busy ? "Sending…" : "Send code"}</Button>
            </motion.form>
          )}
          {step === "code" && (
            <motion.form key="c" onSubmit={verify} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.22 }}>
              <h2 className="text-xl font-semibold">Enter your code</h2>
              <p className="mt-1 text-sm text-muted">Sent to <span className="text-ink">{email || "your email"}</span>.</p>
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-faint">Code expires in</span>
                  <span className={`inline-flex items-center gap-1 font-mono tabular-nums font-semibold ${low ? "text-[color:var(--color-ember)]" : "text-ink"}`}><span className={`h-3.5 w-3.5 ${low ? "animate-pulse" : ""}`}>{clock}</span>{timeStr}</span>
                </div>
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-line"><motion.div className={low ? "h-full rounded-full bg-[color:var(--color-ember)]" : "h-full rounded-full flame-bar"} animate={{ width: `${pct}%` }} transition={{ ease: "linear", duration: 1 }} /></div>
              </div>
              <div className="mt-5 grid grid-cols-9 gap-1" onPaste={onPaste}>
                {digits.map((d, i) => (
                  <input key={i} ref={(el) => { boxes.current[i] = el; }} inputMode="numeric" maxLength={1} value={d} onChange={(e) => setDigit(i, e.target.value)} onKeyDown={(e) => { if (e.key === "Backspace" && !digits[i] && i > 0) boxes.current[i - 1]?.focus(); }} className="input aspect-square p-0 text-center font-mono text-sm sm:text-base" />
                ))}
              </div>
              {error && <p className="mt-3 text-sm text-[color:var(--color-negative)]">{error}</p>}
              <Button type="submit" variant="primary" className="mt-6 w-full justify-center" disabled={busy}>{busy ? "Verifying…" : "Verify + enter"}</Button>
              <button type="button" className="mt-3 w-full text-center text-xs text-faint hover:text-muted" onClick={reset}>← Use a different email</button>
            </motion.form>
          )}
          {step === "expired" && <StatePanel icon={clock} title="Code expired" body="For your security this code is no longer valid. Send a fresh one." />}
          {step === "used" && <StatePanel icon={clock} title="Code already used" body="This code was already used to sign in. Send a new one if that wasn't you." />}
        </AnimatePresence>
      </div>
    </motion.div>
  );

  return (
    <div className="lg:grid lg:min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <div className="relative flex flex-col items-center justify-center overflow-hidden px-6 pt-12 pb-6 text-center lg:border-r lg:border-line lg:p-12">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="grid-backdrop absolute inset-0 opacity-40" />
          <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(246,138,36,0.2),transparent_62%)] blur-2xl animate-float" />
          <div className="absolute -bottom-24 left-1/3 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(25,99,169,0.18),transparent_62%)] blur-2xl" style={{ animation: "float 9s ease-in-out infinite" }} />
        </div>
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="flex flex-col items-center">
          <BrandMark variant="vertical" className="h-28 w-28 animate-[float_7s_ease-in-out_infinite] drop-shadow-[0_0_45px_rgba(246,138,36,0.28)] sm:h-32 sm:w-32 lg:h-44 lg:w-44" />
          <div className="eyebrow mt-5 lg:mt-8">Closed Alpha · Tester Portal</div>
          <h1 className="display-caps mt-4 max-w-md font-display text-2xl leading-tight sm:text-3xl lg:text-4xl">Help us forge <span className="flame-text">the network.</span></h1>
          <p className="mt-3 max-w-sm text-sm text-muted sm:text-[0.95rem] lg:mt-4">Run a node, break things, file reports. You're testing PYRAX before the world sees it.</p>
        </motion.div>
        <div className="hidden text-xs text-faint lg:absolute lg:inset-x-0 lg:bottom-6 lg:block">© {new Date().getFullYear()} PYRAX LLC · Authorized testers only.</div>
      </div>
      <div className="relative grid place-items-center px-6 pb-12 pt-4 lg:min-h-screen lg:py-12">
        <div className="flex w-full max-w-sm flex-col items-center">{card}<div className="mt-6 text-center text-xs text-faint lg:hidden">© {new Date().getFullYear()} PYRAX LLC</div></div>
      </div>
    </div>
  );
}
