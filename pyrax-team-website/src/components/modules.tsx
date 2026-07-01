// SPDX-License-Identifier: LicenseRef-Proprietary
import React, { useEffect, useMemo, useState } from "react";
import { Card, Button, StatTile, Badge, PageHeader, Icon } from "./ui";
import { can, canGrant, type AccessSubject, type Permission, PERMISSIONS, permissionGroups, PRESETS, isSuperuserOnly } from "../lib/permissions";
import { SOCIAL_FIELDS, validateProfile, formatPhone, validatePhone, COMPANY_EMAIL_DOMAIN, type MemberProfile } from "../lib/profile";
import { type Member } from "../lib/mock";
import { COMMUNITY_KEYS, COMMUNITY_LABELS, type SignatureSettings } from "../lib/signature-settings";
import ChatRoom from "./ChatRoom";

function Locked({ what }: { what: string }) {
  return (
    <Card className="p-10 text-center">
      <Icon.shield className="mx-auto h-8 w-8 text-faint" />
      <p className="mt-3 font-semibold">No access to {what}</p>
      <p className="mt-1 text-sm text-muted">Ask an admin to grant you this permission.</p>
    </Card>
  );
}

/** Honest placeholder for modules whose backend (live network RPC, release pipeline, node fleet,
 *  error pipeline) isn't connected yet — shown instead of fabricated data. */
function ComingSoon({ title, detail }: { title: string; detail: string }) {
  return (
    <Card className="p-10 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-line bg-[rgba(245,134,34,0.06)]">
        <svg viewBox="0 0 24 24" className="h-6 w-6 text-faint" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
      </div>
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">{detail}</p>
      <div className="mt-3"><Badge tone="warning">Connecting soon</Badge></div>
    </Card>
  );
}

/* ============================================================== Dashboard */
export function Dashboard({ subject, onNavigate }: { subject: AccessSubject; onNavigate: (k: string) => void }) {
  // Team count is real (from the DB). The other metrics await their backends — shown as "—".
  const [team, setTeam] = useState<{ active: number; invited: number } | null>(null);
  useEffect(() => {
    if (!can(subject, "users.view")) return;
    fetch("/api/users", { headers: { accept: "application/json" } })
      .then((r) => r.json()).then((d) => {
        if (!d?.ok) return;
        const u: Member[] = d.users || [];
        setTeam({ active: u.filter((m) => m.status === "active").length, invited: u.filter((m) => m.status === "invited").length });
      }).catch(() => {});
  }, [subject]);
  const tiles = [
    can(subject, "users.view") && <StatTile key="t" label="Team members" value={team ? team.active : "—"} sub={team ? `${team.invited} invited` : "loading…"} icon={<Icon.users className="h-5 w-5 text-gold" />} delay={0} />,
    can(subject, "faucet.view") && <StatTile key="n" label="Live networks" value="—" sub="connecting soon" accent="water" icon={<Icon.activity className="h-5 w-5 text-bolt-bright" />} delay={0.05} />,
    can(subject, "downloads.view") && <StatTile key="d" label="Products" value="—" sub="connecting soon" icon={<Icon.download className="h-5 w-5 text-gold" />} delay={0.1} />,
    can(subject, "node_control.view") && <StatTile key="o" label="Nodes online" value="—" sub="connecting soon" accent="positive" icon={<Icon.power className="h-5 w-5 text-positive" />} delay={0.15} />,
  ].filter(Boolean);
  return (
    <>
      <PageHeader title="Welcome back" subtitle="Your PYRAX team workspace." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{tiles}</div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h3 className="text-base font-bold">Quick actions</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {can(subject, "faucet.drip") && <QuickAction icon="droplet" label="Dispense test PYRX" desc="Fund an address from the faucet" onClick={() => onNavigate("faucet")} />}
            {can(subject, "downloads.view") && <QuickAction icon="download" label="Get the apps" desc="Ember, Inferno + the CLI" onClick={() => onNavigate("downloads")} />}
            {can(subject, "users.invite") && <QuickAction icon="users" label="Invite a teammate" desc="Whitelist + set their access" onClick={() => onNavigate("team")} />}
            {can(subject, "node_control.view") && <QuickAction icon="power" label="Monitor nodes" desc="Versions + health" onClick={() => onNavigate("nodes")} />}
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="text-base font-bold">Your access</h3>
          <p className="mt-1 text-xs text-muted">{subject.isSuperuser ? "Full access (superuser)." : `${subject.permissions.length} of ${Object.keys(PERMISSIONS).length} permissions.`}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {subject.isSuperuser ? <Badge tone="brand">All permissions</Badge> :
              subject.permissions.slice(0, 8).map((p) => <Badge key={p}>{PERMISSIONS[p].label}</Badge>)}
            {!subject.isSuperuser && subject.permissions.length > 8 && <Badge tone="muted">+{subject.permissions.length - 8} more</Badge>}
          </div>
        </Card>
      </div>
    </>
  );
}
function QuickAction({ icon, label, desc, onClick }: { icon: keyof typeof Icon; label: string; desc: string; onClick: () => void }) {
  const I = Icon[icon];
  return (
    <button onClick={onClick} className="card-hover flex items-center gap-3 rounded-xl border border-line p-3 text-left">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[color:rgba(245,134,34,0.3)] bg-[rgba(245,134,34,0.07)]"><I className="h-5 w-5 text-gold" /></div>
      <div><div className="text-sm font-semibold">{label}</div><div className="text-xs text-faint">{desc}</div></div>
    </button>
  );
}

/* ============================================================== Faucet */
export function Faucet({ subject }: { subject: AccessSubject }) {
  if (!can(subject, "faucet.view")) return <Locked what="the faucet" />;
  return (
    <>
      <PageHeader title="Faucet" subtitle="Dispense test PYRX to a wallet on a development network." />
      <ComingSoon title="The faucet isn't connected yet" detail="Once the team portal is wired to the live PYRAX network RPC, role-holders will dispense rate-limited test PYRX to an address here." />
    </>
  );
}

/* ============================================================== Downloads */
export function Downloads({ subject }: { subject: AccessSubject }) {
  if (!can(subject, "downloads.view")) return <Locked what="downloads" />;
  return (
    <>
      <PageHeader title="Downloads" subtitle="Latest signed builds. The download role grants everything — restricted products need their own access." />
      <ComingSoon title="No builds connected yet" detail="Once the release pipeline is connected, the latest signed Ember, Inferno + CLI builds will be listed here — with individually-restricted products gated to their own access." />
    </>
  );
}

/* ============================================================== Team (granular RBAC) */
export function Team({ subject }: { subject: AccessSubject }) {
  if (!can(subject, "users.view")) return <Locked what="team management" />;
  const [members, setMembers] = useState<Member[] | null>(null);
  const [editing, setEditing] = useState<Member | null>(null);
  const [inviting, setInviting] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    try {
      const res = await fetch("/api/users", { headers: { accept: "application/json" } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) { setErr(data.error || "Couldn't load the team."); setMembers([]); return; }
      setMembers(data.users as Member[]);
    } catch { setErr("Network error loading the team."); setMembers([]); }
  }
  useEffect(() => { load(); }, []);
  const upsert = (u: Member) => setMembers((cur) => {
    const list = cur ? [...cur] : [];
    const i = list.findIndex((m) => m.id === u.id);
    if (i >= 0) { list[i] = u; return list; }
    return [...list, u];
  });
  const dropLocal = (id: string) => setMembers((cur) => (cur || []).filter((m) => m.id !== id));

  return (
    <>
      <PageHeader title="Team" subtitle="Members and their granular access."
        action={can(subject, "users.invite") && <Button variant="primary" onClick={() => setInviting(true)}><Icon.plus className="h-4 w-4" /> Invite member</Button>} />
      {err && <p className="mb-3 text-sm text-[color:var(--color-negative)]">{err}</p>}
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-faint">
            <tr className="border-b border-line"><th className="p-3">Member</th><th className="p-3">Position</th><th className="p-3 hidden sm:table-cell">Access</th><th className="p-3">Status</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {members === null ? (
              <tr><td colSpan={5} className="p-6 text-center text-sm text-muted"><span className="mr-2 inline-block h-4 w-4 animate-spin-slow rounded-full border-2 border-line border-t-[color:var(--color-brand)] align-middle" />Loading team…</td></tr>
            ) : members.length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center text-sm text-muted">No members yet — invite your first teammate.</td></tr>
            ) : members.map((m) => (
              <tr key={m.id} className="border-b border-line-soft last:border-0">
                <td className="p-3"><div className="font-semibold">{m.displayName || "—"}</div><div className="text-xs text-faint">{m.email}</div></td>
                <td className="p-3 text-muted">{m.position || "—"}</td>
                <td className="p-3 hidden sm:table-cell">{m.isSuperuser ? <Badge tone="brand">Superuser</Badge> : <span className="text-xs text-muted">{m.permissions.length} permissions</span>}</td>
                <td className="p-3">{m.status === "active" ? <Badge tone="positive">Active</Badge> : <Badge tone="warning">Invited</Badge>}</td>
                <td className="p-3 text-right">{can(subject, "users.assign_permissions") && !m.isSuperuser && <Button onClick={() => setEditing(m)}>Manage</Button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {editing && <PermissionDrawer grantor={subject} member={editing} onClose={() => setEditing(null)} onSaved={(u) => { upsert(u); setEditing(null); }} onRemoved={(id) => { dropLocal(id); setEditing(null); }} />}
      {inviting && <InviteDrawer grantor={subject} onClose={() => setInviting(false)} onInvited={(u) => { upsert(u); setInviting(false); }} />}
    </>
  );
}

/* The granular permission matrix — every permission a checkbox, grouped by module, with presets. */
function PermissionDrawer({ grantor, member, onClose, onSaved, onRemoved }: { grantor: AccessSubject; member: Member; onClose: () => void; onSaved: (u: Member) => void; onRemoved: (id: string) => void }) {
  const [perms, setPerms] = useState<Set<Permission>>(new Set(member.permissions));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const groups = permissionGroups();
  function toggle(p: Permission) { const n = new Set(perms); n.has(p) ? n.delete(p) : n.add(p); setPerms(n); }
  function addRole(k: string) { setPerms((prev) => new Set([...prev, ...PRESETS[k].permissions])); }
  function removeRole(k: string) { setPerms((prev) => { const n = new Set(prev); PRESETS[k].permissions.forEach((p) => n.delete(p)); return n; }); }
  const hasWholeRole = (k: string) => PRESETS[k].permissions.every((p) => perms.has(p));

  async function save() {
    setBusy(true); setErr("");
    try {
      const res = await fetch(`/api/users/${member.id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ permissions: [...perms] }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) { setErr(data.error || "Couldn't save permissions."); setBusy(false); return; }
      onSaved(data.user as Member);
    } catch { setErr("Network error — please try again."); setBusy(false); }
  }
  async function remove() {
    if (!window.confirm(`Remove ${member.displayName || member.email} from the portal? This can't be undone.`)) return;
    setBusy(true); setErr("");
    try {
      const res = await fetch(`/api/users/${member.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) { setErr(data.error || "Couldn't remove member."); setBusy(false); return; }
      onRemoved(member.id);
    } catch { setErr("Network error — please try again."); setBusy(false); }
  }
  const removeBtn = can(grantor, "users.remove") ? <Button variant="danger" onClick={remove} disabled={busy}>Remove member</Button> : undefined;

  return (
    <Drawer title={`Manage access — ${member.displayName || member.email}`} onClose={onClose} onSave={save} saveLabel="Save changes" busy={busy} extra={removeBtn}>
      <div className="mb-4">
        <div className="label">Roles <span className="font-normal text-faint">· stack as many as you like</span></div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(PRESETS).map(([k, v]) => {
            const on = hasWholeRole(k);
            return <button key={k} onClick={() => on ? removeRole(k) : addRole(k)} className={`chip card-hover ${on ? "chip-brand" : ""}`} title={v.desc}>{on ? "✓ " : "+ "}{v.label}</button>;
          })}
          <button onClick={() => setPerms(new Set())} className="chip card-hover text-faint">Clear all</button>
        </div>
        <p className="mt-2 text-xs text-faint">Add any combination of roles, then fine-tune individual permissions below — every permission is independent.</p>
      </div>
      {Object.entries(groups).map(([g, list]) => (
        <div key={g} className="mb-4">
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-faint">{g}</div>
          <div className="space-y-1.5">
            {list.map((p) => {
              const allowed = canGrant(grantor, p);
              return (
                <label key={p} className={`flex items-start gap-3 rounded-lg border border-line p-2.5 ${allowed ? "card-hover cursor-pointer" : "opacity-50"}`}>
                  <input type="checkbox" disabled={!allowed} checked={perms.has(p)} onChange={() => allowed && toggle(p)} className="mt-0.5 h-4 w-4 accent-[color:var(--color-brand)]" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-medium">{PERMISSIONS[p].label}{isSuperuserOnly(p) && <Badge tone="danger">superuser only</Badge>}</div>
                    <div className="text-xs text-faint">{PERMISSIONS[p].desc}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      ))}
      {err && <p className="mb-2 text-sm text-[color:var(--color-negative)]">{err}</p>}
      <div className="text-xs text-faint">Selected: <span className="text-muted">{perms.size}</span> permissions. Changes apply to <span className="text-muted">{member.displayName || member.email}</span> on save.</div>
    </Drawer>
  );
}

/* The onboarding form — Display Name, Email (@pyraxchain.com), Position (required) + optionals. */
function InviteDrawer({ grantor, onClose, onInvited }: { grantor: AccessSubject; onClose: () => void; onInvited: (u: Member) => void }) {
  const [p, setP] = useState<Partial<MemberProfile>>({ socials: {} });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [roles, setRoles] = useState<Set<string>>(new Set(["member"]));
  const [busy, setBusy] = useState(false);
  function set(k: keyof MemberProfile, v: string) { setP({ ...p, [k]: v }); }
  function toggleRole(k: string) { setRoles((prev) => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; }); }
  const grantedCount = useMemo(() => { const s = new Set<Permission>(); roles.forEach((k) => PRESETS[k]?.permissions.forEach((pp) => s.add(pp))); return s.size; }, [roles]);
  async function submit() {
    const r = validateProfile(p, { enforceDomain: true });
    setErrs(r.errors);
    if (!r.ok) return;
    const perms = new Set<Permission>(); roles.forEach((k) => PRESETS[k]?.permissions.forEach((pp) => perms.add(pp)));
    setBusy(true);
    try {
      const res = await fetch("/api/users", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ displayName: p.displayName, position: p.position, email: p.email, permissions: [...perms] }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) { setErrs(data.errors || { email: data.error || "Couldn't send the invitation." }); setBusy(false); return; }
      onInvited(data.user as Member);
    } catch { setErrs({ email: "Network error — please try again." }); setBusy(false); }
  }
  return (
    <Drawer title="Invite a team member" onClose={onClose} onSave={submit} saveLabel="Send invitation" busy={busy}>
      <div className="space-y-3">
        <p className="rounded-lg border border-line bg-[rgba(5,6,9,0.5)] p-3 text-xs text-muted">You set the <span className="text-ink">required</span> details. The member adds their own optional info (phone + social links) when they onboard.</p>
        <Field label="Display name" req error={errs.displayName}><input className="input" value={p.displayName || ""} onChange={(e) => set("displayName", e.target.value)} placeholder="Jane Doe" /></Field>
        <Field label="Position / title" req error={errs.position}><input className="input" value={p.position || ""} onChange={(e) => set("position", e.target.value)} placeholder="Protocol Engineer" /></Field>
        <Field label={`Email (@${COMPANY_EMAIL_DOMAIN} only)`} req error={errs.email}><input className="input" value={p.email || ""} onChange={(e) => set("email", e.target.value)} placeholder={`jane@${COMPANY_EMAIL_DOMAIN}`} /></Field>
        <div className="label pt-1">Initial roles <span className="font-normal text-faint">· add any, they stack</span></div>
        <div className="flex flex-wrap gap-2">{Object.entries(PRESETS).map(([k, v]) => <button key={k} type="button" onClick={() => toggleRole(k)} className={`chip card-hover ${roles.has(k) ? "chip-brand" : ""}`} title={v.desc}>{roles.has(k) ? "✓ " : "+ "}{v.label}</button>)}</div>
        <p className="text-xs text-faint">{grantedCount} permissions granted · fully adjustable after they join.</p>
        <p className="pt-1 text-xs text-faint">They'll get a branded invitation email and verify with a one-time code on first sign-in, then complete their optional profile.</p>
      </div>
    </Drawer>
  );
}

/* ============================================================== Node Control */
export function NodeControl({ subject }: { subject: AccessSubject }) {
  if (!can(subject, "node_control.view")) return <Locked what="node control" />;
  return (
    <>
      <PageHeader title="Node Control" subtitle="Monitor node versions; remotely retire an out-of-date node (last resort)." />
      <ComingSoon title="Node fleet not connected yet" detail="Live node versions, peer counts + health — and the superuser-only remote kill-switch — appear here once the portal is wired to the node fleet." />
    </>
  );
}

/* ============================================================== Error Reports */
export function ErrorReports() {
  return (
    <>
      <PageHeader title="Error Reports" subtitle="Inbound crash + error reports from nodes and apps." />
      <ComingSoon title="No reports connected yet" detail="Inbound crash + error reports from nodes and apps will stream in here once the reporting pipeline is connected." />
    </>
  );
}

/* ============================================================== Profile */
export function Profile({ member, onSaved }: { member: Member; onSaved?: (u: any) => void }) {
  const [p, setP] = useState<MemberProfile>({ ...member });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [chatUsername, setChatUsername] = useState((member as any).chatUsername || "");
  function set(k: keyof MemberProfile, v: string) { setP({ ...p, [k]: v }); setSaved(false); }
  function setSocial(k: string, v: string) { setP({ ...p, socials: { ...p.socials, [k]: v } }); setSaved(false); }
  async function save() {
    const r = validateProfile(p, { enforceDomain: true });
    setErrs(r.errors);
    if (!r.ok) return;
    setBusy(true); setSaved(false);
    try {
      const res = await fetch("/api/me", { method: "PUT", headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: p.displayName, position: p.position, phone: p.phone || "", bookingUrl: p.bookingUrl || "", chatUsername, socials: p.socials || {} }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) { setErrs(data.errors || { _: data.error || "Couldn't save — please try again." }); setBusy(false); return; }
      setP({ ...p, ...data.user }); setSaved(true); onSaved?.(data.user);
    } catch { setErrs({ _: "Network error — please try again." }); }
    setBusy(false);
  }
  return (
    <>
      <PageHeader title="My Profile" subtitle="Your details. Email is fixed by your invitation." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Display name" req error={errs.displayName}><input className="input" value={p.displayName} onChange={(e) => set("displayName", e.target.value)} /></Field>
            <Field label="Position / title" req error={errs.position}><input className="input" value={p.position} onChange={(e) => set("position", e.target.value)} /></Field>
            <Field label="Email"><input className="input opacity-60" value={p.email} readOnly /></Field>
            <PhoneInput value={p.phone || ""} onChange={(v) => set("phone", v)} error={errs.phone} />
          </div>
          <div className="mt-5">
            <Field label="Microsoft Bookings link" error={errs.bookingUrl}>
              <input className="input" inputMode="url" value={p.bookingUrl || ""} onChange={(e) => set("bookingUrl", e.target.value)} placeholder="https://outlook.office.com/bookwithme/…" />
            </Field>
            <p className="mt-2 text-xs leading-relaxed text-faint">Optional — when set, a “Book a meeting with me” button is added to your email signature.</p>
          </div>
          <div className="mt-5">
            <Field label="Devnet chat username">
              <div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint">@</span><input className="input pl-7" value={chatUsername} onChange={(e) => { setChatUsername(e.target.value); setSaved(false); }} placeholder="yourname" /></div>
            </Field>
            <p className="mt-2 text-xs leading-relaxed text-faint">Your name in the Devnet tester community chat (you appear as an Admin). Required to post there.</p>
          </div>
          <div className="label mt-6">Social links <span className="font-normal text-faint">(optional · personal, not company)</span></div>
          <div className="grid gap-2 sm:grid-cols-2">
            {SOCIAL_FIELDS.map((f) => <Field key={f.key} label={f.label} error={errs[`social.${f.key}`]}><input className="input" value={p.socials?.[f.key] || ""} onChange={(e) => setSocial(f.key, e.target.value)} placeholder={f.placeholder} /></Field>)}
          </div>
          {errs._ && <p className="mt-3 text-sm text-[color:var(--color-negative)]">{errs._}</p>}
          <div className="mt-5 flex items-center gap-3"><Button variant="primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>{saved && <span className="text-sm text-[color:var(--color-positive)]">Saved ✓</span>}</div>
        </Card>
        <Card className="p-5 h-fit">
          <div className="grid h-16 w-16 place-items-center rounded-2xl flame-bar text-2xl font-extrabold text-[#1a0f06]">{member.displayName.split(" ").map((s) => s[0]).join("").slice(0, 2)}</div>
          <div className="mt-3 text-lg font-bold">{member.displayName}</div>
          <div className="text-sm text-muted">{member.position}</div>
          <div className="mt-3 flex flex-wrap gap-1.5">{member.isSuperuser ? <Badge tone="brand">Superuser</Badge> : <Badge>{member.permissions.length} permissions</Badge>}</div>
        </Card>
      </div>
    </>
  );
}

/* ---- small shared bits ---- */
/* ============================================================== My Signature */
export function Signature({ onEditProfile }: { onEditProfile?: () => void }) {
  const [doc, setDoc] = useState("");     // full HTML doc → preview iframe
  const [inner, setInner] = useState(""); // <table> block → clipboard
  const [theme, setTheme] = useState<"light" | "dark">("light"); // PREVIEW backdrop only
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");

  // Clipboard copy uses the real adaptive signature — fetched once.
  useEffect(() => {
    let alive = true;
    fetch("/api/signature?format=inner").then((r) => r.text()).then((i) => { if (alive) setInner(i); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // Preview doc re-fetches per theme so it renders deterministically (not based on the viewer's OS).
  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/signature?format=doc&preview=${theme}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.text(); })
      .then((d) => { if (alive) { setDoc(d); setLoading(false); } })
      .catch(() => { if (alive) { setErr("Couldn't load your signature — please refresh."); setLoading(false); } });
    return () => { alive = false; };
  }, [theme]);

  async function copy() {
    setErr("");
    try {
      if (navigator.clipboard && "write" in navigator.clipboard && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([new ClipboardItem({
          "text/html": new Blob([inner], { type: "text/html" }),
          "text/plain": new Blob([inner], { type: "text/plain" }),
        })]);
      } else {
        await navigator.clipboard.writeText(inner);
      }
      setCopied(true); setTimeout(() => setCopied(false), 2600);
    } catch { setErr("Copy was blocked by your browser — use “Download .htm” instead."); }
  }

  const Step = ({ n, children }: { n: number; children: React.ReactNode }) => (
    <li className="flex gap-3"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[rgba(245,134,34,0.14)] text-[11px] font-bold text-[color:var(--color-brand)]">{n}</span><span className="text-sm text-muted">{children}</span></li>
  );

  return (
    <>
      <PageHeader title="My Signature" subtitle="Your personalized PYRAX email signature — built automatically from your profile." />
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Preview */}
        <Card className="overflow-hidden p-0 lg:col-span-3">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-faint">Live preview</span>
            <div className="flex items-center gap-0.5 rounded-lg border border-line p-0.5 text-xs">
              {(["light", "dark"] as const).map((t) => (
                <button key={t} onClick={() => setTheme(t)} className={`rounded-md px-2.5 py-1 capitalize transition ${theme === t ? "bg-[rgba(245,134,34,0.16)] text-ink" : "text-faint hover:text-muted"}`}>{t}</button>
              ))}
            </div>
          </div>
          {/* The signature itself is transparent; this canvas just mimics a light/dark email background. */}
          <div className={theme === "light" ? "bg-[#eef1f7]" : "bg-[#0b0d13]"}>
            {loading ? (
              <div className="grid h-[540px] place-items-center text-sm text-muted"><span className="h-4 w-4 animate-spin-slow rounded-full border-2 border-line border-t-[color:var(--color-brand)]" /></div>
            ) : (
              <iframe title="Email signature preview" srcDoc={doc} className="w-full" style={{ height: 540, background: "transparent", border: 0 }} />
            )}
          </div>
          <div className="border-t border-line px-4 py-2 text-xs text-faint">Transparent background · adapts to light &amp; dark email apps automatically.</div>
        </Card>

        {/* Actions + install */}
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-5">
            <div className="text-sm font-semibold">Install your signature</div>
            <div className="mt-3 flex flex-col gap-2">
              <Button variant="primary" className="justify-center" onClick={copy} disabled={loading}>{copied ? "Copied ✓" : "Copy signature"}</Button>
              <a className="btn btn-ghost justify-center" href="/api/signature?download=1">Download .htm</a>
            </div>
            {err && <p className="mt-3 text-sm text-[color:var(--color-negative)]">{err}</p>}
            <p className="mt-3 text-xs leading-relaxed text-faint">Tip: “Copy signature” pastes the full styled layout straight into your email app’s signature box. Use the .htm file for the Outlook desktop “insert from file” method.</p>
          </Card>

          <Card className="p-5">
            <div className="text-sm font-semibold">How to add it</div>
            <ol className="mt-3 space-y-2.5">
              <Step n={1}>Click <span className="text-ink">Copy signature</span> above.</Step>
              <Step n={2}>Open your email signature settings — <span className="text-ink">Outlook</span> (File ▸ Options ▸ Mail ▸ Signatures), <span className="text-ink">Outlook on the web / Gmail</span> (Settings ▸ Signature), or <span className="text-ink">Apple Mail</span> (Settings ▸ Signatures).</Step>
              <Step n={3}>Paste into the signature box and save.</Step>
              <Step n={4}>When the company design changes, you’ll be asked to re-copy it here.</Step>
            </ol>
          </Card>

          <Card className="p-5">
            <div className="text-sm font-semibold">Make it yours</div>
            <p className="mt-2 text-sm text-muted">Your name, title, email, phone, social links, and Microsoft Bookings button all come from your profile. Empty fields are hidden automatically.</p>
            <Button variant="ghost" className="mt-3" onClick={onEditProfile}><Icon.user className="h-4 w-4" /> Edit my profile</Button>
          </Card>
        </div>
      </div>
    </>
  );
}

/* ============================================================== Signature Studio (manager) */
export function SignatureStudio({ subject }: { subject: AccessSubject }) {
  if (!can(subject, "signature.manage")) return <Locked what="the Signature Studio" />;
  const [s, setS] = useState<SignatureSettings | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/signature-settings", { headers: { accept: "application/json" } })
      .then((r) => r.json()).then((d) => { if (d?.ok) setS(d.settings); else setErr(d.error || "Couldn't load the design."); })
      .catch(() => setErr("Network error loading the design."));
  }, []);

  // Debounced live preview of the (unsaved) draft using the manager's own profile.
  useEffect(() => {
    if (!s) return;
    const id = window.setTimeout(() => {
      fetch("/api/signature-settings/preview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ settings: s, theme }) })
        .then((r) => r.text()).then(setPreview).catch(() => {});
    }, 300);
    return () => window.clearTimeout(id);
  }, [s, theme]);

  function patch(p: Partial<SignatureSettings>) { setS((cur) => (cur ? { ...cur, ...p } : cur)); setSaved(false); }
  async function save() {
    if (!s) return; setBusy(true); setErr(""); setSaved(false);
    try {
      const res = await fetch("/api/signature-settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ settings: s }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) { setErr(d.error || "Couldn't publish the design."); setBusy(false); return; }
      setS(d.settings); setSaved(true);
    } catch { setErr("Network error — please try again."); }
    setBusy(false);
  }

  if (!s) return <Card className="p-10 text-center text-sm text-muted"><span className="mr-2 inline-block h-4 w-4 animate-spin-slow rounded-full border-2 border-line border-t-[color:var(--color-brand)] align-middle" />{err || "Loading the company design…"}</Card>;

  return (
    <>
      <PageHeader title="Signature Studio" subtitle="The shared company email-signature design — every member's signature updates from here."
        action={<div className="flex items-center gap-3">{saved && <span className="text-sm text-[color:var(--color-positive)]">Published ✓</span>}<Button variant="primary" onClick={save} disabled={busy}>{busy ? "Publishing…" : "Save + publish"}</Button></div>} />
      {err && <p className="mb-3 text-sm text-[color:var(--color-negative)]">{err}</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* editor */}
        <div className="space-y-4">
          <Card className="p-5">
            <div className="text-sm font-semibold">Tagline</div>
            <textarea className="input mt-2" rows={2} value={s.tagline} onChange={(e) => patch({ tagline: e.target.value })} />
          </Card>

          <Card className="p-5">
            <div className="text-sm font-semibold">Spec tiles</div>
            <p className="mt-1 text-xs text-faint">The readout row. Blank a tile to hide it.</p>
            <div className="mt-3 space-y-2">
              {s.specTiles.map((t, i) => (
                <div key={i} className="grid grid-cols-2 gap-2">
                  <input className="input" value={t.label} placeholder="Label" onChange={(e) => { const a = [...s.specTiles]; a[i] = { ...a[i], label: e.target.value }; patch({ specTiles: a }); }} />
                  <input className="input" value={t.value} placeholder="Value" onChange={(e) => { const a = [...s.specTiles]; a[i] = { ...a[i], value: e.target.value }; patch({ specTiles: a }); }} />
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="text-sm font-semibold">Network links</div>
            <p className="mt-1 text-xs text-faint">First link is primary (bold). https only.</p>
            <div className="mt-3 space-y-2">
              {s.networkLinks.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <input className="input w-1/3" value={l.label} placeholder="Label" onChange={(e) => { const a = [...s.networkLinks]; a[i] = { ...a[i], label: e.target.value }; patch({ networkLinks: a }); }} />
                  <input className="input flex-1" value={l.href} placeholder="https://…" onChange={(e) => { const a = [...s.networkLinks]; a[i] = { ...a[i], href: e.target.value }; patch({ networkLinks: a }); }} />
                  <button type="button" className="chip card-hover text-faint" onClick={() => patch({ networkLinks: s.networkLinks.filter((_, j) => j !== i) })}>✕</button>
                </div>
              ))}
              {s.networkLinks.length < 6 && <button type="button" className="chip card-hover" onClick={() => patch({ networkLinks: [...s.networkLinks, { label: "", href: "" }] })}>+ Add link</button>}
            </div>
          </Card>

          <Card className="p-5">
            <div className="text-sm font-semibold">Community</div>
            <p className="mt-1 text-xs text-faint">Official PYRAX accounts. Leave blank to hide an icon. https only.</p>
            <div className="mt-3 space-y-2">
              {COMMUNITY_KEYS.map((k) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="w-20 shrink-0 text-xs text-muted">{COMMUNITY_LABELS[k]}</span>
                  <input className="input flex-1" value={s.community[k]} placeholder="https://…" onChange={(e) => patch({ community: { ...s.community, [k]: e.target.value } })} />
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 space-y-2">
            <div className="text-sm font-semibold">Office</div>
            <input className="input" value={s.office.label} placeholder="Address" onChange={(e) => patch({ office: { ...s.office, label: e.target.value } })} />
            <input className="input" value={s.office.mapHref} placeholder="https://maps.google.com/…" onChange={(e) => patch({ office: { ...s.office, mapHref: e.target.value } })} />
          </Card>

          <Card className="p-5 space-y-3">
            <div className="text-sm font-semibold">Disclaimer</div>
            {(["confidentiality", "noAdvice", "security"] as const).map((k) => (
              <div key={k}>
                <label className="label">{k === "noAdvice" ? "No financial advice" : k === "confidentiality" ? "Confidentiality" : "Security"}</label>
                <textarea className="input" rows={k === "security" ? 4 : 3} value={s.disclaimer[k]} onChange={(e) => patch({ disclaimer: { ...s.disclaimer, [k]: e.target.value } })} />
              </div>
            ))}
            <div>
              <label className="label">Copyright</label>
              <input className="input" value={s.copyright} onChange={(e) => patch({ copyright: e.target.value })} />
            </div>
          </Card>

          <p className="text-xs leading-relaxed text-faint">After publishing, ask the team to re-copy their signature from “My Signature” to pick up layout/text changes (image-only re-skins update automatically in clients that re-fetch).</p>
        </div>

        {/* live preview */}
        <div className="lg:sticky lg:top-20 h-fit">
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-faint">Live preview</span>
              <div className="flex items-center gap-0.5 rounded-lg border border-line p-0.5 text-xs">
                {(["light", "dark"] as const).map((t) => <button key={t} onClick={() => setTheme(t)} className={`rounded-md px-2.5 py-1 capitalize transition ${theme === t ? "bg-[rgba(245,134,34,0.16)] text-ink" : "text-faint hover:text-muted"}`}>{t}</button>)}
              </div>
            </div>
            <div className={theme === "light" ? "bg-[#eef1f7]" : "bg-[#0b0d13]"}>
              <iframe title="Signature design preview" srcDoc={preview} className="w-full" style={{ height: 560, background: "transparent", border: 0 }} />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

/* ============================================================== Devnet Management */
export function DevnetUsers({ subject }: { subject: AccessSubject }) {
  if (!can(subject, "devnet.manage")) return <Locked what="Devnet Management" />;
  const [list, setList] = useState<any[] | null>(null);
  const [email, setEmail] = useState(""); const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false); const [errs, setErrs] = useState<any>({}); const [sent, setSent] = useState("");
  async function load() { try { const d = await (await fetch("/api/devnet/testers")).json(); setList(d.ok ? d.testers : []); } catch { setList([]); } }
  useEffect(() => { load(); }, []);
  async function invite() {
    setBusy(true); setErrs({}); setSent("");
    try {
      const res = await fetch("/api/devnet/invite", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, telegramHandle: handle }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) { setErrs(d.errors || { _: d.error || "Couldn't invite." }); setBusy(false); return; }
      setSent(`Invite sent to ${email}.`); setEmail(""); setHandle(""); load();
    } catch { setErrs({ _: "Network error." }); }
    setBusy(false);
  }
  return (
    <>
      <PageHeader title="Devnet Users" subtitle="Whitelist closed-alpha testers — they get an email invite to devnet.pyraxchain.com." />
      <Card className="mb-4 p-5">
        <div className="text-sm font-semibold">Whitelist a tester</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Email" error={errs.email}><input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tester@example.com" /></Field>
          <Field label="Telegram @handle" error={errs.telegramHandle}><input className="input" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@theirhandle" /></Field>
        </div>
        <p className="mt-1 text-xs text-faint">Their Telegram handle becomes their chat username in the tester community.</p>
        {errs._ && <p className="mt-2 text-sm text-[color:var(--color-negative)]">{errs._}</p>}
        <div className="mt-4 flex items-center gap-3"><Button variant="primary" onClick={invite} disabled={busy}>{busy ? "Sending…" : "Send invite"}</Button>{sent && <span className="text-sm text-[color:var(--color-positive)]">{sent}</span>}</div>
      </Card>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-faint"><tr className="border-b border-line"><th className="p-3">Tester</th><th className="p-3">Status</th><th className="p-3 hidden sm:table-cell">Nodes</th><th className="p-3">PYRX</th></tr></thead>
          <tbody>
            {!list ? <tr><td colSpan={4} className="p-6 text-center text-muted">Loading…</td></tr> : list.length === 0 ? <tr><td colSpan={4} className="p-6 text-center text-muted">No testers yet — whitelist your first.</td></tr> :
              list.map((t, i) => (
                <tr key={i} className="border-b border-line-soft last:border-0">
                  <td className="p-3"><div className="font-semibold">{t.handle ? "@" + t.handle : t.email}</div><div className="text-xs text-faint">{t.email}</div></td>
                  <td className="p-3"><div className="flex flex-wrap gap-1">{t.status === "active" ? <Badge tone="positive">Active</Badge> : <Badge tone="warning">Invited</Badge>}{t.founding_rank && <Badge tone="brand">Founding #{t.founding_rank}</Badge>}</div></td>
                  <td className="p-3 hidden sm:table-cell text-muted">{t.nodes ?? 0}</td>
                  <td className="p-3 font-mono text-muted">{(t.pyrx ?? 0).toLocaleString("en-US")}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

export function DevnetStatus({ subject }: { subject: AccessSubject }) {
  if (!can(subject, "devnet.manage")) return <Locked what="Devnet Management" />;
  const [s, setS] = useState<any>(null); const [busy, setBusy] = useState(false); const [saved, setSaved] = useState(false);
  async function load() { try { const d = await (await fetch("/api/devnet/settings")).json(); if (d.ok) setS(d.settings); } catch {} }
  useEffect(() => { load(); }, []);
  function set(k: string, v: any) { setS({ ...s, [k]: v }); setSaved(false); }
  async function save() { setBusy(true); setSaved(false); try { const res = await fetch("/api/devnet/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ settings: s }) }); const d = await res.json().catch(() => ({})); if (d.ok) { setS(d.settings); setSaved(true); } } catch {} setBusy(false); }
  if (!s) return <Card className="p-10 text-center text-sm text-muted">Loading…</Card>;
  return (
    <>
      <PageHeader title="Devnet Status" subtitle="Network details testers see + the downloads gate." action={<div className="flex items-center gap-3">{saved && <span className="text-sm text-[color:var(--color-positive)]">Saved ✓</span>}<Button variant="primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button></div>} />
      <Card className="mb-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <div><div className="text-sm font-semibold">Tester downloads</div><div className="text-xs text-faint">When closed, testers can still log in but can't download Inferno/CLI — they see a notice + are told they'll be alerted when it reopens.</div></div>
          <button onClick={() => set("downloadsOpen", !s.downloadsOpen)} className={`relative h-7 w-12 shrink-0 rounded-full transition ${s.downloadsOpen ? "bg-[color:var(--color-positive)]" : "bg-line"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${s.downloadsOpen ? "left-6" : "left-1"}`} /></button>
        </div>
        <div className="mt-2"><Badge tone={s.downloadsOpen ? "positive" : "warning"}>{s.downloadsOpen ? "Open" : "Closed"}</Badge></div>
        {!s.downloadsOpen && <div className="mt-3"><label className="label">Closed message</label><textarea className="input" rows={2} value={s.downloadsClosedMessage} onChange={(e) => set("downloadsClosedMessage", e.target.value)} /></div>}
      </Card>
      <Card className="p-5">
        <div className="text-sm font-semibold">Network under test</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Network name"><input className="input" value={s.devnetName} onChange={(e) => set("devnetName", e.target.value)} /></Field>
          <Field label="Version"><input className="input" value={s.version} onChange={(e) => set("version", e.target.value)} /></Field>
          <Field label="Chain ID"><input className="input" type="number" value={s.chainId} onChange={(e) => set("chainId", e.target.value)} /></Field>
          <Field label="RPC URL"><input className="input" value={s.rpc} onChange={(e) => set("rpc", e.target.value)} /></Field>
        </div>
        <div className="mt-3"><Field label="What to test"><textarea className="input" rows={2} value={s.whatToTest} onChange={(e) => set("whatToTest", e.target.value)} /></Field></div>
      </Card>
    </>
  );
}

const DSEV: Record<string, { tone: any; label: string }> = { critical: { tone: "danger", label: "Critical" }, high: { tone: "warning", label: "High" }, medium: { tone: "brand", label: "Medium" }, low: { tone: "muted", label: "Low" } };
const DSTATUS: Record<string, string> = { new: "New", confirmed: "Confirmed", in_progress: "In Progress", fixed: "Fixed", verified: "Verified", closed: "Closed", duplicate: "Duplicate", wont_fix: "Won't Fix" };
const dago = (ms: number) => { const s = Math.floor((Date.now() - ms) / 1000); if (s < 60) return s + "s ago"; if (s < 3600) return Math.floor(s / 60) + "m ago"; if (s < 86400) return Math.floor(s / 3600) + "h ago"; return Math.floor(s / 86400) + "d ago"; };

const DOC_LABEL: Record<string, string> = { nda: "NDA", tos: "Alpha T&C" };
export function DevnetLegal({ subject }: { subject: AccessSubject }) {
  if (!can(subject, "devnet.manage")) return <Locked what="the Devnet legal records" />;
  const [rows, setRows] = useState<any[] | null>(null);
  const [filter, setFilter] = useState<"all" | "nda" | "tos">("all");
  const [open, setOpen] = useState<any>(null);
  useEffect(() => { fetch("/api/devnet/legal").then((r) => r.json()).then((d) => setRows(d.ok ? d.acceptances : [])); }, []);
  const shown = (rows || []).filter((r) => filter === "all" || r.doc_type === filter);
  const when = (ms: number) => new Date(ms).toLocaleString("en-US", { timeZone: "UTC", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) + " UTC";
  return (
    <>
      <PageHeader title="Devnet Legal" subtitle="Signed NDA and Alpha Test Program acceptances — name, digital signature, IP address, and timestamp for each signer." />
      <div className="mb-3 flex flex-wrap gap-2">
        {(["all", "nda", "tos"] as const).map((f) => <button key={f} onClick={() => setFilter(f)} className={`chip ${filter === f ? "chip-brand" : ""}`}>{f === "all" ? "All" : DOC_LABEL[f]}</button>)}
      </div>
      {!rows ? <Card className="p-8 text-center text-sm text-muted">Loading…</Card> : shown.length === 0 ? <Card className="p-8 text-center text-sm text-muted">No signed agreements yet.</Card> : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-line text-left text-xs uppercase tracking-wider text-faint">
                <th className="px-4 py-2.5 font-semibold">Tester</th><th className="px-4 py-2.5 font-semibold">Document</th><th className="px-4 py-2.5 font-semibold">Recipient / Signature</th><th className="px-4 py-2.5 font-semibold">IP address</th><th className="px-4 py-2.5 font-semibold">Signed</th>
              </tr></thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} className="cursor-pointer border-b border-line-soft last:border-0 hover:bg-[rgba(255,255,255,0.02)]" onClick={() => setOpen(r)}>
                    <td className="px-4 py-2.5"><div className="font-medium text-ink">{r.handle ? "@" + r.handle : r.display_name || "—"}</div><div className="text-xs text-faint">{r.email}</div></td>
                    <td className="px-4 py-2.5"><Badge tone={r.doc_type === "nda" ? "brand" : "muted"}>{DOC_LABEL[r.doc_type] || r.doc_type}</Badge> <span className="text-xs text-faint">v{r.doc_version}</span></td>
                    <td className="px-4 py-2.5">{r.recipient_name ? <><div className="text-ink">{r.recipient_name}</div><div className="text-xs italic text-faint" style={{ fontFamily: "'Segoe Script','Brush Script MT',cursive" }}>{r.signature}</div></> : <span className="text-xs text-faint">acceptance (no signature)</span>}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted">{r.ip || "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-muted">{when(Number(r.accepted_at))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setOpen(null)}>
          <div className="w-full max-w-lg rounded-2xl border border-line bg-[rgba(10,12,19,0.98)] p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">{DOC_LABEL[open.doc_type]} acceptance</h2><button onClick={() => setOpen(null)} className="text-faint hover:text-ink">✕</button></div>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-faint">Tester</dt><dd className="text-right text-ink">{open.display_name || "—"}{open.handle && <span className="text-faint"> · @{open.handle}</span>}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-faint">Email</dt><dd className="text-right text-ink">{open.email}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-faint">Document</dt><dd className="text-right text-ink">{DOC_LABEL[open.doc_type]} · version {open.doc_version}</dd></div>
              {open.recipient_name && <div className="flex justify-between gap-4"><dt className="text-faint">Recipient name</dt><dd className="text-right text-ink">{open.recipient_name}</dd></div>}
              {open.signature && <div className="flex justify-between gap-4"><dt className="text-faint">Digital signature</dt><dd className="text-right text-ink" style={{ fontFamily: "'Segoe Script','Brush Script MT',cursive", fontSize: "1.05rem" }}>{open.signature}</dd></div>}
              <div className="flex justify-between gap-4"><dt className="text-faint">IP address</dt><dd className="text-right font-mono text-ink">{open.ip || "—"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-faint">Signed at</dt><dd className="text-right text-ink">{when(Number(open.accepted_at))}</dd></div>
              {open.user_agent && <div><dt className="text-faint">User agent</dt><dd className="mt-1 break-words rounded-lg border border-line bg-[rgba(5,6,9,0.4)] p-2 text-xs text-muted">{open.user_agent}</dd></div>}
            </dl>
          </div>
        </div>
      )}
    </>
  );
}

export function DevnetIssues({ subject }: { subject: AccessSubject }) {
  if (!can(subject, "devnet.issues")) return <Locked what="the Devnet Issue Council" />;
  const [bugs, setBugs] = useState<any[] | null>(null);
  const [status, setStatus] = useState(""); const [sort, setSort] = useState("recent"); const [openId, setOpenId] = useState<string | null>(null);
  async function load() { const q = new URLSearchParams(); if (status) q.set("status", status); if (sort) q.set("sort", sort); const d = await (await fetch("/api/devnet/bugs?" + q)).json(); setBugs(d.ok ? d.bugs : []); }
  useEffect(() => { load(); }, [status, sort]);
  return (
    <>
      <PageHeader title="Devnet Issue Council" subtitle="Tester bug reports — comment, set criticality, and award bounties (paid from marketing)." />
      <div className="mb-3 flex flex-wrap gap-2">
        <select className="input w-auto py-1.5 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{Object.entries(DSTATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select className="input w-auto py-1.5 text-sm" value={sort} onChange={(e) => setSort(e.target.value)}><option value="recent">Most recent</option><option value="votes">Most votes</option><option value="severity">Severity</option></select>
      </div>
      {!bugs ? <Card className="p-8 text-center text-sm text-muted">Loading…</Card> : bugs.length === 0 ? <Card className="p-8 text-center text-sm text-muted">No reports yet.</Card> : (
        <div className="space-y-2">{bugs.map((b) => (
          <Card key={b.id} hover className="cursor-pointer p-4" onClick={() => setOpenId(b.id)}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2"><Badge tone={DSEV[b.assigned_severity || b.severity]?.tone}>{DSEV[b.assigned_severity || b.severity]?.label}</Badge><Badge>{DSTATUS[b.status]}</Badge>{b.bounty_pyrx > 0 && <Badge tone="brand">{Number(b.bounty_pyrx).toLocaleString("en-US")} PYRX</Badge>}</div>
                <div className="mt-1.5 truncate font-semibold">{b.title}</div>
                <div className="text-xs text-faint">{b.component ? b.component + " · " : ""}by {b.reporter_handle ? "@" + b.reporter_handle : b.reporter_name} · {dago(Number(b.created_at))}</div>
              </div>
              <div className="shrink-0 text-right text-xs text-faint"><div>▲ {b.votes}</div><div>✓ {b.confirms}</div></div>
            </div>
          </Card>
        ))}</div>
      )}
      {openId && <DevnetBugDetail id={openId} onClose={() => setOpenId(null)} onChanged={load} />}
    </>
  );
}
function DevnetBugDetail({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const [b, setB] = useState<any>(null); const [comment, setComment] = useState(""); const [busy, setBusy] = useState(false);
  async function load() { const d = await (await fetch("/api/devnet/bugs/" + id)).json(); if (d.ok) setB(d.bug); }
  useEffect(() => { load(); }, [id]);
  async function addComment() { if (!comment.trim()) return; const d = await (await fetch(`/api/devnet/bugs/comment?id=${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body: comment }) })).json(); if (d.ok) { setB((x: any) => ({ ...x, comments: d.comments })); setComment(""); } }
  async function triage(p: any) { setBusy(true); const d = await (await fetch("/api/devnet/bugs/" + id, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(p) })).json(); if (d.ok) { setB(d.bug); onChanged(); } setBusy(false); }
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="h-full w-full max-w-2xl overflow-y-auto border-l border-line bg-[rgba(8,10,17,0.97)] p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">{b?.title || "Bug"}</h2><button onClick={onClose} className="text-faint hover:text-ink">✕</button></div>
        {!b ? <p className="text-sm text-muted">Loading…</p> : (() => { const sev = b.assigned_severity || b.severity; return <>
          <div className="flex flex-wrap items-center gap-2"><Badge tone={DSEV[sev]?.tone}>{DSEV[sev]?.label}</Badge><Badge>{DSTATUS[b.status]}</Badge>{b.bounty_pyrx > 0 && <Badge tone="brand">{Number(b.bounty_pyrx).toLocaleString("en-US")} PYRX</Badge>}<span className="text-xs text-faint">by {b.reporter_handle ? "@" + b.reporter_handle : b.reporter_name} · {dago(Number(b.created_at))}</span></div>
          {b.component && <p className="mt-3 text-xs text-faint">Component: <span className="text-muted">{b.component}</span></p>}
          {b.description && <div className="mt-3"><div className="label">What happened</div><div className="mt-1 whitespace-pre-wrap rounded-lg border border-line bg-[rgba(5,6,9,0.4)] p-3 text-sm text-muted">{b.description}</div></div>}
          <div className="mt-3"><div className="label">Steps to reproduce</div><div className="mt-1 whitespace-pre-wrap rounded-lg border border-line bg-[rgba(5,6,9,0.4)] p-3 text-sm text-muted">{b.repro_steps}</div></div>
          {(b.attachments?.length || 0) > 0 && <div className="mt-3"><div className="label">Attachments</div><div className="mt-1 grid grid-cols-2 gap-2">{b.attachments.map((a: any, i: number) => a.type === "image" ? <a key={i} href={a.url} target="_blank" rel="noreferrer"><img src={a.url} className="h-24 w-full rounded-lg border border-line object-cover" /></a> : a.type === "video" ? <video key={i} src={a.url} controls className="h-24 w-full rounded-lg border border-line" /> : <a key={i} href={a.url} target="_blank" rel="noreferrer" className="chip">📎 {a.name}</a>)}</div></div>}
          <Card className="mt-4 p-4">
            <div className="text-sm font-semibold">Triage</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <select className="input py-1.5 text-sm" value={b.status} onChange={(e) => triage({ status: e.target.value })} disabled={busy}>{Object.entries(DSTATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              <select className="input py-1.5 text-sm" value={sev} onChange={(e) => triage({ assignedSeverity: e.target.value })} disabled={busy}>{Object.keys(DSEV).map((s) => <option key={s} value={s}>{DSEV[s].label}</option>)}</select>
            </div>
            <p className="mt-1 text-xs text-faint">Marking a bug Confirmed/Verified auto-awards the criticality bounty to the reporter (once).</p>
          </Card>
          <div className="mt-5"><div className="label">Comments</div>
            <div className="mt-2 space-y-2">{(b.comments || []).map((c: any) => <div key={c.id} className="rounded-lg border border-line p-2.5 text-sm"><div className="text-xs text-faint">{c.handle ? "@" + c.handle : c.display_name}{c.is_staff && <span className="ml-1 text-[color:var(--color-brand)]">· Admin</span>} · {dago(Number(c.created_at))}</div><div className="mt-0.5 whitespace-pre-wrap">{c.body}</div></div>)}{(b.comments || []).length === 0 && <p className="text-xs text-faint">No comments yet.</p>}</div>
            <div className="mt-2 flex gap-2"><input className="input" value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addComment()} placeholder="Reply as PYRAX team…" /><Button onClick={addComment}>Send</Button></div>
          </div>
        </>; })()}
      </div>
    </div>
  );
}

/** The shared Devnet community chat, embedded in the team portal. Team members appear to testers as
 *  blue "Admin" badges. Requires the devnet.chat permission and a chat username on the profile. */
export function DevnetChat({ subject }: { subject: AccessSubject }) {
  if (!can(subject, "devnet.chat")) return <Locked what="the Devnet community chat" />;
  const [gate, setGate] = useState<"loading" | "ok" | "no-username">("loading");
  useEffect(() => { fetch("/api/devnet-chat/token").then((r) => r.json()).then((d) => setGate(d.ok ? "ok" : (d.error?.includes("chat username") ? "no-username" : "ok"))).catch(() => setGate("ok")); }, []);
  return (
    <>
      <PageHeader title="Devnet Chat" subtitle="Talk with testers in the shared community chat — you appear as a PYRAX Admin." />
      {gate === "loading" ? <Card className="p-8 text-center text-sm text-muted">Connecting…</Card>
        : gate === "no-username" ? (
          <Card className="p-6 text-sm">
            <div className="font-semibold text-ink">Set a chat username first</div>
            <p className="mt-1 text-muted">Add a <span className="text-[color:var(--color-brand)]">Devnet chat username</span> on your <span className="font-medium">Profile</span> to post in the community chat. Testers will see you as an Admin.</p>
          </Card>
        ) : (
          <Card className="overflow-hidden p-0" style={{ height: "calc(100vh - 220px)", minHeight: 480 }}>
            <ChatRoom apiBase="/api/devnet-chat" />
          </Card>
        )}
    </>
  );
}

function Field({ label, req, error, children }: { label: string; req?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label} {req && <span className="text-[color:var(--color-ember)]">*</span>}</label>
      {children}
      {error && <p className="mt-1 text-xs text-[color:var(--color-negative)]">{error}</p>}
    </div>
  );
}

/** Phone field that live-formats to "+1 (825) 882-5915" and verifies the country code is real.
 *  Forward typing auto-formats; deletes pass through naturally; blur snaps to canonical form. */
function PhoneInput({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  const digits = value.replace(/\D/g, "");
  const live = !error && digits.length >= 7 ? validatePhone(value) : null;
  const shown = error || (live && !live.ok ? live.error : "");
  function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    if (raw.length < value.length) { onChange(raw); return; } // allow natural backspace/delete
    onChange(formatPhone(raw));
  }
  return (
    <Field label="Telephone" error={shown}>
      <input className="input" inputMode="tel" autoComplete="tel" placeholder="+1 (825) 882-5915"
        value={value} onChange={handle} onBlur={() => { if (value.trim()) onChange(formatPhone(value)); }} />
    </Field>
  );
}
function Drawer({ title, children, onClose, onSave, saveLabel = "Save", busy, extra }: { title: string; children: React.ReactNode; onClose: () => void; onSave: () => void; saveLabel?: string; busy?: boolean; extra?: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="h-full w-full max-w-lg overflow-y-auto border-l border-line bg-[rgba(8,10,17,0.96)] p-6 shadow-2xl animate-[rise_.3s] " onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2><button onClick={onClose} className="text-faint hover:text-ink">✕</button></div>
        {children}
        <div className="mt-6 flex items-center gap-3"><Button variant="primary" onClick={onSave} disabled={busy}>{busy ? "Working…" : saveLabel}</Button><Button onClick={onClose} disabled={busy}>Cancel</Button>{extra && <div className="ml-auto">{extra}</div>}</div>
      </div>
    </div>
  );
}

/* ============================================================== Network & App Management (nodes site) */
export function NetworkManagement({ subject }: { subject: AccessSubject }) {
  const canManage = can(subject, "network.manage");
  const canDl = can(subject, "network.downloads");
  const canCast = can(subject, "network.broadcast");
  if (!canManage && !canDl && !canCast) return <Locked what="Network & App Management" />;

  const [s, setS] = useState<any>(null);
  const [nets, setNets] = useState<any[]>([]);
  const [dls, setDls] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [bKind, setBKind] = useState("updates"); const [bTitle, setBTitle] = useState(""); const [bBody, setBBody] = useState("");
  const [bLink, setBLink] = useState("https://nodes.pyraxchain.com/downloads"); const [bButton, setBButton] = useState("Get the update");
  const [casting, setCasting] = useState(false); const [castRes, setCastRes] = useState<any>(null);

  async function load() { const d = await (await fetch("/api/network/settings")).json(); if (d.ok) { setS(d.settings); setNets(d.networks); setDls(d.settings.downloads || []); } }
  useEffect(() => { load(); }, []);
  async function save(patch: any, note = "Saved.") { setBusy(true); setMsg(""); const d = await (await fetch("/api/network/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) })).json(); if (d.ok) { setS(d.settings); setDls(d.settings.downloads || []); setMsg(note); setTimeout(() => setMsg(""), 2200); } else setMsg(d.error || "Failed."); setBusy(false); }
  async function broadcast() { if (!bTitle.trim() || !bBody.trim()) { setMsg("Title + body required for a broadcast."); return; } setCasting(true); setCastRes(null); const d = await (await fetch("/api/network/broadcast", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: bKind, title: bTitle, body: bBody, link: bLink, button: bButton }) })).json(); setCastRes(d); setCasting(false); }

  if (!s) return <Card className="p-8 text-center text-sm text-muted">Loading…</Card>;
  return (
    <>
      <PageHeader title="Network & App Management" subtitle="Control the public nodes site (nodes.pyraxchain.com) — availability, downloads, the default network shown across all marketing sites, and notify broadcasts." />
      {msg && <div className="mb-3 rounded-lg border border-line bg-[rgba(245,134,34,0.06)] px-3 py-2 text-sm text-ink">{msg}</div>}

      {canManage && (
        <Card className="mb-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div><h3 className="text-base font-bold">Public site availability</h3><p className="text-xs text-muted">When closed, nodes.pyraxchain.com shows a coming-soon page with the notify signup. The network + APIs keep running.</p></div>
            <Badge tone={s.open ? "positive" : "danger"}>{s.open ? "Open" : "Closed"}</Badge>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button variant={s.open ? "danger" : "primary"} onClick={() => save({ open: !s.open }, s.open ? "Site closed." : "Site opened.")} disabled={busy}>{s.open ? "Close the site" : "Open the site"}</Button>
            <a href="https://nodes.pyraxchain.com" target="_blank" rel="noreferrer" className="text-sm text-muted hover:text-ink">nodes.pyraxchain.com ↗</a>
          </div>
          <div className="mt-4"><div className="label">Coming-soon message</div>
            <textarea className="input min-h-[70px]" value={s.closedMessage} onChange={(e) => setS({ ...s, closedMessage: e.target.value })} />
            <div className="mt-2"><Button onClick={() => save({ closedMessage: s.closedMessage })} disabled={busy}>Save message</Button></div>
          </div>
        </Card>
      )}

      {canManage && (
        <Card className="mb-4 p-5">
          <h3 className="text-base font-bold">Default network</h3>
          <p className="text-xs text-muted">The network shown by default across the main website, the block explorer, and the nodes site (until a visitor picks another).</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {nets.map((n) => (
              <button key={n.label} onClick={() => save({ defaultNetwork: n.label }, `Default set to ${n.name}.`)} disabled={busy}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition ${s.defaultNetwork === n.label ? "border-[color:var(--color-brand)] bg-[rgba(245,134,34,0.08)] text-ink" : "border-line text-muted hover:text-ink"}`}>{n.name}</button>
            ))}
          </div>
        </Card>
      )}

      {canDl && (
        <Card className="mb-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div><h3 className="text-base font-bold">Downloads availability</h3><p className="text-xs text-muted">Disable the public Downloads page until the testnet goes live. The nav link stays; visitors see your message + a “notify me when downloads open” signup.</p></div>
            <Badge tone={s.downloadsOpen ? "positive" : "warning"}>{s.downloadsOpen ? "Open" : "Disabled"}</Badge>
          </div>
          <div className="mt-3"><Button variant={s.downloadsOpen ? "danger" : "primary"} onClick={() => save({ downloadsOpen: !s.downloadsOpen }, s.downloadsOpen ? "Downloads disabled." : "Downloads opened.")} disabled={busy}>{s.downloadsOpen ? "Disable downloads" : "Open downloads"}</Button></div>
          <div className="mt-4"><div className="label">“Downloads disabled” message</div>
            <textarea className="input min-h-[64px]" value={s.downloadsMessage || ""} onChange={(e) => setS({ ...s, downloadsMessage: e.target.value })} />
            <div className="mt-2"><Button onClick={() => save({ downloadsMessage: s.downloadsMessage })} disabled={busy}>Save message</Button></div>
          </div>
        </Card>
      )}

      {canDl && (
        <Card className="mb-4 p-5">
          <div className="flex items-center justify-between"><h3 className="text-base font-bold">Public downloads</h3><Button onClick={() => setDls([...dls, { product: "Inferno Node App", platform: "Windows", url: "https://", version: "latest" }])}>+ Add</Button></div>
          <p className="text-xs text-muted">Shown on the public Downloads page with OS icons. Empty falls back to built-in defaults.</p>
          <div className="mt-3 space-y-2">
            {dls.length === 0 && <p className="text-sm text-faint">No custom downloads — the page shows sensible defaults.</p>}
            {dls.map((d, i) => (
              <div key={i} className="grid grid-cols-1 gap-2 rounded-lg border border-line p-3 sm:grid-cols-[1.4fr_1fr_2fr_0.8fr_auto]">
                <input className="input py-1.5 text-sm" placeholder="Product" value={d.product} onChange={(e) => setDls(dls.map((x, j) => j === i ? { ...x, product: e.target.value } : x))} />
                <select className="input py-1.5 text-sm" value={d.platform} onChange={(e) => setDls(dls.map((x, j) => j === i ? { ...x, platform: e.target.value } : x))}>{["Windows", "macOS", "Linux"].map((p) => <option key={p}>{p}</option>)}</select>
                <input className="input py-1.5 text-sm" placeholder="https://download-url" value={d.url} onChange={(e) => setDls(dls.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} />
                <input className="input py-1.5 text-sm" placeholder="version" value={d.version || ""} onChange={(e) => setDls(dls.map((x, j) => j === i ? { ...x, version: e.target.value } : x))} />
                <button onClick={() => setDls(dls.filter((_, j) => j !== i))} className="text-faint hover:text-[color:var(--color-negative)]">✕</button>
              </div>
            ))}
          </div>
          <div className="mt-3"><Button variant="primary" onClick={() => save({ downloads: dls }, "Downloads saved.")} disabled={busy}>Save downloads</Button></div>
        </Card>
      )}

      {canCast && (
        <Card className="p-5">
          <h3 className="text-base font-bold">Send a notification</h3>
          <p className="text-xs text-muted">Email + browser-push everyone on the notify list who opted into this type. Uses the on-brand Brevo template.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[["updates", "App update"], ["portal", "Portal opened"], ["downloads", "Downloads opened"]].map(([k, l]) => (
              <button key={k} onClick={() => setBKind(k)} className={`rounded-lg border px-3 py-1.5 text-sm ${bKind === k ? "border-[color:var(--color-brand)] bg-[rgba(245,134,34,0.08)] text-ink" : "border-line text-muted"}`}>{l}</button>
            ))}
          </div>
          <div className="mt-3 grid gap-2">
            <input className="input" placeholder="Title (e.g. Inferno v0.4.0 is here)" value={bTitle} onChange={(e) => setBTitle(e.target.value)} />
            <textarea className="input min-h-[90px]" placeholder="Message body…" value={bBody} onChange={(e) => setBBody(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <input className="input" placeholder="Button link" value={bLink} onChange={(e) => setBLink(e.target.value)} />
              <input className="input" placeholder="Button label" value={bButton} onChange={(e) => setBButton(e.target.value)} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3"><Button variant="primary" onClick={broadcast} disabled={casting}>{casting ? "Sending…" : "Send broadcast"}</Button>
            {castRes && (castRes.ok ? <span className="text-sm text-[color:var(--color-positive)]">Emailed {castRes.emailed} · pushed {castRes.pushed} of {castRes.subscribers} subscribers</span> : <span className="text-sm text-[color:var(--color-negative)]">{castRes.error}</span>)}
          </div>
        </Card>
      )}
    </>
  );
}
