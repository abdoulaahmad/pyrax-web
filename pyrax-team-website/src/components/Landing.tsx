// SPDX-License-Identifier: LicenseRef-Proprietary
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Icon, BrandMark } from "./ui";
import { COMPANY_EMAIL_DOMAIN } from "../lib/profile";

const N = 9;
type Step = "email" | "code" | "expired" | "used";

export default function Landing() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState<string[]>(Array(N).fill(""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState(0); // seconds left on the live code
  const [ttl, setTtl] = useState(600);
  const rid = useRef<string>("");      // opaque watch-token from the server
  const endsAt = useRef<number>(0);    // wall-clock ms when the code expires
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  // Request a fresh code, then arm the countdown. Shared by first send + "Send a new code".
  async function sendCode(): Promise<void> {
    setError(""); setBusy(true);
    try {
      const res = await fetch("/api/auth/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) { setError(data.error || "Something went wrong. Please try again."); setBusy(false); return; }
      const t = Number(data.ttl) || 600;
      rid.current = typeof data.rid === "string" ? data.rid : "";
      endsAt.current = Date.now() + t * 1000;
      setTtl(t); setRemaining(t); setDigits(Array(N).fill("")); setStep("code");
      setTimeout(() => boxes.current[0]?.focus(), 60);
    } catch { setError("Network error. Please try again."); }
    setBusy(false);
  }
  async function requestCode(e: React.FormEvent) { e.preventDefault(); await sendCode(); }

  // Tick the countdown once a second off a fixed end-time (no drift). Hits 0 → expired.
  useEffect(() => {
    if (step !== "code") return;
    const tick = () => {
      const rem = Math.max(0, Math.round((endsAt.current - Date.now()) / 1000));
      setRemaining(rem);
      if (rem <= 0) setStep("expired");
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [step]);

  // Poll the code's live state so it auto-flips to "used"/"expired" even if consumed elsewhere.
  useEffect(() => {
    if (step !== "code" || !rid.current) return;
    const id = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/auth/status?rid=${encodeURIComponent(rid.current)}`, { headers: { accept: "application/json" } });
        const data = await res.json().catch(() => ({}));
        if (!data?.ok) return;
        if (data.state === "used") setStep("used");
        else if (data.state === "expired") setStep("expired");
      } catch { /* transient; keep polling */ }
    }, 4000);
    return () => window.clearInterval(id);
  }, [step]);

  function setDigit(i: number, v: string) {
    const ch = v.replace(/\D/g, "").slice(-1); const next = [...digits]; next[i] = ch; setDigits(next);
    if (ch && i < N - 1) boxes.current[i + 1]?.focus();
  }
  function onPaste(e: React.ClipboardEvent) {
    const t = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, N); if (!t) return; e.preventDefault();
    const next = Array(N).fill(""); for (let i = 0; i < t.length; i++) next[i] = t[i]; setDigits(next);
    boxes.current[Math.min(t.length, N - 1)]?.focus();
  }
  async function verify(e: React.FormEvent) {
    e.preventDefault(); const code = digits.join(""); if (code.length < N) return setError("Enter the full code.");
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/auth/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, code }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) { setError(data.error || "That code is invalid or has expired."); setBusy(false); setDigits(Array(N).fill("")); boxes.current[0]?.focus(); return; }
      window.location.href = "/app";
    } catch { setError("Network error. Please try again."); setBusy(false); }
  }
  function reset() { setStep("email"); setDigits(Array(N).fill("")); setError(""); }

  const mm = Math.floor(remaining / 60), ss = remaining % 60;
  const timeStr = `${mm}:${String(ss).padStart(2, "0")}`;
  const low = remaining <= 60;
  const pct = ttl ? Math.max(0, Math.min(100, (remaining / ttl) * 100)) : 0;

  const clock = (
    <svg viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
  );
  const check = (
    <svg viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="m8 12 2.6 2.6L16 9" /></svg>
  );

  const StatePanel = ({ icon, tone, title, body }: { icon: React.ReactNode; tone: "warn" | "ok"; title: string; body: string }) => (
    <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="text-center">
      <div className={`mx-auto grid h-12 w-12 place-items-center rounded-full ${tone === "warn" ? "bg-[rgba(215,84,39,0.12)] text-[color:var(--color-ember)]" : "bg-[rgba(96,184,204,0.12)] text-[color:var(--color-water-1)]"}`}>
        <span className="h-6 w-6">{icon}</span>
      </div>
      <h2 className="mt-4 text-xl font-extrabold">{title}</h2>
      <p className="mt-1 text-sm text-muted">{body}</p>
      <Button type="button" variant="primary" className="mt-6 w-full justify-center" disabled={busy} onClick={sendCode}>{busy ? "Sending…" : "Send a new code"}</Button>
      <button type="button" className="mt-3 w-full text-center text-xs text-faint hover:text-muted" onClick={reset}>← Use a different email</button>
    </motion.div>
  );

  const loginCard = (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }} className="card w-full max-w-sm overflow-hidden">
      <div className="flame-bar h-1 w-full" />
      <div className="p-7 sm:p-8">
        <AnimatePresence mode="wait">
          {step === "email" && (
            <motion.form key="e" onSubmit={requestCode} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.22 }}>
              <h2 className="text-xl font-extrabold">Team sign in</h2>
              <p className="mt-1 text-sm text-muted">We'll email a one-time sign-in code. No password, no link.</p>
              <label className="label mt-6">Work email</label>
              <div className="relative">
                <Icon.mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                <input className="input pl-9" type="email" autoComplete="email" required placeholder={`you@${COMPANY_EMAIL_DOMAIN}`} value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <p className="mt-2 text-xs text-faint">Whitelisted <span className="text-muted">@{COMPANY_EMAIL_DOMAIN}</span> accounts only.</p>
              {error && <p className="mt-3 text-sm text-[color:var(--color-negative)]">{error}</p>}
              <Button type="submit" variant="primary" className="mt-6 w-full justify-center" disabled={busy}>{busy ? "Sending…" : "Send code"}</Button>
            </motion.form>
          )}

          {step === "code" && (
            <motion.form key="c" onSubmit={verify} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.22 }}>
              <h2 className="text-xl font-extrabold">Enter your code</h2>
              <p className="mt-1 text-sm text-muted">Sent to <span className="text-ink">{email || "your email"}</span>.</p>

              {/* live countdown */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-faint">Code expires in</span>
                  <span className={`inline-flex items-center gap-1 font-mono tabular-nums font-semibold ${low ? "text-[color:var(--color-ember)]" : "text-ink"}`}>
                    <span className={`h-3.5 w-3.5 ${low ? "animate-pulse" : ""}`}>{clock}</span>{timeStr}
                  </span>
                </div>
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-line">
                  <motion.div className={low ? "h-full rounded-full bg-[color:var(--color-ember)]" : "h-full rounded-full flame-bar"} animate={{ width: `${pct}%` }} transition={{ ease: "linear", duration: 1 }} />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-9 gap-1" onPaste={onPaste}>
                {digits.map((d, i) => (
                  <input key={i} ref={(el) => { boxes.current[i] = el; }} inputMode="numeric" maxLength={1} value={d}
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Backspace" && !digits[i] && i > 0) boxes.current[i - 1]?.focus(); }}
                    className="input aspect-square p-0 text-center font-mono text-sm sm:text-base" />
                ))}
              </div>
              {error && <p className="mt-3 text-sm text-[color:var(--color-negative)]">{error}</p>}
              <Button type="submit" variant="primary" className="mt-6 w-full justify-center" disabled={busy}>{busy ? "Verifying…" : "Verify + enter"}</Button>
              <button type="button" className="mt-3 w-full text-center text-xs text-faint hover:text-muted" onClick={reset}>← Use a different email</button>
            </motion.form>
          )}

          {step === "expired" && (
            <StatePanel icon={clock} tone="warn" title="Code expired" body="For your security this code is no longer valid. Send a fresh one to sign in." />
          )}
          {step === "used" && (
            <StatePanel icon={check} tone="ok" title="Code already used" body="This code has already been used to sign in. If that wasn't you on this device, send a new one." />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );

  const Ambient = () => (
    <div className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(245,134,34,0.2),transparent_62%)] blur-2xl animate-float" />
      <div className="absolute -bottom-24 left-1/3 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(28,99,166,0.18),transparent_62%)] blur-2xl" style={{ animation: "float 9s ease-in-out infinite" }} />
      <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px)", backgroundSize: "44px 44px", maskImage: "radial-gradient(circle at 50% 25%,#000,transparent 78%)" }} />
    </div>
  );

  return (
    <div className="lg:grid lg:min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel — centered; full-height on desktop, a clean compact hero on mobile */}
      <div className="relative flex flex-col items-center justify-center overflow-hidden px-6 pt-12 pb-6 text-center lg:border-r lg:border-line lg:p-12">
        <Ambient />
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="flex flex-col items-center">
          <BrandMark variant="vertical" className="h-28 w-28 animate-[float_7s_ease-in-out_infinite] drop-shadow-[0_0_45px_rgba(245,134,34,0.28)] sm:h-32 sm:w-32 lg:h-48 lg:w-44" />
          <div className="chip chip-brand mt-5 lg:mt-8">Secure Access Team Portal</div>
          <h1 className="mt-4 max-w-md font-display text-2xl font-extrabold leading-tight sm:text-3xl lg:text-4xl">Operate the network with <span className="flame-text">confidence.</span></h1>
          <p className="mt-3 max-w-sm text-sm text-muted sm:text-[0.95rem] lg:mt-4">Welcome back, team. Your secure space for everything we're building at PYRAX — sign in to jump back in.</p>
        </motion.div>
        <div className="hidden text-xs text-faint lg:absolute lg:inset-x-0 lg:bottom-6 lg:block">© {new Date().getFullYear()} PYRAX LLC · Authorized personnel only.</div>
      </div>

      {/* Login panel */}
      <div className="relative grid place-items-center px-6 pb-12 pt-4 lg:min-h-screen lg:py-12 lg:pt-12">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(700px_500px_at_70%_-10%,rgba(215,84,39,0.08),transparent_60%)] lg:hidden" />
        <div className="flex w-full max-w-sm flex-col items-center">
          {loginCard}
          <div className="mt-6 text-center text-xs text-faint lg:hidden">© {new Date().getFullYear()} PYRAX LLC · Authorized personnel only.</div>
        </div>
      </div>
    </div>
  );
}
