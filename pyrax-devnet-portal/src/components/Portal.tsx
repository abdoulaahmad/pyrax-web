// SPDX-License-Identifier: LicenseRef-Proprietary
import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo, Icon, Badge, BrandMark } from "./ui";
import { can, type Permission } from "../lib/permissions";
import { NAV, type ModuleKey as NavKey } from "../lib/nav";
import { Downloads, IssueCouncil, Leaderboard, Chat, Releases, Settings, Triage, Testers, NdaPage, TosPage } from "./modules";
import Dashboard from "./Dashboard";
import Training from "./Training";
import Quiz from "./Quiz";
import Missions from "./Missions";
import Certification from "./Certification";
import { Tests } from "./Tests";
import { LegalGate, type LegalStatus } from "./Legal";

type ModuleKey = NavKey;
export interface Me { id: string; email: string; displayName: string; handle: string; payoutWallet: string | null; rewardEligible: boolean; isStaff: boolean; permissions: Permission[]; isSuperuser: boolean; status: string; sessionMaxDays: number; foundingRank: number | null; }

function Bell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  async function load() { try { const d = await (await fetch("/api/notifications")).json(); if (d.ok) { setItems(d.notifications); setUnread(d.unread); } } catch { } }
  useEffect(() => { load(); const i = window.setInterval(load, 30000); return () => window.clearInterval(i); }, []);
  async function toggle() { const n = !open; setOpen(n); if (n && unread) { await fetch("/api/notifications", { method: "POST" }).catch(() => { }); setUnread(0); } }
  return (
    <div className="relative">
      <button onClick={toggle} className="relative grid h-9 w-9 place-items-center rounded-full border border-line text-muted transition hover:border-[color:#34405a] hover:text-ink" aria-label="Notifications">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
        {unread > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-[1rem] place-items-center rounded-full bg-[color:var(--color-brand)] px-1 text-[0.6rem] font-bold text-[#1a0f06]">{unread}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.98 }} transition={{ duration: 0.16 }}
            className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-2xl border border-line bg-[rgba(10,12,19,0.98)] shadow-2xl backdrop-blur-xl">
            <div className="eyebrow border-b border-line-soft px-4 py-2.5 text-faint">Notifications</div>
            <div className="max-h-96 overflow-y-auto p-1.5">
              {items.length === 0 ? <p className="p-4 text-center text-xs text-faint">Nothing yet.</p> : items.map((n) => (
                <a key={n.id} href={n.link || "#"} className="block rounded-xl px-3 py-2.5 transition hover:bg-[rgba(255,255,255,0.04)]"><div className="text-sm font-medium">{n.title}</div><div className="text-xs text-muted">{n.body}</div></a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Portal() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [active, setActive] = useState<ModuleKey>("dashboard");
  const [legal, setLegal] = useState<LegalStatus | null>(null);
  const [gateDone, setGateDone] = useState(false);

  useEffect(() => {
    fetch("/api/me", { headers: { accept: "application/json" } }).then((r) => r.json())
      .then((d) => {
        if (!d.ok || !d.tester) { window.location.href = "/"; return; }
        setMe(d.tester);
        // Fail-closed: if the server's legal status is missing or malformed, default to NOT accepted
        // (and NOT exempt) so the signing gate SHOWS. Exemption is only ever granted by a well-formed
        // server response (the superuser) — never synthesized on the client.
        const L = d.legal;
        const safe: LegalStatus = L && typeof L === "object"
          ? { ndaAccepted: !!L.ndaAccepted, tosAccepted: !!L.tosAccepted, exempt: !!L.exempt, ndaVersion: L.ndaVersion, tosVersion: L.tosVersion }
          : { ndaAccepted: false, tosAccepted: false, exempt: false };
        setLegal(safe);
        setLoading(false);
      })
      .catch(() => { window.location.href = "/"; });
  }, []);

  const subject = useMemo(() => me ? { isSuperuser: me.isSuperuser, permissions: me.permissions } : { isSuperuser: false, permissions: [] as Permission[] }, [me]);

  if (loading || !me) return <div className="grid min-h-screen place-items-center"><div className="flex items-center gap-3 text-sm text-muted"><span className="h-4 w-4 animate-spin-slow rounded-full border-2 border-line border-t-[color:var(--color-brand)]" /> Loading…</div></div>;

  const meUser = me;
  const isCertified = !!(meUser as any).certificationId ||
    ['CERTIFIED', 'NODE_DOWNLOAD', 'NODE_PAIRED', 'TESTING', 'COMPLETED'].includes((meUser as any).onboardingStatus || '') ||
    ((meUser as any).currentMission || 1) > 3;

  const visible = NAV.filter((n) => {
    // If not certified, restrict access to only Onboarding, Legal, and Settings modules
    if (!isCertified && !['missions', 'training', 'quiz', 'certification', 'settings', 'nda', 'tos'].includes(n.key)) {
      return false;
    }
    return n.perm === null || can(subject, n.perm);
  });

  const cur = visible.find((n) => n.key === active) ? active : (isCertified ? "dashboard" : "missions");
  const groups = Array.from(new Set(visible.map((n) => n.group)));
  const initials = (meUser.displayName || meUser.email).split(/[\s@.]/).filter(Boolean).map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  function NavList({ pillId, onPick }: { pillId: string; onPick?: () => void }) {
    return <>{groups.map((g) => (
      <div key={g}>
        <div className="eyebrow px-3 pb-1.5 text-faint">{g}</div>
        {visible.filter((n) => n.group === g).map((n, i) => {
          const I = Icon[n.icon]; const on = cur === n.key;
          return (
            <motion.button key={n.key} onClick={() => { setActive(n.key); onPick?.(); }} initial={onPick ? { opacity: 0, x: -16 } : false} animate={{ opacity: 1, x: 0 }} transition={{ delay: onPick ? 0.04 * i : 0 }}
              className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${on ? "text-ink" : "text-muted hover:bg-[rgba(255,255,255,0.04)] hover:text-ink"}`}>
              {on && <motion.span layoutId={pillId} className="absolute inset-0 rounded-xl border border-[color:rgba(246,138,36,0.35)] bg-[rgba(246,138,36,0.08)]" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
              {I && <I className="relative z-10 h-[18px] w-[18px]" />}<span className="relative z-10 font-medium">{n.label}</span>
            </motion.button>
          );
        })}
      </div>
    ))}</>;
  }
  async function signOut() { await fetch("/api/auth/logout", { method: "POST" }).catch(() => { }); window.location.href = "/"; }
  const UserFooter = () => (
    <div className="rounded-2xl border border-line bg-[rgba(5,6,9,0.5)] p-3">
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-full flame-bar text-sm font-bold text-[#1a0f06]">{initials}</div>
        <div className="min-w-0"><div className="truncate text-sm font-semibold">{meUser.displayName || meUser.email}</div><div className="truncate text-xs text-faint">{meUser.handle ? "@" + meUser.handle : meUser.email}</div></div>
      </div>
      <button onClick={signOut} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-line py-1.5 text-xs text-muted transition hover:border-[color:#34405a] hover:text-ink"><Icon.logout className="h-3.5 w-3.5" /> Sign out</button>
    </div>
  );

  function render() {
    switch (cur) {
      case "dashboard": return <Dashboard onNavigate={(k) => setActive(k as ModuleKey)} />;
      case "training": return <Training />;
      case "quiz": return <Quiz />;
      case "missions": return <Missions onNavigate={(k) => setActive(k as ModuleKey)} />;
      case "certification": return <Certification />;
      case "downloads": return <Downloads />;
      case "releases": return <Releases subject={subject} />;
      case "tests": return <Tests me={meUser} />;
      case "issues": return <IssueCouncil me={meUser} subject={subject} />;
      case "leaderboard": return <Leaderboard me={meUser} />;
      case "chat": return <Chat me={meUser} />;
      case "settings": return <Settings me={meUser} onSaved={(t) => setMe({ ...meUser, ...t })} />;
      case "triage": return <Triage me={meUser} subject={subject} />;
      case "testers": return <Testers subject={subject} />;
      case "nda": return <NdaPage />;
      case "tos": return <TosPage />;
      default: return null;
    }
  }

  return (
    <div className="flex min-h-screen">
      {legal && !gateDone && <LegalGate legal={legal} displayName={meUser.displayName} onComplete={() => setGateDone(true)} />}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-[rgba(8,10,17,0.7)] p-4 backdrop-blur-xl md:flex">
        <div className="px-2 py-2"><Logo tag="Devnet" /></div>
        <nav className="mt-5 flex-1 space-y-5 overflow-y-auto"><NavList pillId="navpill-d" /></nav>
        <div className="mt-3"><UserFooter /></div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-[rgba(5,6,9,0.82)] px-4 py-3 backdrop-blur-xl md:hidden">
          <a href="/app"><BrandMark variant="horizontal" className="h-6 w-[4.4rem]" /></a>
          <div className="flex items-center gap-2"><Bell /><button onClick={() => setMobileOpen(true)} aria-label="Open menu" className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg></button></div>
        </div>
        <header className="sticky top-0 z-20 hidden items-center justify-between gap-3 border-b border-line bg-[rgba(5,6,9,0.82)] px-5 py-3 backdrop-blur-xl md:flex">
          <div className="flex items-center gap-2.5">{meUser.isStaff && <Badge tone="brand"><Icon.shield className="h-3 w-3" /> Admin</Badge>}<span className="eyebrow eyebrow-rule text-muted">{NAV.find((n) => n.key === cur)?.label}</span></div>
          <div className="flex items-center gap-3">{meUser.foundingRank && <Badge tone="brand">Founding Tester #{meUser.foundingRank}</Badge>}<Bell /></div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-7">
          <AnimatePresence mode="wait"><motion.div key={cur} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>{render()}</motion.div></AnimatePresence>
        </main>
      </div>
      <AnimatePresence>
        {mobileOpen && (
          <div className="md:hidden">
            <motion.div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
            <motion.aside className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[84vw] flex-col border-r border-line bg-[rgba(8,10,17,0.98)] p-4" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", stiffness: 380, damping: 38 }}>
              <div className="flame-bar -mx-4 -mt-4 mb-4 h-1" />
              <div className="flex items-center justify-between px-1"><Logo tag="Devnet" /><button onClick={() => setMobileOpen(false)} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted">✕</button></div>
              <nav className="mt-5 flex-1 space-y-5 overflow-y-auto"><NavList pillId="navpill-m" onPick={() => setMobileOpen(false)} /></nav>
              <UserFooter />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
