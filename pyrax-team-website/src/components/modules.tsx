// SPDX-License-Identifier: LicenseRef-Proprietary
import React, { useEffect, useMemo, useState } from "react";
import { Card, Button, StatTile, Badge, PageHeader, Icon, Pagination } from "./ui";
import MacGatekeeperBanner from "./MacGatekeeperBanner";
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
            {can(subject, "downloads.view") && <QuickAction icon="download" label="Get the apps" desc="Inferno + Ember (internal)" onClick={() => onNavigate("downloads")} />}
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
  const canDrip = can(subject, "faucet.drip");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; hash?: string; amount?: string; network?: string; error?: string } | null>(null);
  async function drip() {
    setBusy(true); setResult(null);
    try {
      const r = await fetch("/api/faucet/drip", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address: address.trim() }) });
      const d = await r.json().catch(() => ({ ok: false, error: "Bad response." }));
      setResult(d);
      if (d.ok) setAddress("");
    } catch { setResult({ ok: false, error: "Network error." }); }
    setBusy(false);
  }
  return (
    <>
      <PageHeader title="Faucet" subtitle="Dispense test PYRX to a wallet on PYRAX Forge (the tester devnet)." />
      <Card className="max-w-xl p-6">
        <div className="flex items-center justify-between"><div className="text-sm font-semibold">PYRAX Forge test faucet</div><Badge tone="brand">Forge · 710823</Badge></div>
        <p className="mt-1 text-xs text-faint">Sends a fixed drip of test PYRX from the Forge faucet wallet. Rate-limited per address — play money on the devnet only.</p>
        <div className="mt-4">
          <label className="label">Recipient wallet address</label>
          <input className="input font-mono" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x…" spellCheck={false} disabled={busy || !canDrip} />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button variant="primary" onClick={drip} disabled={busy || !canDrip || !address.trim()}>{busy ? "Sending…" : "Send drip"}</Button>
          {!canDrip && <span className="text-xs text-faint">You have view-only access to the faucet.</span>}
        </div>
        {result && (result.ok
          ? <div className="mt-4 rounded-xl border border-[color:rgba(63,207,142,0.3)] bg-[rgba(63,207,142,0.06)] p-3 text-sm"><div className="font-semibold text-[color:var(--color-positive)]">Sent {result.amount} PYRX on {result.network}.</div>{result.hash && <div className="mt-1 break-all font-mono text-xs text-muted">tx {result.hash}</div>}</div>
          : <div className="mt-4 rounded-xl border border-[color:rgba(224,99,74,0.3)] bg-[rgba(224,99,74,0.06)] p-3 text-sm text-[color:var(--color-negative)]">{result.error || "Couldn't send."}</div>)}
      </Card>
    </>
  );
}

/* ============================================================== Downloads */
type DlPlatform = "win" | "mac" | "linux";
interface PlatformDownload { platform: DlPlatform; label: string; filename: string; url: string }
interface DownloadProduct { id: string; name: string; note: string; restricted?: boolean; version: string | null; downloads: PlatformDownload[] }
interface DownloadsResponse { ok: boolean; configured?: boolean; canEmber?: boolean; products?: DownloadProduct[]; error?: string }

function DlIcon({ platform }: { platform: DlPlatform }) {
  const I = platform === "win" ? Icon.windows : platform === "mac" ? Icon.apple : Icon.linux;
  return <I className="h-4 w-4" />;
}

export function Downloads({ subject }: { subject: AccessSubject }) {
  if (!can(subject, "downloads.view")) return <Locked what="downloads" />;
  const [state, setState] = useState<DownloadsResponse | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    let alive = true;
    fetch("/api/downloads", { headers: { accept: "application/json" } })
      .then((r) => r.json() as Promise<DownloadsResponse>)
      .then((d) => { if (!alive) return; if (!d.ok) { setErr(d.error || "Couldn't load downloads."); setState({ ok: true, products: [] }); return; } setState(d); })
      .catch(() => { if (alive) { setErr("Network error loading downloads."); setState({ ok: true, products: [] }); } });
    return () => { alive = false; };
  }, []);

  const subtitle = "Latest signed builds. The download role grants the Inferno app — the internal Ember build needs its own access.";
  if (!state) {
    return (
      <>
        <PageHeader title="Downloads" subtitle={subtitle} />
        <Card className="p-10 text-center text-sm text-muted"><span className="mr-2 inline-block h-4 w-4 animate-spin-slow rounded-full border-2 border-line border-t-[color:var(--color-brand)] align-middle" />Loading builds…</Card>
      </>
    );
  }

  const products = state.products || [];
  const anyBuild = products.some((p) => p.downloads.length > 0);

  return (
    <>
      <PageHeader title="Downloads" subtitle={subtitle} />
      <MacGatekeeperBanner />
      {err && <p className="mb-3 text-sm text-[color:var(--color-negative)]">{err}</p>}
      {!anyBuild ? (
        <ComingSoon title="No builds published yet" detail="The signed Inferno + Ember builds appear here the moment the release pipeline publishes them. Restricted products stay gated to their own access." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {products.map((p) => (
            <Card key={p.id} className="p-5">
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold">{p.name}</h3>
                  {p.restricted && <Badge tone="danger">Restricted</Badge>}
                </div>
                {p.version && <Badge tone="muted">v{p.version}</Badge>}
              </div>
              <p className="mt-1 text-sm text-muted">{p.note}</p>
              {p.downloads.length === 0 ? (
                <div className="mt-4 rounded-lg border border-line bg-[rgba(5,6,9,0.4)] p-3 text-sm text-faint">No published build yet for this product.</div>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  {p.downloads.map((d) => (
                    <a key={d.platform} href={d.url} rel="noreferrer" className="btn btn-ghost" title={d.filename}>
                      <DlIcon platform={d.platform} /> {d.label}
                    </a>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
      <p className="mt-4 text-xs text-faint">Download links are individually signed and expire after a few minutes — reopen this page to refresh them. Builds are served from the private release store.{state.canEmber ? " You have access to the internal Ember build." : ""}</p>
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
  const [page, setPage] = useState(1); const PAGE_SIZE = 12;
  async function load() { try { const d = await (await fetch("/api/devnet/testers")).json(); setList(d.ok ? d.testers : []); } catch { setList([]); } }
  useEffect(() => { load(); }, []);
  async function post(url: string, body: any) { try { const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); return await r.json().catch(() => ({ ok: false })); } catch { return { ok: false }; } }
  async function resend(email: string) { setSent(""); const d = await post("/api/devnet/testers/resend", { email }); setSent(d.ok ? `Welcome email resent to ${email}.` : (d.error || "Couldn't resend.")); }
  async function setSuspended(email: string, suspend: boolean) { const d = await post("/api/devnet/testers/suspend", { email, suspend }); if (d.ok) load(); else setSent(d.error || "Couldn't update."); }
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
          <thead className="text-left text-xs uppercase tracking-wider text-faint"><tr className="border-b border-line"><th className="p-3">Tester</th><th className="p-3">Status</th><th className="p-3 hidden sm:table-cell">Nodes</th><th className="p-3">PYRX</th><th className="p-3 text-right">Actions</th></tr></thead>
          <tbody>
            {!list ? <tr><td colSpan={5} className="p-6 text-center text-muted">Loading…</td></tr> : list.length === 0 ? <tr><td colSpan={5} className="p-6 text-center text-muted">No testers yet — whitelist your first.</td></tr> :
              list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((t, i) => (
                <tr key={i} className="border-b border-line-soft last:border-0">
                  <td className="p-3"><div className="font-semibold">{t.handle ? "@" + t.handle : t.email}</div><div className="text-xs text-faint">{t.email}</div></td>
                  <td className="p-3"><div className="flex flex-wrap gap-1">{t.status === "suspended" ? <span className="rounded px-2 py-0.5 text-[0.7rem] font-semibold" style={{ background: "rgba(224,99,74,0.16)", color: "#e0634a" }}>Banned</span> : t.status === "active" ? <Badge tone="positive">Active</Badge> : <Badge tone="warning">Invited</Badge>}{t.founding_rank && <Badge tone="brand">Founding #{t.founding_rank}</Badge>}</div></td>
                  <td className="p-3 hidden sm:table-cell text-muted">{t.nodes ?? 0}</td>
                  <td className="p-3 font-mono text-muted">{(t.pyrx ?? 0).toLocaleString("en-US")}</td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      {(t.kind === "pending" || t.status === "invited") && <Button className="px-2 py-1 text-xs" onClick={() => resend(t.email)}>Resend</Button>}
                      {t.status === "active" && <Button variant="danger" className="px-2 py-1 text-xs" onClick={() => { if (confirm(`Ban ${t.email}? They will be logged out and blocked from the devnet site.`)) setSuspended(t.email, true); }}>Ban</Button>}
                      {t.status === "suspended" && <Button className="px-2 py-1 text-xs" onClick={() => setSuspended(t.email, false)}>Restore</Button>}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </Card>
      <Pagination page={page} total={list?.length ?? 0} pageSize={PAGE_SIZE} onPage={setPage} />
      {sent && <p className="mt-2 text-center text-sm text-[color:var(--color-positive)]">{sent}</p>}
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

// ---- Product-Test review vocabulary (mirrors the cross-surface contract review_status machine) ----
const TSTATUS: Record<string, { tone: any; label: string }> = {
  submitted: { tone: "water", label: "Submitted" },
  ai_screening: { tone: "brand", label: "AI Screening" },
  in_review: { tone: "warning", label: "In Review" },
  needs_more: { tone: "warning", label: "Needs More" },
  accepted: { tone: "positive", label: "Accepted" },
  rejected: { tone: "danger", label: "Rejected" },
};
const TVERDICT: Record<string, { tone: any; label: string }> = {
  accept: { tone: "positive", label: "Accept" },
  reject: { tone: "danger", label: "Reject" },
  escalate: { tone: "warning", label: "Escalate" },
};
const TRACK_LABEL: Record<string, string> = { inferno: "Inferno", cli: "CLI" };
const nfmt = (n: number) => Number(n || 0).toLocaleString("en-US");

const DOC_LABEL: Record<string, string> = { nda: "NDA", tos: "Alpha T&C" };
export function DevnetLegal({ subject }: { subject: AccessSubject }) {
  if (!can(subject, "devnet.manage")) return <Locked what="the Devnet legal records" />;
  const [rows, setRows] = useState<any[] | null>(null);
  const [filter, setFilter] = useState<"all" | "nda" | "tos">("all");
  const [open, setOpen] = useState<any>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;
  useEffect(() => { fetch("/api/devnet/legal").then((r) => r.json()).then((d) => setRows(d.ok ? d.acceptances : [])); }, []);
  const shown = (rows || []).filter((r) => filter === "all" || r.doc_type === filter);
  const when = (ms: number) => new Date(ms).toLocaleString("en-US", { timeZone: "UTC", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) + " UTC";
  return (
    <>
      <PageHeader title="Devnet Legal" subtitle="Signed NDA and Alpha Test Program acceptances — name, digital signature, IP address, and timestamp for each signer." />
      <div className="mb-3 flex flex-wrap gap-2">
        {(["all", "nda", "tos"] as const).map((f) => <button key={f} onClick={() => { setFilter(f); setPage(1); }} className={`chip ${filter === f ? "chip-brand" : ""}`}>{f === "all" ? "All" : DOC_LABEL[f]}</button>)}
      </div>
      {!rows ? <Card className="p-8 text-center text-sm text-muted">Loading…</Card> : shown.length === 0 ? <Card className="p-8 text-center text-sm text-muted">No signed agreements yet.</Card> : (<>
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-line text-left text-xs uppercase tracking-wider text-faint">
                <th className="px-4 py-2.5 font-semibold">Tester</th><th className="px-4 py-2.5 font-semibold">Document</th><th className="px-4 py-2.5 font-semibold">Recipient / Signature</th><th className="px-4 py-2.5 font-semibold">IP address</th><th className="px-4 py-2.5 font-semibold">Signed</th>
              </tr></thead>
              <tbody>
                {shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((r) => (
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
        <Pagination page={page} total={shown.length} pageSize={PAGE_SIZE} onPage={setPage} />
        </>
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

/* ============================================================== Devnet Test Reviews (product tests) */
/** Staff review of tester product-test submissions — the review QUEUE (filter by status/track/assignee,
 *  Sentinel verdict badge, assignee chip), a DETAIL drawer that plays the proof back (photos/video, each
 *  step's pass/fail, the tester's logs, auto-captured environment, and the full Sentinel assessment),
 *  ASSIGN + review actions (accept→award / reject / request-more) with an award-override, the comment
 *  thread, and a Release-Readiness panel (per-version coverage + a test×track pass/fail heatmap).
 *  Mirrors the Issue-Council flow against the team review API (contract §6). */
export function DevnetRewards({ subject }: { subject: AccessSubject }) {
  if (!can(subject, "devnet.rewards")) return <Locked what="Airdrop Accounting" />;
  const [data, setData] = useState<{ accounts: any[]; totals: any; priceUsd: number } | null>(null);
  const [q, setQ] = useState("");
  const [only, setOnly] = useState<"all" | "eligible" | "wallet">("all");
  const [err, setErr] = useState("");
  useEffect(() => {
    (async () => {
      try {
        const d = await (await fetch("/api/devnet/rewards")).json();
        if (d.ok) setData({ accounts: d.accounts, totals: d.totals, priceUsd: d.priceUsd }); else setErr(d.error || "Failed to load.");
      } catch { setErr("Failed to load."); }
    })();
  }, []);
  const usd = (n: number) => "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const rows = useMemo(() => {
    if (!data) return [];
    const term = q.trim().toLowerCase();
    return data.accounts.filter((a) => {
      if (only === "eligible" && !a.rewardEligible) return false;
      if (only === "wallet" && !a.payoutWallet) return false;
      if (!term) return true;
      return (a.handle || "").toLowerCase().includes(term) || (a.displayName || "").toLowerCase().includes(term) || (a.email || "").toLowerCase().includes(term) || (a.payoutWallet || "").toLowerCase().includes(term);
    });
  }, [data, q, only]);

  return (
    <>
      <PageHeader title="Airdrop Accounting" subtitle="Every tester's accrued PYRX rewards — paid at the mainnet airdrop. Broken down by reason, with payout wallets and CSV export." />
      {err && <Card className="mb-3 p-4 text-sm text-red-400">{err}</Card>}
      {!data ? <Card className="p-8 text-center text-sm text-muted">Loading…</Card> : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="p-4"><div className="text-xs text-faint">Total accrued</div><div className="mt-1 text-xl font-semibold">{nfmt(data.totals.totalPyrx)}<span className="ml-1 text-xs text-muted">PYRX</span></div><div className="text-xs text-faint">≈ {usd(data.totals.usd)} @ ${data.priceUsd}/PYRX</div></Card>
            <Card className="p-4"><div className="text-xs text-faint">Airdrop liability (eligible)</div><div className="mt-1 text-xl font-semibold">{nfmt(data.totals.eligiblePyrx)}<span className="ml-1 text-xs text-muted">PYRX</span></div><div className="text-xs text-faint">reward-eligible testers only</div></Card>
            <Card className="p-4"><div className="text-xs text-faint">Testers</div><div className="mt-1 text-xl font-semibold">{nfmt(data.totals.testers)}</div><div className="text-xs text-faint">{nfmt(data.totals.withWallet)} with a payout wallet</div></Card>
            <Card className="p-4"><div className="text-xs text-faint">By reason</div><div className="mt-1 space-y-0.5 text-xs">
              <div className="flex justify-between"><span className="text-muted">Tests</span><span>{nfmt(data.totals.byReason.test)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Bugs</span><span>{nfmt(data.totals.byReason.bug)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Consistency</span><span>{nfmt(data.totals.byReason.consistency)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Uptime</span><span>{nfmt(data.totals.byReason.uptime)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Founding / other</span><span>{nfmt(data.totals.byReason.founding + data.totals.byReason.other)}</span></div>
            </div></Card>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input className="input w-auto flex-1 py-1.5 text-sm" placeholder="Search handle, name, email, or wallet…" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="flex rounded-lg border border-line p-0.5 text-sm">
              {(["all", "eligible", "wallet"] as const).map((k) => (
                <button key={k} onClick={() => setOnly(k)} className={`rounded-md px-3 py-1 ${only === k ? "bg-[rgba(245,134,34,0.1)] text-ink" : "text-muted hover:text-ink"}`}>{k === "all" ? "All" : k === "eligible" ? "Eligible" : "Has wallet"}</button>
              ))}
            </div>
            <a href="/api/devnet/rewards?format=csv" className="btn btn-ghost px-3 py-1.5 text-sm" download>Export CSV</a>
          </div>

          {rows.length === 0 ? <Card className="p-8 text-center text-sm text-muted">No testers match.</Card> : (
            <Card className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-line text-left text-xs text-faint">
                  <th className="p-3 font-medium">Tester</th>
                  <th className="p-3 font-medium">Payout wallet</th>
                  <th className="p-3 text-right font-medium">Total PYRX</th>
                  <th className="p-3 text-right font-medium">≈ USD</th>
                  <th className="p-3 text-right font-medium">Tests</th>
                  <th className="p-3 text-right font-medium">Bugs</th>
                  <th className="p-3 text-right font-medium">Consistency</th>
                  <th className="p-3 text-right font-medium">Last earned</th>
                </tr></thead>
                <tbody>{rows.map((a) => (
                  <tr key={a.testerId} className="border-b border-line/50 last:border-0">
                    <td className="p-3">
                      <div className="flex items-center gap-2 font-medium">{a.handle ? "@" + a.handle : a.displayName || a.email}{a.foundingRank ? <Badge tone="brand">Founding #{a.foundingRank}</Badge> : null}{!a.rewardEligible ? <Badge tone="muted">ineligible</Badge> : null}</div>
                      <div className="text-xs text-faint">{a.displayName || a.email}</div>
                    </td>
                    <td className="p-3 font-mono text-xs text-muted">{a.payoutWallet ? a.payoutWallet.slice(0, 10) + "…" + a.payoutWallet.slice(-6) : <span className="text-faint">— none —</span>}</td>
                    <td className="p-3 text-right font-semibold">{nfmt(a.totalPyrx)}</td>
                    <td className="p-3 text-right text-muted">{usd(a.usd)}</td>
                    <td className="p-3 text-right text-muted">{nfmt(a.byReason.test)}<span className="text-faint"> ({a.testCount})</span></td>
                    <td className="p-3 text-right text-muted">{nfmt(a.byReason.bug)}<span className="text-faint"> ({a.bugCount})</span></td>
                    <td className="p-3 text-right text-muted">{nfmt(a.byReason.consistency)}</td>
                    <td className="p-3 text-right text-xs text-faint">{a.lastEarnedAt ? dago(a.lastEarnedAt) : "—"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </Card>
          )}
          <p className="mt-3 text-xs text-faint">Rewards accrue now and are paid at the mainnet airdrop. Testers without a payout wallet must set one before the snapshot. Amounts reflect the earnings ledger; a wrongful award is corrected with an <code>adjustment</code> entry, never a silent edit.</p>
        </>
      )}
    </>
  );
}

export function DevnetTestReviews({ subject }: { subject: AccessSubject }) {
  if (!can(subject, "devnet.tests")) return <Locked what="the Devnet Test Reviews" />;
  const [subs, setSubs] = useState<any[] | null>(null);
  const [reviewers, setReviewers] = useState<any[]>([]);
  const [status, setStatus] = useState(""); const [track, setTrack] = useState(""); const [assignee, setAssignee] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [tab, setTab] = useState<"queue" | "readiness">("queue");
  async function load() {
    const q = new URLSearchParams();
    if (status) q.set("status", status); if (track) q.set("track", track); if (assignee) q.set("assignee", assignee);
    const d = await (await fetch("/api/devnet/tests?" + q)).json();
    if (d.ok) { setSubs(d.submissions); setReviewers(d.reviewers || []); } else { setSubs([]); }
  }
  useEffect(() => { if (tab === "queue") load(); }, [status, track, assignee, tab]);
  return (
    <>
      <PageHeader title="Devnet Test Reviews" subtitle="Tester product-test submissions — assign, verify the proof + Sentinel assessment, and accept (award), reject, or request more info." />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-line p-0.5 text-sm">
          <button onClick={() => setTab("queue")} className={`rounded-md px-3 py-1 ${tab === "queue" ? "bg-[rgba(245,134,34,0.1)] text-ink" : "text-muted hover:text-ink"}`}>Review Queue</button>
          <button onClick={() => setTab("readiness")} className={`rounded-md px-3 py-1 ${tab === "readiness" ? "bg-[rgba(245,134,34,0.1)] text-ink" : "text-muted hover:text-ink"}`}>Release Readiness</button>
        </div>
      </div>
      {tab === "readiness" ? <ReleaseReadiness /> : <>
        <div className="mb-3 flex flex-wrap gap-2">
          <select className="input w-auto py-1.5 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{Object.entries(TSTATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
          <select className="input w-auto py-1.5 text-sm" value={track} onChange={(e) => setTrack(e.target.value)}><option value="">All tracks</option><option value="inferno">Inferno</option><option value="cli">CLI</option></select>
          <select className="input w-auto py-1.5 text-sm" value={assignee} onChange={(e) => setAssignee(e.target.value)}><option value="">Any assignee</option>{reviewers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
        </div>
        {!subs ? <Card className="p-8 text-center text-sm text-muted">Loading…</Card> : subs.length === 0 ? <Card className="p-8 text-center text-sm text-muted">No submissions match.</Card> : (
          <div className="space-y-2">{subs.map((s) => { const st = TSTATUS[s.reviewStatus]; const sa = s.sentinelAssessment; return (
            <Card key={s.id} hover className="cursor-pointer p-4" onClick={() => setOpenId(s.id)}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="muted">{TRACK_LABEL[s.track] || s.track}</Badge>
                    <Badge tone={st?.tone}>{st?.label || s.reviewStatus}</Badge>
                    {sa?.verdict && <Badge tone={TVERDICT[sa.verdict]?.tone}>Sentinel: {TVERDICT[sa.verdict]?.label || sa.verdict}{typeof sa.confidence === "number" ? ` ${Math.round(sa.confidence * 100)}%` : ""}</Badge>}
                    {s.awardedPyrx > 0 && <Badge tone="brand">{nfmt(s.awardedPyrx)} PYRX</Badge>}
                  </div>
                  <div className="mt-1.5 truncate font-semibold">{s.testTitle}</div>
                  <div className="text-xs text-faint">by {s.testerHandle ? "@" + s.testerHandle : s.testerName} · {dago(Number(s.createdAt))}{s.assignedToName ? " · assigned to " + s.assignedToName : ""}</div>
                </div>
                <div className="shrink-0 text-right text-xs text-faint">
                  <div>{(s.results || []).filter((r: any) => r.pass).length}/{(s.results || []).length} steps</div>
                  <div>{(s.attachments || []).length} proof</div>
                </div>
              </div>
            </Card>
          ); })}</div>
        )}
        {openId && <TestReviewDetail id={openId} reviewers={reviewers} onClose={() => setOpenId(null)} onChanged={load} />}
      </>}
    </>
  );
}

function TestReviewDetail({ id, reviewers, onClose, onChanged }: { id: string; reviewers: any[]; onClose: () => void; onChanged: () => void }) {
  const [s, setS] = useState<any>(null); const [comments, setComments] = useState<any[]>([]);
  const [comment, setComment] = useState(""); const [notes, setNotes] = useState(""); const [award, setAward] = useState(""); const [busy, setBusy] = useState(false);
  async function load() { const d = await (await fetch("/api/devnet/tests/" + id)).json(); if (d.ok) { setS(d.submission); setComments(d.comments || []); } }
  useEffect(() => { load(); }, [id]);
  async function assign(assigneeId: string) { setBusy(true); const d = await (await fetch(`/api/devnet/tests/${id}/assign`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ assigneeId }) })).json(); if (d.ok) { setS(d.submission); onChanged(); } setBusy(false); }
  async function review(verdict: "accept" | "reject" | "needs_more") {
    setBusy(true);
    const body: any = { verdict, notes };
    const a = Number(award); if (verdict === "accept" && award.trim() !== "" && Number.isFinite(a) && a >= 0) body.awardPyrx = Math.round(a);
    const d = await (await fetch(`/api/devnet/tests/${id}/review`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).json();
    if (d.ok) { setS(d.submission); onChanged(); } setBusy(false);
  }
  async function addComment() { if (!comment.trim()) return; const d = await (await fetch(`/api/devnet/tests/${id}/comment`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body: comment }) })).json(); if (d.ok) { setComments(d.comments); setComment(""); } }

  const stepFlag = (i: number) => s?.sentinelAssessment?.perStep?.find((p: any) => p.stepIndex === i);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="h-full w-full max-w-2xl overflow-y-auto border-l border-line bg-[rgba(8,10,17,0.97)] p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">{s?.testTitle || "Submission"}</h2><button onClick={onClose} className="text-faint hover:text-ink">✕</button></div>
        {!s ? <p className="text-sm text-muted">Loading…</p> : (() => { const st = TSTATUS[s.reviewStatus]; const sa = s.sentinelAssessment; const terminal = s.reviewStatus === "accepted" || s.reviewStatus === "rejected"; return <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="muted">{TRACK_LABEL[s.track] || s.track}</Badge>
            <Badge tone={st?.tone}>{st?.label || s.reviewStatus}</Badge>
            {s.awardedPyrx > 0 && <Badge tone="brand">{nfmt(s.awardedPyrx)} PYRX</Badge>}
            <span className="text-xs text-faint">by {s.testerHandle ? "@" + s.testerHandle : s.testerName} · {dago(Number(s.createdAt))}</span>
          </div>
          <p className="mt-2 text-xs text-faint">Test: <span className="text-muted">{s.testSlug || s.testId}</span> · weight <span className="text-muted">{nfmt(s.weightPyrx)} PYRX</span>{s.appVersion ? <> · built for <span className="text-muted">{s.appVersion}</span></> : null}{s.testerWallet ? <> · payout <span className="text-muted">{s.testerWallet}</span></> : <> · <span className="text-[color:var(--color-ember)]">no payout wallet</span></>}</p>

          {/* per-step results with the tester's pass/fail + note, annotated by Sentinel's perStep flags */}
          <div className="mt-4"><div className="label">Steps</div>
            <div className="mt-1 space-y-1.5">{(s.results || []).length === 0 ? <p className="text-xs text-faint">No step results.</p> : (s.results || []).map((r: any, i: number) => { const f = stepFlag(r.stepIndex ?? i); return (
              <div key={i} className="rounded-lg border border-line bg-[rgba(5,6,9,0.4)] p-2.5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">Step {(r.stepIndex ?? i) + 1}</span>
                  <span className="flex items-center gap-1.5">
                    {f && <Badge tone={f.ok ? "positive" : "danger"}>AI {f.ok ? "ok" : "flag"}</Badge>}
                    <Badge tone={r.pass ? "positive" : "danger"}>{r.pass ? "Pass" : "Fail"}</Badge>
                  </span>
                </div>
                {r.note && <div className="mt-1 whitespace-pre-wrap text-muted">{r.note}</div>}
                {f?.flag && <div className="mt-1 text-xs text-[color:var(--color-ember)]">⚑ {f.flag}</div>}
              </div>
            ); })}</div>
          </div>

          {s.notes && <div className="mt-3"><div className="label">Tester notes</div><div className="mt-1 whitespace-pre-wrap rounded-lg border border-line bg-[rgba(5,6,9,0.4)] p-3 text-sm text-muted">{s.notes}</div></div>}
          {s.logs && <div className="mt-3"><div className="label">Logs</div><pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-line bg-[rgba(5,6,9,0.6)] p-3 text-xs text-muted">{s.logs}</pre></div>}

          {/* proof played back inline: photos as thumbnails, video from the CDN url, other files as chips */}
          {(s.attachments?.length || 0) > 0 && <div className="mt-3"><div className="label">Proof</div><div className="mt-1 grid grid-cols-2 gap-2">{s.attachments.map((a: any, i: number) => {
            const kind = a.type === "video" ? "video" : a.type === "image" ? "image" : "file";
            return kind === "image"
              ? <a key={i} href={a.url} target="_blank" rel="noreferrer" className="block"><img src={a.url} className="h-28 w-full rounded-lg border border-line object-cover" alt={a.name || "proof"} /><div className="mt-0.5 truncate text-[0.65rem] text-faint">{a.name || `image · step ${(a.stepIndex ?? 0) + 1}`}</div></a>
              : kind === "video"
                ? <div key={i}><video src={a.url} controls preload="metadata" className="h-28 w-full rounded-lg border border-line bg-black object-contain" /><div className="mt-0.5 truncate text-[0.65rem] text-faint">{a.name || `video · step ${(a.stepIndex ?? 0) + 1}`}</div></div>
                : <a key={i} href={a.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border border-line bg-[rgba(5,6,9,0.4)] p-2 text-xs text-muted hover:text-ink">📎 {a.name || a.type || "attachment"}</a>;
          })}</div></div>}

          {/* the full Sentinel assessment: verdict/confidence, rationale, chain cross-checks, model */}
          <Card className="mt-4 p-4">
            <div className="flex items-center justify-between"><div className="text-sm font-semibold">Sentinel assessment</div>{sa?.verdict && <Badge tone={TVERDICT[sa.verdict]?.tone}>{TVERDICT[sa.verdict]?.label || sa.verdict}{typeof sa.confidence === "number" ? ` · ${Math.round(sa.confidence * 100)}%` : ""}</Badge>}</div>
            {!sa ? <p className="mt-1 text-xs text-faint">Not yet screened by Sentinel.</p> : <>
              {sa.reason && <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{sa.reason}</p>}
              {(sa.chainChecks?.length || 0) > 0 && <div className="mt-2"><div className="label">Chain checks</div><div className="mt-1 space-y-1">{sa.chainChecks.map((c: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs"><span className={c.ok ? "text-positive" : "text-[color:var(--color-negative)]"}>{c.ok ? "✓" : "✕"}</span><span className="font-medium text-ink">{c.name}</span>{c.detail && <span className="text-faint">— {c.detail}</span>}</div>
              ))}</div></div>}
              <p className="mt-2 text-[0.65rem] text-faint">{sa.model ? `model ${sa.model}` : ""}{sa.at ? ` · ${dago(Number(sa.at))}` : ""}</p>
            </>}
          </Card>

          {/* assignment */}
          <Card className="mt-4 p-4">
            <div className="text-sm font-semibold">Assignment</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <select className="input w-auto py-1.5 text-sm" value={s.assignedTo || ""} onChange={(e) => e.target.value && assign(e.target.value)} disabled={busy}>
                <option value="">Unassigned</option>
                {reviewers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <span className="text-xs text-faint">{s.assignedToName ? `Assigned to ${s.assignedToName}` : "Not assigned"}{s.assignedByName ? ` · by ${s.assignedByName}` : ""}</span>
            </div>
          </Card>

          {/* review actions */}
          <Card className="mt-4 p-4">
            <div className="text-sm font-semibold">Review</div>
            {terminal && <p className="mt-1 text-xs text-faint">This submission is {st?.label?.toLowerCase()}. Re-accepting will not pay twice (ledger is idempotent per submission).</p>}
            <textarea className="input mt-2 min-h-[64px] text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reviewer notes / rationale (shared with the tester on the decision)…" />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <label className="text-xs text-faint">Award override</label>
              <input className="input w-40 py-1.5 text-sm" inputMode="numeric" value={award} onChange={(e) => setAward(e.target.value.replace(/[^0-9]/g, ""))} placeholder={`${nfmt(s.weightPyrx)} default`} />
              <span className="text-xs text-faint">PYRX (blank = weight + on-time bonus)</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="primary" onClick={() => review("accept")} disabled={busy}>Accept → award</Button>
              <Button variant="danger" onClick={() => review("reject")} disabled={busy}>Reject</Button>
              <Button onClick={() => review("needs_more")} disabled={busy}>Request more info</Button>
            </div>
          </Card>

          {/* comment thread */}
          <div className="mt-5"><div className="label">Comments</div>
            <div className="mt-2 space-y-2">{comments.map((c: any) => <div key={c.id} className="rounded-lg border border-line p-2.5 text-sm"><div className="text-xs text-faint">{c.handle ? "@" + c.handle : c.display_name}{c.is_staff && <span className="ml-1 text-[color:var(--color-brand)]">· Admin</span>} · {dago(Number(c.created_at))}</div><div className="mt-0.5 whitespace-pre-wrap">{c.body}</div></div>)}{comments.length === 0 && <p className="text-xs text-faint">No comments yet.</p>}</div>
            <div className="mt-2 flex gap-2"><input className="input" value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addComment()} placeholder="Reply as PYRAX team…" /><Button onClick={addComment}>Send</Button></div>
          </div>
        </>; })()}
      </div>
    </div>
  );
}

/** Release-Readiness panel: per-app-version test COVERAGE % + a test×track pass/fail heatmap, computed
 *  from the raw tests + submissions. Coverage = share of a version's tests with ≥1 accepted submission. */
function ReleaseReadiness() {
  const [data, setData] = useState<{ tests: any[]; submissions: any[] } | null>(null);
  useEffect(() => { fetch("/api/devnet/tests/readiness").then((r) => r.json()).then((d) => { if (d.ok) setData({ tests: d.tests, submissions: d.submissions }); else setData({ tests: [], submissions: [] }); }).catch(() => setData({ tests: [], submissions: [] })); }, []);
  const view = useMemo(() => {
    if (!data) return null;
    const tests = data.tests;
    const subs = data.submissions;
    // Per test: accepted / rejected / pending submission counts (accepted ⇒ the test "passes").
    const perTest = new Map<string, { accepted: number; rejected: number; pending: number }>();
    for (const t of tests) perTest.set(t.id, { accepted: 0, rejected: 0, pending: 0 });
    for (const s of subs) {
      const b = perTest.get(s.testId); if (!b) continue;
      if (s.reviewStatus === "accepted") b.accepted++;
      else if (s.reviewStatus === "rejected") b.rejected++;
      else b.pending++;
    }
    // Coverage per app_version: fraction of that version's tests with ≥1 accepted submission.
    const byVersion = new Map<string, { total: number; covered: number }>();
    for (const t of tests) {
      const v = t.appVersion || "unversioned";
      const b = byVersion.get(v) || { total: 0, covered: 0 };
      b.total++; if ((perTest.get(t.id)?.accepted ?? 0) > 0) b.covered++;
      byVersion.set(v, b);
    }
    const versions = Array.from(byVersion.entries()).map(([version, v]) => ({ version, ...v, pct: v.total ? Math.round((v.covered / v.total) * 100) : 0 })).sort((a, b) => a.version.localeCompare(b.version));
    const tracks = Array.from(new Set(tests.map((t) => t.track)));
    return { tests, perTest, versions, tracks };
  }, [data]);

  if (!view) return <Card className="p-8 text-center text-sm text-muted">Loading…</Card>;
  if (view.tests.length === 0) return <Card className="p-8 text-center text-sm text-muted">No tests published yet.</Card>;
  const cellTone = (b: { accepted: number; rejected: number; pending: number }) =>
    b.accepted > 0 ? "border-[color:rgba(52,199,89,0.4)] bg-[rgba(52,199,89,0.12)] text-positive"
      : b.rejected > 0 ? "border-[color:rgba(255,69,58,0.4)] bg-[rgba(255,69,58,0.1)] text-[color:var(--color-negative)]"
        : b.pending > 0 ? "border-[color:rgba(245,134,34,0.4)] bg-[rgba(245,134,34,0.08)] text-gold"
          : "border-line bg-[rgba(5,6,9,0.4)] text-faint";
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="text-base font-bold">Coverage by app version</h3>
        <p className="text-xs text-muted">Share of each version's authored tests that have at least one accepted submission.</p>
        <div className="mt-3 space-y-2.5">{view.versions.map((v) => (
          <div key={v.version}>
            <div className="mb-1 flex items-center justify-between text-sm"><span className="font-medium">{v.version}</span><span className="text-faint">{v.covered}/{v.total} tests · {v.pct}%</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-[rgba(5,6,9,0.6)] border border-line"><div className="h-full flame-bar" style={{ width: `${v.pct}%` }} /></div>
          </div>
        ))}</div>
      </Card>
      {view.tracks.map((track) => (
        <Card key={track} className="p-5">
          <h3 className="text-base font-bold">{TRACK_LABEL[track] || track} — pass/fail heatmap</h3>
          <p className="text-xs text-muted">Green = an accepted submission exists · red = only rejections · amber = pending review · grey = no submissions.</p>
          <div className="mt-3 grid gap-1.5 sm:grid-cols-2">{view.tests.filter((t) => t.track === track).map((t) => { const b = view.perTest.get(t.id)!; return (
            <div key={t.id} className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs ${cellTone(b)}`}>
              <span className="truncate font-medium">{t.title}</span>
              <span className="shrink-0 tabular-nums">✓{b.accepted} ✕{b.rejected} •{b.pending}</span>
            </div>
          ); })}</div>
        </Card>
      ))}
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
          /* The Card OWNS the height (ChatRoom fills it via h-full). Sized to the portal chrome — the
             sticky header + main padding + this module's PageHeader — with `dvh` so mobile browser bars
             don't clip it, and a floor so it stays usable on short screens. */
          <Card className="overflow-hidden p-0" style={{ height: "calc(100dvh - 190px)", minHeight: 460 }}>
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
