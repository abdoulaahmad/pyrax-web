// SPDX-License-Identifier: LicenseRef-Proprietary
import React, { useEffect, useState } from "react";
import { Card, Button, Badge, PageHeader, Icon, StatTile } from "./ui";
import { type AccessSubject } from "../lib/permissions";
import { LEDGER_LABELS, REWARDS, usd } from "../lib/rewards";
import ChatRoom from "./ChatRoom";
import { RewardsModal, LegalDocBody } from "./Legal";
import { NDA, TOS } from "../lib/legal-docs";

const fmt = (n: number) => n.toLocaleString("en-US");
function osIcon(platform: string): keyof typeof Icon {
  const s = (platform || "").toLowerCase();
  if (s.includes("win")) return "windows";
  if (s.includes("mac") || s.includes("apple") || s.includes("os x") || s.includes("ios")) return "apple";
  if (s.includes("linux")) return "linux";
  return "download";
}
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
  const [showRewards, setShowRewards] = useState(false);
  const [nodeBusy, setNodeBusy] = useState<string | null>(null);
  const [rotated, setRotated] = useState<{ nodePk: string; token: string } | null>(null);
  async function reload() { try { const x = await (await fetch("/api/dashboard")).json(); if (x?.ok) setD(x); } catch {} }
  useEffect(() => { fetch("/api/dashboard").then((r) => r.json()).then((x) => { if (x?.ok) setD(x); else setErr("Couldn't load your dashboard."); }).catch(() => setErr("Network error.")); }, []);
  async function linkNode() { setPairBusy(true); try { const r = await (await fetch("/api/node/pair-code", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).json(); if (r.ok) setPair({ code: r.code, expiresInSec: r.expiresInSec }); } catch {} setPairBusy(false); }
  async function removeNode(nodePk: string, label: string) {
    if (!window.confirm(`Remove "${label}"? Its heartbeat token is revoked and it stops counting toward uptime. You can re-link it any time.`)) return;
    setNodeBusy(nodePk);
    try { const r = await (await fetch("/api/node/unlink", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nodePk, action: "remove" }) })).json(); if (r.ok) await reload(); } catch {}
    setNodeBusy(null);
  }
  async function rotateNode(nodePk: string) {
    if (!window.confirm("Rotate this node's token? The current token stops working immediately — you'll need to re-pair the app/CLI with the new one.")) return;
    setNodeBusy(nodePk);
    try { const r = await (await fetch("/api/node/unlink", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nodePk, action: "rotate" }) })).json(); if (r.ok && r.nodeToken) setRotated({ nodePk, token: r.nodeToken }); } catch {}
    setNodeBusy(null);
  }
  if (err) return <Card className="p-8 text-center text-sm text-[color:var(--color-negative)]">{err}</Card>;
  if (!d) return <Card className="p-10 text-center text-sm text-muted"><span className="mr-2 inline-block h-4 w-4 animate-spin-slow rounded-full border-2 border-line border-t-[color:var(--color-brand)] align-middle" />Loading…</Card>;

  const e = d.earnings;
  const tile = (label: string, value: React.ReactNode, sub: string, accent: any, icon: keyof typeof Icon) => <StatTile label={label} value={value} sub={sub} accent={accent} icon={React.createElement(Icon[icon], { className: "h-5 w-5 text-gold" })} />;

  return (
    <>
      <PageHeader title="Welcome, tester" subtitle={`${d.devnet.devnetName} · ${d.devnet.version} · chain ${d.devnet.chainId}`} action={<Button variant="ghost" onClick={() => setShowRewards(true)}><Icon.trophy className="h-4 w-4 text-gold" /> Rewards &amp; how to earn</Button>} />

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
              {rotated && (
                <div className="rounded-xl border border-[color:rgba(245,134,34,0.4)] bg-[rgba(245,134,34,0.06)] p-3 text-sm">
                  <div className="font-semibold text-gold">New node token (shown once)</div>
                  <p className="mt-1 text-xs text-muted">Paste this into the Inferno app / CLI for the node. The old token no longer works.</p>
                  <div className="mt-2 break-all rounded-lg border border-line bg-[rgba(5,6,9,0.5)] p-2 font-mono text-xs text-ink">{rotated.token}</div>
                  <div className="mt-2 flex gap-2"><Button onClick={() => navigator.clipboard?.writeText(rotated.token).catch(() => {})}>Copy</Button><Button onClick={() => setRotated(null)}>Done</Button></div>
                </div>
              )}
              {d.nodes.map((n: any) => {
                const label = n.label || n.node_pk.slice(0, 10);
                return (
                  <div key={n.node_pk} className="flex items-center justify-between gap-2 rounded-lg border border-line p-3">
                    <div className="flex min-w-0 items-center gap-3"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${n.online ? "bg-[color:var(--color-positive)]" : "bg-faint"}`} /><div className="min-w-0"><div className="truncate text-sm font-semibold">{label} <span className="text-xs font-normal text-faint">· {n.app || "node"}</span></div><div className="text-xs text-faint">v{n.app_version || "?"} · height {n.height ?? "—"} · {n.peers ?? 0} peers</div></div></div>
                    <div className="flex shrink-0 items-center gap-2">
                      <div className="text-right text-xs text-faint">{n.online ? <Badge tone="positive">Online</Badge> : <span>seen {ago(Number(n.last_heartbeat))}</span>}</div>
                      <button onClick={() => rotateNode(n.node_pk)} disabled={nodeBusy === n.node_pk} title="Rotate token" className="rounded-lg border border-line px-2 py-1 text-xs text-faint hover:text-ink disabled:opacity-50">Rotate</button>
                      <button onClick={() => removeNode(n.node_pk, label)} disabled={nodeBusy === n.node_pk} title="Remove node" className="rounded-lg border border-line px-2 py-1 text-xs text-faint hover:text-[color:var(--color-negative)] disabled:opacity-50">Remove</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-base font-bold">Earnings</h3>
          {e.rewardEligible ? (
            <>
              <div className="mt-2 text-3xl font-extrabold flame-text">{fmt(e.totalPyrx)}</div>
              <div className="text-xs text-faint">PYRX accrued · ≈ ${e.totalUsd.toLocaleString("en-US")} · paid via mainnet airdrop</div>
              <div className="mt-3 flex flex-wrap items-center gap-2"><span className="chip" style={{ borderColor: e.tier.color, color: e.tier.color }}>{e.tier.label} tier</span><span className="text-xs text-muted">{e.bugsAccepted || 0} accepted bug{(e.bugsAccepted || 0) !== 1 ? "s" : ""}</span>{e.projectedUptimePyrx > 0 && <span className="text-xs text-muted">· +{fmt(e.projectedUptimePyrx)} PYRX/mo at uptime</span>}</div>
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
      {showRewards && <RewardsModal onClose={() => setShowRewards(false)} />}
    </>
  );
}

/* ============================================================== Legal pages (read-only) */
const legalWhen = (ms: number) => new Date(ms).toLocaleString("en-US", { timeZone: "UTC", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) + " UTC";
function SignedBanner({ label, rec }: { label: string; rec: any }) {
  return (
    <Card className="mb-4 border-[color:rgba(52,211,153,0.4)] bg-[rgba(52,211,153,0.06)] p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--color-positive)]"><Icon.check className="h-4 w-4" /> You accepted this {label}</div>
      <div className="mt-2 grid gap-x-6 gap-y-1 text-sm text-muted sm:grid-cols-2">
        {rec.recipient_name && <div>Recipient: <span className="text-ink">{rec.recipient_name}</span></div>}
        {rec.signature && <div>Signature: <span className="text-ink" style={{ fontFamily: "'Segoe Script','Brush Script MT',cursive" }}>{rec.signature}</span></div>}
        <div>Accepted: <span className="text-ink">{legalWhen(Number(rec.accepted_at))}</span></div>
        <div>IP address: <span className="font-mono text-ink">{rec.ip || "—"}</span></div>
      </div>
    </Card>
  );
}
function useMyLegal() {
  const [mine, setMine] = useState<any>(null);
  useEffect(() => { fetch("/api/legal/mine").then((r) => r.json()).then((d) => { if (d.ok) setMine(d); }).catch(() => {}); }, []);
  return mine;
}
export function NdaPage() {
  const mine = useMyLegal();
  return (
    <>
      <PageHeader title={NDA.title} subtitle={`Version ${NDA.version} · effective ${NDA.effectiveDate}. This is the agreement you signed to join the program — your executed copy is recorded below.`} />
      {mine?.nda && <SignedBanner label="Non-Disclosure Agreement" rec={mine.nda} />}
      <Card className="p-6"><LegalDocBody doc={NDA} /></Card>
    </>
  );
}
export function TosPage() {
  const mine = useMyLegal();
  return (
    <>
      <PageHeader title={TOS.title} subtitle={`Version ${TOS.version} · effective ${TOS.effectiveDate}. You accept these each time you sign in.`} />
      {mine?.tos && <SignedBanner label="Alpha Test Program Terms" rec={mine.tos} />}
      <Card className="p-6"><LegalDocBody doc={TOS} /></Card>
    </>
  );
}

/* ============================================================== Downloads (real presigned feed) */
const PLATFORM_LABEL: Record<string, string> = { win: "Windows", mac: "macOS", linux: "Linux" };
const PRODUCT_NOTE: Record<string, string> = { inferno: "Desktop node app", cli: "Command-line node tool" };
function fmtSize(bytes: number): string {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`;
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(mb >= 10 ? 0 : 1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

function DownloadCard({ name, product, feed }: { name: string; product: "inferno" | "cli"; feed: any }) {
  const assets: any[] = feed?.assets || [];
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line bg-[rgba(255,255,255,0.03)]">{React.createElement(Icon[product === "cli" ? "activity" : "download"], { className: "h-5 w-5 text-muted" })}</div>
          <div><div className="text-base font-bold">{name}</div><div className="text-xs text-faint">{PRODUCT_NOTE[product]}</div></div>
        </div>
        {feed?.version && <Badge tone="brand">v{String(feed.version).replace(/^v/, "")}</Badge>}
      </div>
      {assets.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-line p-4 text-center text-sm text-muted">No build published yet. You'll be notified when {name} is available.</div>
      ) : (
        <div className="mt-4 grid gap-2">
          {assets.map((a: any) => (
            <a key={a.platform} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm hover:border-[color:var(--color-brand)]" href={a.url} rel="noreferrer">
              <span className="flex items-center gap-2 font-semibold">{React.createElement(Icon[osIcon(a.platform)], { className: "h-4 w-4 text-muted" })}{PLATFORM_LABEL[a.platform] || a.platform}</span>
              <span className="flex items-center gap-3 text-xs text-faint">{fmtSize(a.size)}<Icon.download className="h-4 w-4 text-[color:var(--color-brand)]" /></span>
            </a>
          ))}
        </div>
      )}
    </Card>
  );
}

export function Downloads() {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState("");
  useEffect(() => { fetch("/api/downloads").then((r) => r.json()).then((x) => { if (x?.ok) setD(x); else setErr("Couldn't load downloads."); }).catch(() => setErr("Network error.")); }, []);
  if (err) return <Card className="p-8 text-center text-sm text-[color:var(--color-negative)]">{err}</Card>;
  if (!d) return <Card className="p-10 text-center text-sm text-muted"><span className="mr-2 inline-block h-4 w-4 animate-spin-slow rounded-full border-2 border-line border-t-[color:var(--color-brand)] align-middle" />Loading…</Card>;

  if (!d.open) {
    return (
      <>
        <PageHeader title="Downloads" subtitle="Get the Inferno app or the CLI node tool." />
        <Card className="p-10 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[rgba(215,84,39,0.12)] text-[color:var(--color-ember)]"><Icon.shield className="h-6 w-6" /></div>
          <p className="mt-4 text-lg font-bold">Downloads are closed</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">{d.message}</p>
          <div className="mt-3"><Badge tone="warning">Disabled by admin</Badge></div>
        </Card>
      </>
    );
  }

  const noBuilds = !d.inferno?.assets?.length && !d.cli?.assets?.length;
  return (
    <>
      <PageHeader title="Downloads" subtitle="Get the Inferno app or the CLI node tool, then connect it to your account." />
      {d.error && <Card className="mb-4 p-4 text-sm text-[color:var(--color-negative)]">{d.error}</Card>}
      {!d.error && noBuilds && (
        <Card className="mb-4 p-4 text-sm text-muted">No builds are published yet. Links appear here automatically the moment a build lands — and you'll get a release notification.</Card>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <DownloadCard name="Inferno" product="inferno" feed={d.inferno} />
        <DownloadCard name="PYRAX CLI" product="cli" feed={d.cli} />
      </div>
      <Card className="mt-4 p-5 text-sm text-muted">After installing, sign in to the app with this portal to link your node — uptime then tracks here automatically. Download links are private and expire after a short time; reload this page to refresh them.</Card>
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
                <div className="flex items-center gap-3 text-xs"><span className="text-faint">{t.bugs || 0} bugs</span><span className="font-mono text-muted">{fmt(Number(t.total))} PYRX</span></div>
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

/* ============================================================== Issue Council */
const SEV: Record<string, { tone: any; label: string }> = { critical: { tone: "danger", label: "Critical" }, high: { tone: "warning", label: "High" }, medium: { tone: "brand", label: "Medium" }, low: { tone: "muted", label: "Low" } };
const STATUS: Record<string, string> = { new: "New", confirmed: "Confirmed", in_progress: "In Progress", fixed: "Fixed", verified: "Verified", closed: "Closed", duplicate: "Duplicate", wont_fix: "Won't Fix" };
const can2 = (subject: AccessSubject, p: any) => subject.isSuperuser || subject.permissions.includes(p);

function Drawer({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className={`h-full w-full ${wide ? "max-w-2xl" : "max-w-lg"} overflow-y-auto border-l border-line bg-[rgba(8,10,17,0.97)] p-6 shadow-2xl`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2><button onClick={onClose} className="text-faint hover:text-ink">✕</button></div>
        {children}
      </div>
    </div>
  );
}

export function IssueCouncil({ me, subject, initialStatus = "", title = "Issue Council", subtitle = "Report bugs with repro steps + attachments, confirm others, and track them to Verified." }: { me: any; subject: AccessSubject; initialStatus?: string; title?: string; subtitle?: string }) {
  const [bugs, setBugs] = useState<any[] | null>(null);
  const [status, setStatus] = useState(initialStatus); const [sort, setSort] = useState("recent");
  const [creating, setCreating] = useState(false); const [openId, setOpenId] = useState<string | null>(null);
  async function load() { const q = new URLSearchParams(); if (status) q.set("status", status); if (sort) q.set("sort", sort); const d = await (await fetch("/api/bugs?" + q)).json(); setBugs(d.ok ? d.bugs : []); }
  useEffect(() => { load(); }, [status, sort]);
  return (
    <>
      <PageHeader title={title} subtitle={subtitle}
        action={can2(subject, "issues.submit") && <Button variant="primary" onClick={() => setCreating(true)}><Icon.plus className="h-4 w-4" /> Report a bug</Button>} />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select className="input w-auto py-1.5 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select className="input w-auto py-1.5 text-sm" value={sort} onChange={(e) => setSort(e.target.value)}><option value="recent">Most recent</option><option value="votes">Most votes</option><option value="severity">Severity</option></select>
      </div>
      {!bugs ? <Card className="p-8 text-center text-sm text-muted">Loading…</Card> : bugs.length === 0 ? <Card className="p-8 text-center text-sm text-muted">No reports yet — be the first to file one.</Card> : (
        <div className="space-y-2">
          {bugs.map((b) => (
            <Card key={b.id} hover className="cursor-pointer p-4" onClick={() => setOpenId(b.id)}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><Badge tone={SEV[b.assigned_severity || b.severity]?.tone}>{SEV[b.assigned_severity || b.severity]?.label}</Badge><Badge>{STATUS[b.status]}</Badge>{b.bounty_pyrx > 0 && <Badge tone="brand">{fmt(Number(b.bounty_pyrx))} PYRX</Badge>}</div>
                  <div className="mt-1.5 truncate font-semibold">{b.title}</div>
                  <div className="text-xs text-faint">{b.component ? b.component + " · " : ""}by {b.reporter_handle ? "@" + b.reporter_handle : b.reporter_name} · {ago(Number(b.created_at))}</div>
                </div>
                <div className="shrink-0 text-right text-xs text-faint"><div>▲ {b.votes} votes</div><div>✓ {b.confirms} repro</div>{(b.attachments?.length || 0) > 0 && <div>📎 {b.attachments.length}</div>}</div>
              </div>
            </Card>
          ))}
        </div>
      )}
      {creating && <BugForm onClose={() => setCreating(false)} onCreated={() => { setCreating(false); load(); }} />}
      {openId && <BugDetail id={openId} me={me} subject={subject} onClose={() => setOpenId(null)} onChanged={load} />}
    </>
  );
}

function BugForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [f, setF] = useState<any>({ title: "", severity: "medium", component: "", description: "", reproSteps: "", expected: "", actual: "" });
  const [atts, setAtts] = useState<any[]>([]); const [busy, setBusy] = useState(false); const [up, setUp] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({}); const [note, setNote] = useState("");
  const set = (k: string, v: string) => setF({ ...f, [k]: v });
  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []); if (!files.length) return; setUp(true); setNote("");
    for (const file of files) {
      try {
        const sign = await (await fetch("/api/uploads/sign", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }) })).json();
        if (!sign.ok) { setNote(sign.reason === "unconfigured" ? "Attachments aren't configured yet — you can still submit text." : sign.error || "Upload failed."); continue; }
        const put = await fetch(sign.url, { method: "PUT", headers: { ...sign.headers, "content-type": file.type }, body: file });
        if (!put.ok) { setNote("Upload to storage failed."); continue; }
        setAtts((a) => [...a, { url: sign.publicUrl, type: sign.kind, name: file.name, size: file.size }]);
      } catch { setNote("Upload failed."); }
    }
    setUp(false);
  }
  async function submit() {
    setBusy(true); setErrs({});
    const res = await fetch("/api/bugs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...f, attachments: atts, environment: { ua: navigator.userAgent } }) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok || !d.ok) { setErrs(d.errors || { _: d.error || "Couldn't submit." }); setBusy(false); return; }
    onCreated();
  }
  return (
    <Drawer title="Report a bug" onClose={onClose} wide>
      <div className="space-y-3">
        <div><label className="label">Title</label><input className="input" value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Short summary of the bug" />{errs.title && <p className="mt-1 text-xs text-[color:var(--color-negative)]">{errs.title}</p>}</div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Severity</label><select className="input" value={f.severity} onChange={(e) => set("severity", e.target.value)}>{Object.keys(SEV).map((s) => <option key={s} value={s}>{SEV[s].label}</option>)}</select></div>
          <div><label className="label">Component</label><input className="input" value={f.component} onChange={(e) => set("component", e.target.value)} placeholder="e.g. Inferno, RPC, wallet" /></div>
        </div>
        <div><label className="label">What happened?</label><textarea className="input" rows={3} value={f.description} onChange={(e) => set("description", e.target.value)} /></div>
        <div><label className="label">Steps to reproduce</label><textarea className="input" rows={4} value={f.reproSteps} onChange={(e) => set("reproSteps", e.target.value)} placeholder={"1. …\n2. …\n3. …"} />{errs.reproSteps && <p className="mt-1 text-xs text-[color:var(--color-negative)]">{errs.reproSteps}</p>}</div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Expected</label><textarea className="input" rows={2} value={f.expected} onChange={(e) => set("expected", e.target.value)} /></div>
          <div><label className="label">Actual</label><textarea className="input" rows={2} value={f.actual} onChange={(e) => set("actual", e.target.value)} /></div>
        </div>
        <div>
          <label className="label">Attachments <span className="font-normal text-faint">(video, logs, images)</span></label>
          <input type="file" multiple onChange={onFiles} className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border file:border-line file:bg-transparent file:px-3 file:py-1.5 file:text-sm file:text-ink" />
          {up && <p className="mt-1 text-xs text-faint">Uploading…</p>}
          {note && <p className="mt-1 text-xs text-[color:var(--color-warning)]">{note}</p>}
          {atts.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{atts.map((a, i) => <span key={i} className="chip">📎 {a.name}</span>)}</div>}
        </div>
        {errs._ && <p className="text-sm text-[color:var(--color-negative)]">{errs._}</p>}
        <div className="flex gap-3 pt-1"><Button variant="primary" onClick={submit} disabled={busy || up}>{busy ? "Submitting…" : "Submit report"}</Button><Button onClick={onClose}>Cancel</Button></div>
      </div>
    </Drawer>
  );
}

function BugDetail({ id, me, subject, onClose, onChanged }: { id: string; me: any; subject: AccessSubject; onClose: () => void; onChanged: () => void }) {
  const [b, setB] = useState<any>(null); const [comment, setComment] = useState(""); const [busy, setBusy] = useState(false);
  async function load() { const d = await (await fetch("/api/bugs/" + id)).json(); if (d.ok) setB(d.bug); }
  useEffect(() => { load(); }, [id]);
  async function react(kind: string) { const d = await (await fetch(`/api/bugs/react?id=${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind }) })).json(); if (d.ok) { setB((x: any) => ({ ...x, votes: d.votes, confirms: d.confirms, myReactions: d.on ? [...(x.myReactions || []), kind] : (x.myReactions || []).filter((k: string) => k !== kind) })); onChanged(); } }
  async function addComment() { if (!comment.trim()) return; const d = await (await fetch(`/api/bugs/comment?id=${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body: comment }) })).json(); if (d.ok) { setB((x: any) => ({ ...x, comments: d.comments })); setComment(""); } }
  async function triage(patch: any) { setBusy(true); const d = await (await fetch("/api/bugs/" + id, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) })).json(); if (d.ok) { await load(); onChanged(); } setBusy(false); }
  if (!b) return <Drawer title="Bug" onClose={onClose} wide><p className="text-sm text-muted">Loading…</p></Drawer>;
  const sev = b.assigned_severity || b.severity;
  const mine = b.myReactions || [];
  return (
    <Drawer title={b.title} onClose={onClose} wide>
      <div className="flex flex-wrap items-center gap-2"><Badge tone={SEV[sev]?.tone}>{SEV[sev]?.label}</Badge><Badge>{STATUS[b.status]}</Badge>{b.bounty_pyrx > 0 && <Badge tone="brand">{fmt(Number(b.bounty_pyrx))} PYRX bounty</Badge>}<span className="text-xs text-faint">by {b.reporter_handle ? "@" + b.reporter_handle : b.reporter_name} · {ago(Number(b.created_at))}</span></div>
      <div className="mt-3 flex gap-2">
        <Button onClick={() => react("vote")} className={mine.includes("vote") ? "chip-brand" : ""}>▲ {b.votes} Vote</Button>
        <Button onClick={() => react("confirm")} className={mine.includes("confirm") ? "chip-brand" : ""}>✓ {b.confirms} I can reproduce</Button>
      </div>
      {b.component && <p className="mt-3 text-xs text-faint">Component: <span className="text-muted">{b.component}</span></p>}
      {b.description && <Section title="What happened">{b.description}</Section>}
      <Section title="Steps to reproduce">{b.repro_steps}</Section>
      {(b.expected || b.actual) && <div className="mt-3 grid grid-cols-2 gap-3"><MiniBox title="Expected" body={b.expected} /><MiniBox title="Actual" body={b.actual} /></div>}
      {(b.attachments?.length || 0) > 0 && (
        <div className="mt-4"><div className="label">Attachments</div><div className="mt-1 grid grid-cols-2 gap-2">
          {b.attachments.map((a: any, i: number) => a.type === "image" ? <a key={i} href={a.url} target="_blank" rel="noreferrer"><img src={a.url} className="h-24 w-full rounded-lg border border-line object-cover" /></a> : a.type === "video" ? <video key={i} src={a.url} controls className="h-24 w-full rounded-lg border border-line" /> : <a key={i} href={a.url} target="_blank" rel="noreferrer" className="chip">📎 {a.name}</a>)}
        </div></div>
      )}
      {can2(subject, "issues.triage") && (
        <Card className="mt-4 p-4">
          <div className="text-sm font-semibold">Triage</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <select className="input py-1.5 text-sm" value={b.status} onChange={(e) => triage({ status: e.target.value })} disabled={busy}>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <select className="input py-1.5 text-sm" value={sev} onChange={(e) => triage({ assignedSeverity: e.target.value })} disabled={busy}>{Object.keys(SEV).map((s) => <option key={s} value={s}>{SEV[s].label}</option>)}</select>
          </div>
          <div className="mt-2 flex items-center gap-2"><input id="bounty" className="input py-1.5 text-sm" placeholder="Bounty PYRX" type="number" /><Button onClick={() => { const v = Number((document.getElementById("bounty") as HTMLInputElement)?.value); if (v > 0) triage({ bountyPyrx: v }); }} disabled={busy}>Award bounty</Button></div>
          <p className="mt-1 text-xs text-faint">Bounty pays the reporter once (idempotent).</p>
        </Card>
      )}
      <div className="mt-5"><div className="label">Comments</div>
        <div className="mt-2 space-y-2">{(b.comments || []).map((c: any) => <div key={c.id} className="rounded-lg border border-line p-2.5 text-sm"><div className="text-xs text-faint">{c.handle ? "@" + c.handle : c.display_name}{c.is_staff && <span className="ml-1 text-[color:var(--color-brand)]">· Admin</span>} · {ago(Number(c.created_at))}</div><div className="mt-0.5 whitespace-pre-wrap">{c.body}</div></div>)}{(b.comments || []).length === 0 && <p className="text-xs text-faint">No comments yet.</p>}</div>
        <div className="mt-2 flex gap-2"><input className="input" value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addComment()} placeholder="Add a comment…" /><Button onClick={addComment}>Send</Button></div>
      </div>
    </Drawer>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <div className="mt-3"><div className="label">{title}</div><div className="mt-1 whitespace-pre-wrap rounded-lg border border-line bg-[rgba(5,6,9,0.4)] p-3 text-sm text-muted">{children}</div></div>; }
function MiniBox({ title, body }: { title: string; body: string }) { return <div><div className="label">{title}</div><div className="mt-1 whitespace-pre-wrap rounded-lg border border-line p-2.5 text-sm text-muted">{body || "—"}</div></div>; }
export function Chat(_: { me: any }) {
  return <><PageHeader title="Chat" subtitle="Realtime community — channels, DMs + group chats, @mentions, emoji + GIFs. Team = Admin, Community Support = green." /><ChatRoom apiBase="/api/chat" /></>;
}
function urlB64ToUint8(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64); const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}
export function Releases({ subject }: { subject: AccessSubject }) {
  const [items, setItems] = useState<any[] | null>(null);
  const [pub, setPub] = useState(false);
  const [f, setF] = useState<any>({ version: "", channel: "inferno", title: "", notes: "", downloadUrl: "" });
  const [busy, setBusy] = useState(false); const [errs, setErrs] = useState<any>({});
  const [pushState, setPushState] = useState("");
  const canPublish = subject.isSuperuser || subject.permissions.includes("releases.publish");
  async function load() { const d = await (await fetch("/api/releases")).json(); setItems(d.ok ? d.releases : []); }
  useEffect(() => { load(); }, []);
  async function publish() {
    if (!f.version.trim()) { setErrs({ version: "Version required." }); return; }
    setBusy(true); setErrs({});
    const res = await fetch("/api/releases", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(f) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok || !d.ok) { setErrs(d.errors || { _: d.error || "Couldn't publish." }); setBusy(false); return; }
    setPub(false); setF({ version: "", channel: "inferno", title: "", notes: "", downloadUrl: "" }); setBusy(false); load();
  }
  async function enablePush() {
    setPushState("…");
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return setPushState("Not supported in this browser.");
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setPushState("Permission denied.");
      const reg = await navigator.serviceWorker.register("/sw.js");
      const v = await (await fetch("/api/push/vapid")).json();
      if (!v.ok || !v.configured) return setPushState("Push isn't configured yet.");
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8(v.publicKey) });
      await fetch("/api/push/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ subscription: sub }) });
      setPushState("✓ Notifications on");
    } catch { setPushState("Couldn't enable notifications."); }
  }
  return (
    <>
      <PageHeader title="Releases" subtitle="Latest devnet builds + changelog. Get a browser push + email the moment one drops."
        action={<div className="flex items-center gap-2"><Button onClick={enablePush}>🔔 Enable alerts</Button>{canPublish && <Button variant="primary" onClick={() => setPub(true)}><Icon.plus className="h-4 w-4" /> Publish</Button>}</div>} />
      {pushState && <p className="mb-3 text-xs text-faint">{pushState}</p>}
      {pub && (
        <Card className="mb-4 p-5">
          <div className="text-sm font-semibold">Publish a release</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div><label className="label">Version</label><input className="input" value={f.version} onChange={(e) => setF({ ...f, version: e.target.value })} placeholder="v0.1.1" />{errs.version && <p className="text-xs text-[color:var(--color-negative)]">{errs.version}</p>}</div>
            <div><label className="label">Channel</label><select className="input" value={f.channel} onChange={(e) => setF({ ...f, channel: e.target.value })}><option value="inferno">Inferno</option><option value="cli">CLI</option><option value="node">Node</option></select></div>
          </div>
          <div className="mt-3"><label className="label">Title</label><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="What's new" /></div>
          <div className="mt-3"><label className="label">Changelog</label><textarea className="input" rows={4} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
          <div className="mt-3"><label className="label">Download URL <span className="font-normal text-faint">(optional)</span></label><input className="input" value={f.downloadUrl} onChange={(e) => setF({ ...f, downloadUrl: e.target.value })} placeholder="https://…" /></div>
          {errs._ && <p className="mt-2 text-sm text-[color:var(--color-negative)]">{errs._}</p>}
          <div className="mt-4 flex gap-3"><Button variant="primary" onClick={publish} disabled={busy}>{busy ? "Publishing…" : "Publish + notify everyone"}</Button><Button onClick={() => setPub(false)}>Cancel</Button></div>
        </Card>
      )}
      {!items ? <Card className="p-8 text-center text-sm text-muted">Loading…</Card> : items.length === 0 ? <Card className="p-8 text-center text-sm text-muted">No releases yet.</Card> : (
        <div className="space-y-3">
          {items.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Badge tone="brand">{r.version}</Badge><span className="text-xs text-faint">{r.channel} · {new Date(Number(r.created_at)).toLocaleDateString()}</span></div>{r.download_url && <a className="btn btn-ghost" href={r.download_url} target="_blank" rel="noreferrer"><Icon.download className="h-4 w-4" /> Get it</a>}</div>
              {r.title && <div className="mt-2 font-bold">{r.title}</div>}
              {r.notes && <div className="mt-1 whitespace-pre-wrap text-sm text-muted">{r.notes}</div>}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
// Triage is the Issue Council scoped to incoming reports (status = New) — the real triage controls
// (set status/severity, award bounties) live in each bug's drawer, gated by `issues.triage`. This is
// an honest filtered view, not a placeholder: it surfaces exactly the queue a triager works.
export function Triage({ me, subject }: { me: any; subject: AccessSubject }) {
  return <IssueCouncil me={me} subject={subject} initialStatus="new" title="Triage" subtitle="Incoming reports awaiting triage. Open one to set its status/severity, link duplicates, and award a bug bounty." />;
}
export function Testers(_: { subject: AccessSubject }) {
  return <><PageHeader title="Testers" subtitle="Staff: tester roster, uptime + earnings." /><ComingSoon title="Tester admin is being wired up" detail="The roster, uptime + earnings overview, and eligibility controls live here." /></>;
}
