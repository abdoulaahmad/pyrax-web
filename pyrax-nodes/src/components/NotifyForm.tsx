// SPDX-License-Identifier: LicenseRef-Proprietary
//
// One signup, two opt-ins (portal opens / app updates) + an optional self-hosted browser-push
// subscription (VAPID). Reused on the /notify page and the team-controlled "closed" gate.
import React, { useState } from "react";

function urlB64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function subscribePush(): Promise<any | null> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
    const reg = await navigator.serviceWorker.register("/sw.js");
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return null;
    const v = await (await fetch("/api/push/vapid")).json();
    if (!v.ok || !v.configured || !v.publicKey) return null;
    const existing = await reg.pushManager.getSubscription();
    const sub = existing || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(v.publicKey) }));
    return sub.toJSON();
  } catch { return null; }
}

export default function NotifyForm({ compact = false, purpose = "general" }: { compact?: boolean; purpose?: "general" | "downloads" }) {
  const downloadsMode = purpose === "downloads";
  const [email, setEmail] = useState("");
  const [portal, setPortal] = useState(true);
  const [updates, setUpdates] = useState(true);
  const [wantPush, setWantPush] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | { email: boolean; push: boolean }>(null);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setErr("Enter a valid email address."); return; }
    if (!downloadsMode && !portal && !updates && !wantPush) { setErr("Pick at least one thing to be notified about."); return; }
    setBusy(true);
    let push: any = null;
    if (wantPush) { push = await subscribePush(); if (!push) setErr("Browser notifications were blocked or aren't supported — we'll still email you."); }
    const body = downloadsMode ? { email: email.trim(), downloads: true, push } : { email: email.trim(), portal, updates, push };
    try {
      const r = await (await fetch("/api/notify/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).json();
      if (!r.ok) { setErr(r.error || "Couldn't save your subscription."); setBusy(false); return; }
      setDone({ email: !!r.email, push: !!r.push });
    } catch { setErr("Network error — please try again."); }
    setBusy(false);
  }

  if (done) {
    const what = downloadsMode ? "official downloads open" : portal && updates ? "the portal opens or an app updates" : portal ? "the portal opens" : "an app updates";
    return (
      <div className={`card ${compact ? "p-5" : "p-7"} text-center`}>
        <div className="mx-auto mb-2 grid h-11 w-11 place-items-center rounded-full bg-[rgba(52,211,153,0.12)] text-2xl">✓</div>
        <div className="text-lg font-bold">You're on the list</div>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{done.email ? "We'll email you" : "We'll notify you"}{done.push ? " and send a browser notification" : ""} the moment {what}. Thanks for your interest in PYRAX.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={`card ${compact ? "p-5" : "p-7"}`}>
      {!compact && <div className="mb-3"><div className="text-lg font-bold">{downloadsMode ? "Get notified when downloads open" : "Get notified"}</div><p className="text-sm text-muted">{downloadsMode ? "We'll email you the moment official public node downloads go live." : "We'll let you know when the portal opens and when a new app ships."}</p></div>}
      <label className="label">Email address</label>
      <input className="input" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => { setEmail(e.target.value); setErr(""); }} />
      <div className="mt-4 space-y-2.5">
        {!downloadsMode && <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted"><input type="checkbox" className="h-4 w-4 accent-[color:var(--color-brand)]" checked={portal} onChange={(e) => setPortal(e.target.checked)} /> Notify me when the <span className="text-ink">portal opens</span></label>}
        {!downloadsMode && <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted"><input type="checkbox" className="h-4 w-4 accent-[color:var(--color-brand)]" checked={updates} onChange={(e) => setUpdates(e.target.checked)} /> Notify me when an <span className="text-ink">app is updated</span></label>}
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted"><input type="checkbox" className="h-4 w-4 accent-[color:var(--color-brand)]" checked={wantPush} onChange={(e) => setWantPush(e.target.checked)} /> Also send me a <span className="text-ink">browser notification</span></label>
      </div>
      {err && <p className="mt-3 text-sm text-[color:var(--color-warning)]">{err}</p>}
      <button type="submit" disabled={busy} className="btn btn-primary mt-4 w-full justify-center">{busy ? "Subscribing…" : downloadsMode ? "Notify me when downloads open" : "Notify me"}</button>
      <p className="mt-2 text-center text-xs text-faint">No spam. Unsubscribe anytime. We self-host our notification workers.</p>
    </form>
  );
}
