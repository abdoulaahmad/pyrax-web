// SPDX-License-Identifier: LicenseRef-Proprietary
import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo, Icon, Badge, BrandMark } from "./ui";
import { can, type Permission, PRESETS } from "../lib/permissions";
import { Dashboard, Faucet, Downloads, Team, NodeControl, ErrorReports, Profile, Signature, SignatureStudio, DevnetUsers, DevnetStatus, DevnetIssues, DevnetChat } from "./modules";

type ModuleKey = "dashboard" | "faucet" | "downloads" | "team" | "nodes" | "errors" | "profile" | "signature" | "signature_studio" | "devnet_users" | "devnet_status" | "devnet_issues" | "devnet_chat";
interface Me { id: string; email: string; displayName: string; position: string; phone: string | null; bookingUrl: string | null; socials: Record<string, string>; permissions: Permission[]; isSuperuser: boolean; status: string; }

const NAV: { key: ModuleKey; label: string; perm: Permission | null; icon: keyof typeof Icon; group: string }[] = [
  { key: "dashboard", label: "Dashboard", perm: "dashboard.view", icon: "grid", group: "Workspace" },
  { key: "faucet", label: "Faucet", perm: "faucet.view", icon: "droplet", group: "Workspace" },
  { key: "downloads", label: "Downloads", perm: "downloads.view", icon: "download", group: "Workspace" },
  { key: "team", label: "Team", perm: "users.view", icon: "users", group: "Admin" },
  { key: "nodes", label: "Node Control", perm: "node_control.view", icon: "power", group: "Admin" },
  { key: "errors", label: "Error Reports", perm: "error_reports.view", icon: "alert", group: "Admin" },
  { key: "signature_studio", label: "Signature Studio", perm: "signature.manage", icon: "edit", group: "Admin" },
  { key: "devnet_users", label: "Devnet Users", perm: "devnet.manage", icon: "users", group: "Devnet" },
  { key: "devnet_issues", label: "Issue Council", perm: "devnet.issues", icon: "alert", group: "Devnet" },
  { key: "devnet_status", label: "Devnet Status", perm: "devnet.manage", icon: "activity", group: "Devnet" },
  { key: "devnet_chat", label: "Devnet Chat", perm: "devnet.chat", icon: "chat", group: "Devnet" },
  { key: "signature", label: "My Signature", perm: null, icon: "mail", group: "Account" },
  { key: "profile", label: "My Profile", perm: null, icon: "user", group: "Account" },
];

export default function Portal() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewId, setPreviewId] = useState<string>("__self");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [active, setActive] = useState<ModuleKey>("dashboard");

  useEffect(() => {
    fetch("/api/me", { headers: { accept: "application/json" } })
      .then((r) => r.json())
      .then((d) => { if (!d.ok || !d.user) { window.location.href = "/"; return; } setMe(d.user); setLoading(false); })
      .catch(() => { window.location.href = "/"; });
  }, []);

  const subject = useMemo(() => {
    if (!me) return { isSuperuser: false, permissions: [] as Permission[] };
    if (previewId.startsWith("preset:")) return { isSuperuser: false, permissions: PRESETS[previewId.slice(7)].permissions };
    return { isSuperuser: me.isSuperuser, permissions: me.permissions };
  }, [previewId, me]);

  if (loading || !me) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="flex items-center gap-3 text-sm text-muted"><span className="h-4 w-4 animate-spin-slow rounded-full border-2 border-line border-t-[color:var(--color-brand)]" /> Loading your workspace…</div>
      </div>
    );
  }

  const meUser = me;
  const visible = NAV.filter((n) => n.perm === null || can(subject, n.perm));
  const cur = visible.find((n) => n.key === active) ? active : (visible[0]?.key ?? "profile");
  const groups = Array.from(new Set(visible.map((n) => n.group)));
  const initials = (meUser.displayName || meUser.email).split(/[\s@.]/).filter(Boolean).map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  function NavList({ pillId, onPick }: { pillId: string; onPick?: () => void }) {
    return (
      <>
        {groups.map((g) => (
          <div key={g}>
            <div className="px-3 pb-1 text-[0.66rem] font-semibold uppercase tracking-wider text-faint">{g}</div>
            {visible.filter((n) => n.group === g).map((n, i) => {
              const I = Icon[n.icon]; const on = cur === n.key;
              return (
                <motion.button key={n.key} onClick={() => { setActive(n.key); onPick?.(); }}
                  initial={onPick ? { opacity: 0, x: -16 } : false} animate={{ opacity: 1, x: 0 }} transition={{ delay: onPick ? 0.04 * i : 0 }}
                  className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${on ? "text-ink" : "text-muted hover:text-ink"}`}>
                  {on && <motion.span layoutId={pillId} className="absolute inset-0 rounded-lg border border-[color:rgba(245,134,34,0.35)] bg-[rgba(245,134,34,0.08)]" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                  <I className="relative z-10 h-[18px] w-[18px]" /><span className="relative z-10 font-medium">{n.label}</span>
                </motion.button>
              );
            })}
          </div>
        ))}
      </>
    );
  }
  const PreviewSwitcher = ({ className = "" }: { className?: string }) => meUser.isSuperuser ? (
    <label className={`flex items-center gap-2 text-xs text-faint ${className}`}>
      <span className="hidden sm:inline">Preview as</span>
      <select value={previewId} onChange={(e) => setPreviewId(e.target.value)} className="input w-auto py-1 text-xs">
        <option value="__self">Myself (superuser)</option>
        <optgroup label="Role presets">{Object.entries(PRESETS).map(([k, v]) => <option key={k} value={`preset:${k}`}>{v.label}</option>)}</optgroup>
      </select>
    </label>
  ) : null;
  async function signOut() { await fetch("/api/auth/logout", { method: "POST" }).catch(() => {}); window.location.href = "/"; }
  const UserFooter = () => (
    <div className="rounded-xl border border-line bg-[rgba(5,6,9,0.5)] p-3">
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-full flame-bar text-sm font-bold text-[#1a0f06]">{initials}</div>
        <div className="min-w-0"><div className="truncate text-sm font-semibold">{meUser.displayName || meUser.email}</div><div className="truncate text-xs text-faint">{meUser.position || meUser.email}</div></div>
      </div>
      <button onClick={signOut} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-line py-1.5 text-xs text-muted hover:text-ink"><Icon.logout className="h-3.5 w-3.5" /> Sign out</button>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-[rgba(8,10,17,0.7)] p-4 backdrop-blur md:flex">
        <div className="px-2 py-2"><Logo /></div>
        <nav className="mt-5 flex-1 space-y-5 overflow-y-auto"><NavList pillId="navpill-d" /></nav>
        <div className="mt-3"><UserFooter /></div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-[rgba(5,6,9,0.82)] px-4 py-3 backdrop-blur md:hidden">
          <a href="/app"><BrandMark variant="horizontal" className="h-6 w-[4.4rem]" /></a>
          <button onClick={() => setMobileOpen(true)} aria-label="Open menu" className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
        </div>
        <header className="sticky top-0 z-20 hidden items-center justify-between gap-3 border-b border-line bg-[rgba(5,6,9,0.7)] px-5 py-3 backdrop-blur md:flex">
          <div className="flex items-center gap-2 text-sm text-muted">
            {meUser.isSuperuser && <Badge tone="brand"><Icon.shield className="h-3 w-3" /> Superuser</Badge>}
            <span>{NAV.find((n) => n.key === cur)?.label}</span>
          </div>
          <PreviewSwitcher />
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-7">
          <AnimatePresence mode="wait">
            <motion.div key={cur} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              {cur === "dashboard" && <Dashboard subject={subject} onNavigate={(k) => setActive(k as ModuleKey)} />}
              {cur === "faucet" && <Faucet subject={subject} />}
              {cur === "downloads" && <Downloads subject={subject} />}
              {cur === "team" && <Team subject={subject} />}
              {cur === "nodes" && <NodeControl subject={subject} />}
              {cur === "errors" && <ErrorReports />}
              {cur === "signature_studio" && <SignatureStudio subject={subject} />}
              {cur === "devnet_users" && <DevnetUsers subject={subject} />}
              {cur === "devnet_issues" && <DevnetIssues subject={subject} />}
              {cur === "devnet_status" && <DevnetStatus subject={subject} />}
              {cur === "devnet_chat" && <DevnetChat subject={subject} />}
              {cur === "signature" && <Signature onEditProfile={() => setActive("profile")} />}
              {cur === "profile" && <Profile member={meUser as any} onSaved={(u) => setMe({ ...meUser, ...u })} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <div className="md:hidden">
            <motion.div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
            <motion.aside className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[84vw] flex-col border-r border-line bg-[rgba(8,10,17,0.98)] p-4"
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", stiffness: 380, damping: 38 }}>
              <div className="flame-bar -mx-4 -mt-4 mb-4 h-1" />
              <div className="flex items-center justify-between px-1"><Logo /><button onClick={() => setMobileOpen(false)} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted">✕</button></div>
              <nav className="mt-5 flex-1 space-y-5 overflow-y-auto"><NavList pillId="navpill-m" onPick={() => setMobileOpen(false)} /></nav>
              <div className="space-y-3"><PreviewSwitcher className="justify-between rounded-lg border border-line px-3 py-2" /><UserFooter /></div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
