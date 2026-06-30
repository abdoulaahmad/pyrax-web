// SPDX-License-Identifier: LicenseRef-Proprietary
import React, { useEffect, useState } from "react";
import { Card, Button, Badge, PageHeader, Icon, StatTile } from "./ui";
import { type AccessSubject } from "../lib/permissions";
import { LEDGER_LABELS, REWARDS, usd } from "../lib/rewards";

const fmt = (n: number) => n.toLocaleString("en-US");
const ago = (ms: number) => { const s = Math.floor((Date.now() - ms) / 1000); if (s < 60) return s + "s ago"; if (s < 3600) return Math.floor(s / 60) + "m ago"; if (s < 86400) return Math.floor(s / 3600) + "h ago"; return Math.floor(s / 86400) + "d ago"; };

function ComingSoon({ title, detail }: { title: string; detail: string }) {
  return (
    <Card className="p-10 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-line bg-[rgba(245,134,34,0.06)]">
        <svg viewBox="0 0 24 24" className="h-6 w-6 text-faint" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
      </div>
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">{detail}</p>
      <div className="mt-3"><Badge tone="warning">Coming online</Badge></div>
    </Card>
  );
}

/* ============================================================== Dashboard */
export function Dashboard({ onNavigate }: { onNavigate: (k: string) => void }) {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState("");
  const [pair, setPair] = useState<{ code: string; expiresInSec: number } | null>(null);
  const [pairBusy, setPairBusy] = useState(false);
  useEffect(() => { fetch("/api/dashboard").then((r) => r.json()).then((x) => { if (x?.ok) setD(x); else setErr("Couldn't load your dashboard."); }).catch(() => setErr("Network error.")); }, []);
  async function linkNode() { setPairBusy(true); try { const r = await (await fetch("/api/node/pair-code", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).json(); if (r.ok) setPair({ code: r.code, expiresInSec: r.expiresInSec }); } catch {} setPairBusy(false); }
  if (err) return <Card className="p-8 text-center text-sm text-[color:var(--color-negative)]">{err}</Card>;
  if (!d) return <Card className="p-10 text-center text-sm text-muted"><span className="mr-2 inline-block h-4 w-4 animate-spin-slow rounded-full border-2 border-line border-t-[color:var(--color-brand)] align-middle" />Loading…</Card>;

  const e = d.earnings;
  const tile = (label: string, value: React.ReactNode, sub: string, accent: any, icon: keyof typeof Icon) => <StatTile label={label} value={value} sub={sub} accent={accent} icon={React.createElement(Icon[icon], { className: "h-5 w-5 text-gold" })} />;

  return (
    <>
      <PageHeader title="Welcome, tester" subtitle={`${d.devnet.devnetName} · ${d.devnet.version} · chain ${d.devnet.chainId}`} />

      {d.foundingRank ? (
        <Card className="mb-4 flex items-center gap-3 border-[color:rgba(245,134,34,0.4)] p-4">
          <Icon.trophy className="h-6 w-6 text-gold" /><div><div className="font-bold">Founding Tester #{d.foundingRank}</div><div className="text-xs text-muted">You're one of the first to bring a node online. Thank you — your bonus is in your earnings.</div></div>
        </Card>
      ) : !d.online && (
        <Card className="mb-4 flex flex-col items-start gap-2 border-[color:rgba(245,134,34,0.3)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"><Icon.activity className="h-6 w-6 text-gold" /><div><div className="font-bold">Bring a node online</div><div className="text-xs text-muted">Download Inferno or the CLI and connect — the first 10 testers to connect earn a Founding Tester title.</div></div></div>
          <Button variant="primary" onClick={() => onNavigate("downloads")}>Get the app</Button>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tile("Node status", d.online ? "Online" : "Offline", d.nodes.length ? `${d.nodes.length} node${d.nodes.length > 1 ? "s" : ""} linked` : "no nodes yet", d.online ? "positive" : "brand", "activity")}
        {tile("Uptime (30d)", d.uptime + "%", "best node", "water", "grid")}
        {e.rewardEligible
          ? tile("Earnings", fmt(e.totalPyrx) + " PYRX", "≈ $" + e.totalUsd.toLocaleString("en-US"), "brand", "trophy")
          : tile("Earnings", "—", "staff · not eligible", "brand", "trophy")}
        {tile("Leaderboard", d.rank ? "#" + d.rank : "—", e.rewardEligible ? "your rank" : "staff", "positive", "trophy")}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between"><h3 className="text-base font-bold">Your nodes</h3><Button onClick={linkNode} disabled={pairBusy}>{pairBusy ? "…" : "+ Link a node"}</Button></div>
          {pair && (
            <div className="mt-3 rounded-xl border border-[color:rgba(245,134,34,0.4)] bg-[rgba(245,134,34,0.06)] p-4 text-center">
              <div className="text-xs uppercase tracking-wider text-faint">Enter this code in Inferno or the CLI to link your node</div>
              <div className="mt-1 font-mono text-3xl font-extrabold tracking-[0.3em] text-gold">{pair.code}</div>
              <div className="mt-1 text-xs text-faint">Expires in {Math.max(1, Math.floor(pair.expiresInSec / 60))} min</div>
            </div>
          )}
          {d.nodes.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">No nodes linked yet. Connect Inferno or the CLI to your account to start tracking uptime.<div className="mt-3"><Button variant="primary" onClick={() => onNavigate("downloads")}>Download the app</Button></div></div>
          ) : (
            <div className="mt-3 space-y-2">
              {d.nodes.map((n: any) => (
                <div key={n.node_pk} className="flex items-center justify-between rounded-lg border border-line p-3">
                  <div className="flex items-center gap-3"><span className={`h-2.5 w-2.5 rounded-full ${n.online ? "bg-[color:var(--color-positive)]" : "bg-faint"}`} /><div><div className="text-sm font-semibold">{n.label || n.node_pk.slice(0, 10)} <span className="text-xs font-normal text-faint">· {n.app || "node"}</span></div><div className="text-xs text-faint">v{n.app_version || "?"} · height {n.height ?? "—"} · {n.peers ?? 0} peers</div></div></div>
                  <div className="text-right text-xs text-faint">{n.online ? <Badge tone="positive">Online</Badge> : <span>seen {ago(Number(n.last_heartbeat))}</span>}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-base font-bold">Earnings</h3>
          {e.rewardEligible ? (
            <>
              <div className="mt-2 text-3xl font-extrabold flame-text">{fmt(e.totalPyrx)}</div>
              <div className="text-xs text-faint">PYRX accrued · ≈ ${e.totalUsd.toLocaleString("en-US")} · paid via mainnet airdrop</div>
              <div className="mt-3 flex items-center gap-2"><span className="chip" style={{ borderColor: e.tier.color, color: e.tier.color }}>{e.tier.label} tier</span>{e.projectedUptimePyrx > 0 && <span className="text-xs text-muted">+{fmt(e.projectedUptimePyrx)} PYRX/mo at current uptime</span>}</div>
              <div className="mt-4 space-y-1.5">
                {e.ledger.length === 0 ? <p className="text-xs text-faint">No earnings yet — connect a node + file reports to start.</p> :
                  e.ledger.slice(0, 6).map((l: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs"><span className="text-muted">{LEDGER_LABELS[l.reason as keyof typeof LEDGER_LABELS] || l.reason}{l.note ? ` · ${l.note}` : ""}</span><span className={`font-mono ${l.pyrx >= 0 ? "text-[color:var(--color-positive)]" : "text-[color:var(--color-negative)]"}`}>{l.pyrx >= 0 ? "+" : ""}{fmt(l.pyrx)}</span></div>
                  ))}
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted">You're signed in as <span className="text-ink">staff</span>, so you can test everything — but staff accounts don't accrue tester rewards.</p>
          )}
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <h3 className="text-base font-bold">Top testers</h3>
        <div className="mt-3 space-y-1">
          {(d.leaderboardTop || []).map((t: any, i: number) => (
            <div key={t.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm odd:bg-[rgba(255,255,255,0.02)]">
              <div className="flex items-center gap-3"><span className="w-6 text-center font-mono text-faint">{i + 1}</span><span className="font-medium">{t.handle ? "@" + t.handle : t.display_name}</span>{t.founding_rank && <Icon.trophy className="h-3.5 w-3.5 text-gold" />}</div>
              <span className="font-mono text-muted">{fmt(Number(t.total))} PYRX</span>
            </div>
          ))}
          {(!d.leaderboardTop || d.leaderboardTop.length === 0) && <p className="text-xs text-faint">No ranked testers yet — be the first.</p>}
        </div>
      </Card>
    </>
  );
}

/* ============================================================== Downloads (admin-gated) */
export function Downloads() {
  const [d, setD] = useState<any>(null);
  useEffect(() => { fetch("/api/dashboard").then((r) => r.json()).then((x) => x?.ok && setD(x.devnet)).catch(() => {}); }, []);
  if (!d) return <Card className="p-10 text-center text-sm text-muted"><span className="mr-2 inline-block h-4 w-4 animate-spin-slow rounded-full border-2 border-line border-t-[color:var(--color-brand)] align-middle" />Loading…</Card>;
  if (!d.downloadsOpen) {
    return (
      <>
        <PageHeader title="Downloads" subtitle="Get the Inferno app or the CLI node tool." />
        <Card className="p-10 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[rgba(215,84,39,0.12)] text-[color:var(--color-ember)]"><Icon.shield className="h-6 w-6" /></div>
          <p className="mt-4 text-lg font-bold">Downloads are closed</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">{d.downloadsClosedMessage}</p>
          <div className="mt-3"><Badge tone="warning">Disabled by admin</Badge></div>
        </Card>
      </>
    );
  }
  return (
    <>
      <PageHeader title="Downloads" subtitle="Get the Inferno app or the CLI node tool, then connect it to your account." />
      <div className="grid gap-4 sm:grid-cols-2">
        {(d.downloads || []).map((it: any, i: number) => (
          <Card key={i} className="flex items-center justify-between p-5">
            <div><div className="text-base font-bold">{it.name}</div><div className="text-xs text-faint">{it.platform}{it.note ? ` · ${it.note}` : ""}</div></div>
            <a className="btn btn-primary" href={it.url} target="_blank" rel="noreferrer"><Icon.download className="h-4 w-4" /> Download</a>
          </Card>
        ))}
      </div>
      <Card className="mt-4 p-5 text-sm text-muted">After installing, sign in to the app with this portal to link your node — uptime then tracks here automatically.</Card>
    </>
  );
}

/* ============================================================== Leaderboard */
export function Leaderboard({ me }: { me: any }) {
  const [d, setD] = useState<any>(null);
  useEffect(() => { fetch("/api/dashboard").then((r) => r.json()).then((x) => x?.ok && setD(x)).catch(() => {}); }, []);
  return (
    <>
      <PageHeader title="Leaderboard" subtitle="Top testers by accrued PYRX. Staff are excluded." />
      {!d ? <Card className="p-10 text-center text-sm text-muted">Loading…</Card> : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-line">
            {(d.leaderboardTop || []).map((t: any, i: number) => (
              <div key={t.id} className={`flex items-center justify-between px-4 py-3 text-sm ${t.id === me.id ? "bg-[rgba(245,134,34,0.08)]" : ""}`}>
                <div className="flex items-center gap-3"><span className="w-7 text-center font-mono text-faint">{i + 1}</span><span className="font-semibold">{t.handle ? "@" + t.handle : t.display_name}</span>{t.founding_rank && <Badge tone="brand">Founding #{t.founding_rank}</Badge>}{t.id === me.id && <span className="text-xs text-faint">you</span>}</div>
                <span className="font-mono text-muted">{fmt(Number(t.total))} PYRX</span>
              </div>
            ))}
            {(!d.leaderboardTop || d.leaderboardTop.length === 0) && <div className="p-6 text-center text-sm text-faint">No ranked testers yet.</div>}
          </div>
        </Card>
      )}
      {d?.rank && <p className="mt-3 text-center text-sm text-muted">You're <span className="text-ink">#{d.rank}</span>.</p>}
    </>
  );
}

/* ============================================================== Settings */
export function Settings({ me, onSaved }: { me: any; onSaved: (t: any) => void }) {
  const [displayName, setDisplayName] = useState(me.displayName || "");
  const [wallet, setWallet] = useState(me.payoutWallet || "");
  const [days, setDays] = useState(me.sessionMaxDays || 7);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});
  async function save() {
    setBusy(true); setSaved(false); setErrs({});
    try {
      const res = await fetch("/api/me", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ displayName, payoutWallet: wallet, sessionMaxDays: days }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) { setErrs(data.errors || { _: data.error || "Couldn't save." }); setBusy(false); return; }
      onSaved(data.tester); setSaved(true);
    } catch { setErrs({ _: "Network error." }); }
    setBusy(false);
  }
  return (
    <>
      <PageHeader title="Settings" subtitle="Your tester account." />
      <Card className="max-w-xl p-5">
        <div className="grid gap-3">
          <div><label className="label">Email</label><input className="input opacity-60" value={me.email} readOnly /></div>
          <div><label className="label">Chat handle <span className="font-normal text-faint">(Telegram · set by admin)</span></label><input className="input opacity-60" value={me.handle ? "@" + me.handle : "—"} readOnly /></div>
          <div><label className="label">Display name</label><input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />{errs.displayName && <p className="mt-1 text-xs text-[color:var(--color-negative)]">{errs.displayName}</p>}</div>
          <div><label className="label">PYRAX payout address <span className="font-normal text-faint">(for the airdrop)</span></label><input className="input font-mono text-sm" value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder="0x…" />{errs.payoutWallet && <p className="mt-1 text-xs text-[color:var(--color-negative)]">{errs.payoutWallet}</p>}</div>
          <div><label className="label">Keep me signed in for</label><select className="input" value={days} onChange={(e) => setDays(Number(e.target.value))}>{[1, 2, 3, 5, 7].map((x) => <option key={x} value={x}>{x} day{x > 1 ? "s" : ""}</option>)}</select><p className="mt-1 text-xs text-faint">Max 7 days. Changes apply next time you sign in.</p></div>
        </div>
        {errs._ && <p className="mt-3 text-sm text-[color:var(--color-negative)]">{errs._}</p>}
        <div className="mt-5 flex items-center gap-3"><Button variant="primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>{saved && <span className="text-sm text-[color:var(--color-positive)]">Saved ✓</span>}</div>
      </Card>
    </>
  );
}

/* ============================================================== Placeholders (built next) */
export function IssueCouncil(_: { me: any; subject: AccessSubject }) {
  return <><PageHeader title="Issue Council" subtitle="Report bugs, add reproduction steps, attach logs/video, and confirm others' reports." /><ComingSoon title="The Issue Council is being wired up" detail="You'll file bugs with repro steps + attachments, confirm/upvote others' reports, and track them New → Confirmed → Fixed → Verified. Bug bounties pay out here." /></>;
}
export function Chat(_: { me: any }) {
  return <><PageHeader title="Chat" subtitle="Realtime tester community chat." /><ComingSoon title="Realtime chat is being wired up" detail="A WebSocket community chat with @mentions, emojis + GIFs — shared with the PYRAX team (who appear as Admins). Your username is your Telegram handle." /></>;
}
export function Releases(_: { subject: AccessSubject }) {
  return <><PageHeader title="Releases" subtitle="Latest devnet builds + changelog." /><ComingSoon title="Release feed is being wired up" detail="New builds appear here with changelog + download, and you'll get a browser push + email the moment one drops." /></>;
}
export function Triage(_: { subject: AccessSubject }) {
  return <><PageHeader title="Triage" subtitle="Staff: triage bug reports + award bounties." /><ComingSoon title="Triage tools are being wired up" detail="Set severity/status, link duplicates, and award bug bounties to testers." /></>;
}
export function Testers(_: { subject: AccessSubject }) {
  return <><PageHeader title="Testers" subtitle="Staff: tester roster, uptime + earnings." /><ComingSoon title="Tester admin is being wired up" detail="The roster, uptime + earnings overview, and eligibility controls live here." /></>;
}
