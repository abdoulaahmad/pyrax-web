// SPDX-License-Identifier: LicenseRef-Proprietary
//
// First-login legal gate + reusable legal UI. On first sign-in (or after a document version bump),
// a tester must read the NDA to the bottom, fill in their name + typed digital signature, and accept
// — then read the Alpha Test Program T&C to the bottom and accept. Declining either permanently
// deletes their account. After both, a full rewards-transparency modal is shown (also re-openable
// from the dashboard). The same document renderer powers the read-only Legal pages.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "./ui";
import { LEGAL_DOCS, NDA, TOS, renderLegalMarkdown, type LegalDoc } from "../lib/legal-docs";
import { REWARDS, usd, PYX_USD, TIERS } from "../lib/rewards";

export interface LegalStatus { ndaAccepted: boolean; tosAccepted: boolean; exempt?: boolean; ndaVersion?: string; tosVersion?: string }

const fmtPyrx = (n: number) => n.toLocaleString("en-US");
const fmtUsd = (n: number) => "$" + usd(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Read-only rendered legal document (modals + Legal pages). */
export function LegalDocBody({ doc }: { doc: LegalDoc }) {
  const html = useMemo(() => renderLegalMarkdown(doc.body), [doc.id, doc.version]);
  return <div className="legal-doc" dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Scroll container that flips `onEnd` once the reader reaches (near) the bottom. Short documents
 *  that don't scroll are treated as already read. */
function ScrollDoc({ doc, onEnd }: { doc: LegalDoc; onEnd: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const fired = useRef(false);
  const check = () => {
    const el = ref.current; if (!el || fired.current) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 28) { fired.current = true; onEnd(); }
  };
  useEffect(() => { const el = ref.current; if (el && el.scrollHeight <= el.clientHeight + 28) { fired.current = true; onEnd(); } }, []);
  return (
    // Mobile scroll reliability: `overscroll-contain` stops the gesture chaining to the scroll-locked
    // <body> (the iOS cause of "it won't scroll"); `touch-pan-y` + `-webkit-overflow-scrolling` keep
    // momentum touch-scroll working; `min-h-[8rem]` keeps a usable window so the doc never collapses to
    // an untouchable sliver on short screens.
    <div
      ref={ref}
      onScroll={check}
      className="min-h-[8rem] flex-1 touch-pan-y overflow-y-auto overscroll-contain rounded-xl border border-line bg-[rgba(5,6,9,0.55)] px-5 py-4"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <LegalDocBody doc={doc} />
    </div>
  );
}

function ModalShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  // The gate is not escapable: lock background scroll and swallow Escape while it's open. The only
  // ways out are the explicit Accept / Decline (or, for the rewards step, its Close) actions.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); } };
    window.addEventListener("keydown", onKey, true);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey, true); };
  }, []);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overscroll-none bg-black/80 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true">
      {/* `dvh` (not `vh`) so mobile browser bars don't push the footer form/buttons off-screen. `h-full`
          gives the inner document a bounded height so it scrolls internally instead of growing the modal. */}
      <div className="flex h-full max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-line bg-[rgba(10,12,19,0.98)] shadow-2xl">
        <div className="flame-bar h-1 shrink-0" />
        <div className="shrink-0 px-6 pb-3 pt-5">
          <h2 className="text-lg font-semibold text-ink sm:text-xl">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

/** The blocking gate. The NDA is forced only ONCE (first login ever); the Alpha T&C is forced on
 *  EVERY login. The rewards-transparency modal is shown only on the very first completion. Renders
 *  nothing if the tester is exempt, or has already signed the NDA and accepted the T&C this session. */
export function LegalGate({ legal, displayName, onComplete }: { legal: LegalStatus; displayName?: string; onComplete: () => void }) {
  const firstTime = !legal.exempt && !legal.ndaAccepted;
  const start: "nda" | "tos" | "done" = legal.exempt ? "done" : !legal.ndaAccepted ? "nda" : !legal.tosAccepted ? "tos" : "done";
  const [phase, setPhase] = useState<"nda" | "tos" | "rewards" | "done">(start);
  const finish = () => { setPhase("done"); onComplete(); };
  useEffect(() => { if (start === "done") onComplete(); /* nothing pending */ }, []);
  if (phase === "done") return null;
  if (phase === "rewards") return <RewardsModal firstTime onClose={finish} />;
  if (phase === "nda") return <NdaModal defaultName={displayName} onAccepted={() => setPhase("tos")} />;
  return <TosModal onAccepted={() => (firstTime ? setPhase("rewards") : finish())} />;
}

function DeclineConfirm({ onCancel }: { onCancel: () => void }) {
  const [busy, setBusy] = useState(false);
  async function confirmDecline() {
    setBusy(true);
    try { await fetch("/api/legal/decline", { method: "POST" }); } catch {}
    window.location.href = "/?removed=1";
  }
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/85 p-6">
      <div className="w-full max-w-md rounded-2xl border border-[rgba(215,84,39,0.5)] bg-[rgba(14,10,12,0.98)] p-6 text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-[rgba(215,84,39,0.15)] text-2xl">⚠️</div>
        <h3 className="text-base font-bold text-ink">Decline and leave the program?</h3>
        <p className="mt-2 text-sm text-muted">If you decline, your tester account and all associated data will be <strong className="text-ink">permanently deleted</strong> and you'll be removed from the portal. This cannot be undone.</p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>Go back</Button>
          <Button variant="danger" onClick={confirmDecline} disabled={busy}>{busy ? "Removing…" : "Decline & delete my account"}</Button>
        </div>
      </div>
    </div>
  );
}

function NdaModal({ defaultName, onAccepted }: { defaultName?: string; onAccepted: () => void }) {
  const parts = (defaultName || "").trim().split(/\s+/);
  const [first, setFirst] = useState(parts[0] || "");
  const [last, setLast] = useState(parts.slice(1).join(" ") || "");
  const [signature, setSignature] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [read, setRead] = useState(false);
  const [busy, setBusy] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [err, setErr] = useState("");
  const recipientName = `${first.trim()} ${last.trim()}`.trim();
  const valid = read && first.trim() && last.trim() && signature.trim() && confirmed;

  async function accept() {
    setErr(""); setBusy(true);
    try {
      const r = await (await fetch("/api/legal/accept", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ doc: "nda", recipientName, signature: signature.trim(), confirmed }) })).json();
      if (!r.ok) { setErr(r.error || "Could not record your acceptance."); setBusy(false); return; }
      onAccepted();
    } catch { setErr("Network error. Please try again."); setBusy(false); }
  }

  return (
    <ModalShell title={NDA.modalTitle} subtitle="Please read the agreement in full, then sign below to continue. You must scroll to the bottom before you can accept.">
      <div className="flex min-h-0 flex-1 flex-col gap-3 px-6">
        <ScrollDoc doc={NDA} onEnd={() => setRead(true)} />
        {!read && <p className="shrink-0 text-center text-xs text-[color:var(--color-gold)]">↓ Scroll to the end of the agreement to enable signing</p>}
      </div>
      <div className="shrink-0 border-t border-line bg-[rgba(5,6,9,0.6)] px-6 py-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">First name <span className="text-[color:var(--color-ember)]">*</span></label><input className="input" value={first} onChange={(e) => setFirst(e.target.value)} placeholder="First" autoComplete="given-name" /></div>
          <div><label className="label">Last name <span className="text-[color:var(--color-ember)]">*</span></label><input className="input" value={last} onChange={(e) => setLast(e.target.value)} placeholder="Last" autoComplete="family-name" /></div>
        </div>
        <div className="mt-3"><label className="label">Digital signature — type your full name <span className="text-[color:var(--color-ember)]">*</span></label>
          <input className="input" style={{ fontFamily: "'Segoe Script','Brush Script MT',cursive", fontSize: "1.1rem" }} value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Type your name" />
        </div>
        <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm text-muted">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[color:var(--color-brand)]" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} disabled={!read} />
          <span>I confirm that the name typed above is my <strong className="text-ink">digital signature</strong>, and I agree to be legally bound by this Non-Disclosure Agreement. My IP address and the date are recorded at signing.</span>
        </label>
        {err && <p className="mt-2 text-sm text-[color:var(--color-negative)]">{err}</p>}
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button onClick={() => setDeclining(true)} className="text-sm text-faint underline-offset-2 hover:text-ink hover:underline">Decline</button>
          <Button variant="primary" onClick={accept} disabled={!valid || busy}>{busy ? "Signing…" : "Accept & sign"}</Button>
        </div>
      </div>
      {declining && <DeclineConfirm onCancel={() => setDeclining(false)} />}
    </ModalShell>
  );
}

function TosModal({ onAccepted }: { onAccepted: () => void }) {
  const [read, setRead] = useState(false);
  const [busy, setBusy] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [err, setErr] = useState("");
  async function accept() {
    setErr(""); setBusy(true);
    try {
      const r = await (await fetch("/api/legal/accept", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ doc: "tos" }) })).json();
      if (!r.ok) { setErr(r.error || "Could not record your acceptance."); setBusy(false); return; }
      onAccepted();
    } catch { setErr("Network error. Please try again."); setBusy(false); }
  }
  return (
    <ModalShell title={TOS.modalTitle} subtitle="One more — please read the Alpha Test Program Terms & Conditions to the bottom, then accept to enter the portal.">
      <div className="flex min-h-0 flex-1 flex-col gap-3 px-6">
        <ScrollDoc doc={TOS} onEnd={() => setRead(true)} />
        {!read && <p className="shrink-0 text-center text-xs text-[color:var(--color-gold)]">↓ Scroll to the end to enable acceptance</p>}
      </div>
      <div className="shrink-0 border-t border-line bg-[rgba(5,6,9,0.6)] px-6 py-4">
        {err && <p className="mb-2 text-sm text-[color:var(--color-negative)]">{err}</p>}
        <p className="mb-3 text-xs text-faint">By accepting, you agree to the Alpha Test Program Terms & Conditions. Your IP address and the date are recorded.</p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button onClick={() => setDeclining(true)} className="text-sm text-faint underline-offset-2 hover:text-ink hover:underline">Decline</button>
          <Button variant="primary" onClick={accept} disabled={!read || busy}>{busy ? "Saving…" : "Accept & enter portal"}</Button>
        </div>
      </div>
      {declining && <DeclineConfirm onCancel={() => setDeclining(false)} />}
    </ModalShell>
  );
}

function Row({ label, value, sub }: { label: React.ReactNode; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line-soft py-2 last:border-0">
      <div className="min-w-0"><div className="text-sm text-ink">{label}</div>{sub && <div className="text-xs text-faint">{sub}</div>}</div>
      <div className="shrink-0 text-right text-sm font-semibold text-[color:var(--color-gold)]">{value}</div>
    </div>
  );
}

/** Full rewards-transparency breakdown. Used as the first-login final step AND re-openable anytime
 *  from the dashboard. Numbers are pulled straight from the live reward economics (rewards.ts). */
export function RewardsContent() {
  const founding = REWARDS.foundingTester;
  return (
    <div className="space-y-5 text-sm">
      <div className="rounded-xl border border-[rgba(246,138,36,0.3)] bg-[rgba(246,138,36,0.06)] p-4">
        <div className="font-semibold text-ink">How tester rewards work</div>
        <p className="mt-1 text-muted">You earn <strong className="text-ink">PYRX</strong> for helping test the network. Rewards <strong className="text-ink">accrue now</strong> and are paid out via the <strong className="text-ink">mainnet airdrop</strong>. Everything you earn is shown transparently on your dashboard ledger. Valued at <strong className="text-ink">${PYX_USD}/PYRX</strong> for the USD estimates below.</p>
        <p className="mt-2 text-xs text-faint">Only reward-eligible testers accrue (PYRAX staff accounts participate but don't earn). One node is rewarded per tester, even if you run several.</p>
      </div>

      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-faint">Monthly node uptime <span className="normal-case text-faint">(best single node)</span></div>
        <div className="rounded-xl border border-line bg-[rgba(5,6,9,0.4)] px-4">
          {REWARDS.uptimeTiers.filter((t) => t.pyrx > 0).map((t) => (
            <Row key={t.min} label={`≥ ${t.min}% uptime`} value={`${fmtPyrx(t.pyrx)} PYRX`} sub={`≈ ${fmtUsd(t.pyrx)} / month`} />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-faint">Participation</div>
        <div className="rounded-xl border border-line bg-[rgba(5,6,9,0.4)] px-4">
          <Row label="Update your app on time" value={`${fmtPyrx(REWARDS.updateOnTime)} PYRX`} sub={`per release, within ${REWARDS.updateWindowHours}h`} />
          <Row label="Accepted test report" value={`${fmtPyrx(REWARDS.reportAccepted)} PYRX`} sub={`+ ${fmtPyrx(REWARDS.reportOnTimeBonus)} if on time`} />
          <Row label="Consistency multiplier" value={`×${REWARDS.consistencyMultiplier}`} sub="full month: ≥95% uptime, all updates on time, ≥1 accepted report" />
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-faint">Bug bounties <span className="normal-case text-faint">(set by severity)</span></div>
        <div className="rounded-xl border border-line bg-[rgba(5,6,9,0.4)] px-4">
          <Row label="Critical" value={`${fmtPyrx(REWARDS.bug.critical)} PYRX`} sub={`≈ ${fmtUsd(REWARDS.bug.critical)}`} />
          <Row label="High" value={`${fmtPyrx(REWARDS.bug.high)} PYRX`} sub={`≈ ${fmtUsd(REWARDS.bug.high)}`} />
          <Row label="Medium" value={`${fmtPyrx(REWARDS.bug.medium)} PYRX`} sub={`≈ ${fmtUsd(REWARDS.bug.medium)}`} />
          <Row label="Low" value={`${fmtPyrx(REWARDS.bug.low)} PYRX`} sub={`≈ ${fmtUsd(REWARDS.bug.low)}`} />
          <Row label="Great reproduction steps" value={`+${REWARDS.bugReproBonusPct}%`} sub="bonus on the bounty" />
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-faint">Founding Testers</div>
        <div className="rounded-xl border border-[rgba(252,208,61,0.35)] bg-[rgba(252,208,61,0.06)] px-4">
          <Row label={`First ${founding.count} to connect a node`} value={`${fmtPyrx(founding.bonus)} PYRX`} sub={`one-time bonus + the "${founding.title}" title`} />
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-faint">Contribution tiers</div>
        <div className="flex flex-wrap gap-2">
          {[...TIERS].reverse().map((t) => (
            <span key={t.key} className="chip" style={{ color: t.color, borderColor: t.color + "66" }}>{t.label} · {fmtPyrx(t.min)}+ PYRX</span>
          ))}
        </div>
      </div>

      <p className="text-xs text-faint">Reward rates are generous during the alpha and may be adjusted for future programs. Payouts occur at the mainnet airdrop, subject to the Alpha Test Program Terms. Nothing here is a guarantee of token value.</p>
    </div>
  );
}

export function RewardsModal({ onClose, firstTime }: { onClose: () => void; firstTime?: boolean }) {
  return (
    <ModalShell title={firstTime ? "Welcome — here's how rewards work" : "Rewards & how to earn"} subtitle={firstTime ? "Full transparency on what you can earn as a PYRAX tester." : undefined}>
      <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-6 py-2" style={{ WebkitOverflowScrolling: "touch" }}><RewardsContent /></div>
      <div className="shrink-0 border-t border-line bg-[rgba(5,6,9,0.6)] px-6 py-4 text-right">
        <Button variant="primary" onClick={onClose}>{firstTime ? "Got it — enter the portal" : "Close"}</Button>
      </div>
    </ModalShell>
  );
}
