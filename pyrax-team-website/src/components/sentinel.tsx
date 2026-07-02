// SPDX-License-Identifier: LicenseRef-Proprietary
//
// NEURAX Sentinel — the guardian-AI operations console, LIVE inside the team portal (SRE role).
// ALL Sentinel activity happens here now; status.pyraxchain.com is the PUBLIC status page only.
// Every panel calls the team site's `/api/sentinel/*` proxy, which forwards to the Sentinel backend
// with a shared bearer and is gated by the SRE `sentinel.*` permissions.
//
// Layout: a fixed LEFT column (the on-GPU Brain + control panel) and a tabbed RIGHT column
// (Advisories / Actions / Ask / Mind). Advisories are de-duplicated, severity-ranked (5-tier),
// default-filtered, paginated, and each expands into its investigation report → dispatch → repair
// history. UI state (tab, filters, page, expanded cards, the Mind stream) persists across navigation.
import React, { useEffect, useRef, useState } from "react";
import { Card, Button, Badge, PageHeader, Icon, Pagination } from "./ui";
import { can, type AccessSubject } from "../lib/permissions";

function Locked({ what }: { what: string }) {
  return (
    <Card className="p-10 text-center">
      <Icon.shield className="mx-auto h-8 w-8 text-faint" />
      <p className="mt-3 font-semibold">No access to {what}</p>
      <p className="mt-1 text-sm text-muted">Ask an admin to grant you the SRE role.</p>
    </Card>
  );
}

async function getJSON(url: string): Promise<any> {
  try { return await (await fetch(url, { headers: { accept: "application/json" } })).json(); } catch { return { ok: false, error: "Network error." }; }
}
async function postJSON(url: string, body?: unknown): Promise<any> {
  try {
    return await (await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) })).json();
  } catch { return { ok: false, error: "Network error." }; }
}

// --- severity (5-tier: info / low / medium / high / critical; legacy warn ≈ medium) ---------------
const SEV_RANK: Record<string, number> = { info: 0, low: 1, medium: 2, warn: 2, warning: 2, high: 3, critical: 4 };
function sevMeta(s?: string): { tone: "danger" | "warning" | "muted"; label: string; rank: number; dot: string } {
  const k = String(s || "info").toLowerCase();
  const rank = SEV_RANK[k] ?? 0;
  return {
    rank,
    tone: rank >= 3 ? "danger" : rank === 2 ? "warning" : "muted",
    label: k === "warn" || k === "warning" ? "medium" : k,
    dot: rank >= 3 ? "bg-[color:#f87171]" : rank === 2 ? "bg-[color:var(--color-brand)]" : "bg-[color:rgba(148,163,184,0.7)]",
  };
}
/** Rebrand the raw issue source to a friendly Sentinel label (nova-patrol → NEURAX Sentinel (PATROL)). */
function sourceLabel(src?: string): string {
  const s = String(src || "").toLowerCase();
  if (s.includes("security")) return "NEURAX Sentinel (SECURITY)";
  if (s.includes("patrol")) return "NEURAX Sentinel (PATROL)";
  if (s === "nova" || s === "nova-agent" || s === "sentinel" || s === "") return "NEURAX Sentinel";
  return src as string;
}
function isSecurity(a: any): boolean {
  return String(a?.source || "").includes("security") || a?.dossier?.category === "security" || /^\[security\]/i.test(a?.title || "");
}
function statusTone(s?: string): "danger" | "warning" | "positive" | "muted" {
  if (s === "reopened" || s === "escalated") return "danger";
  if (s === "deployed" || s === "monitoring" || s === "resolved") return "positive";
  if (s === "fixing" || s === "investigating" || s === "dispatched" || s === "deploying") return "warning";
  return "muted";
}
function timeAgo(at?: number | string): string {
  if (!at) return "";
  const t = typeof at === "string" ? Date.parse(at) : at;
  if (!Number.isFinite(t)) return "";
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/** Persist a piece of UI state to localStorage so the whole section survives navigation. */
function useLocalState<T>(key: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [v, setV] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try { const raw = window.localStorage.getItem(key); return raw != null ? (JSON.parse(raw) as T) : initial; } catch { return initial; }
  });
  useEffect(() => { try { window.localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore quota */ } }, [key, v]);
  return [v, setV];
}

type Tab = "advisories" | "actions" | "ask" | "mind";
const PAGE_SIZE = 8;
const MIN_SEV_OPTS = [
  { id: "all", label: "All" }, { id: "low", label: "Low+" }, { id: "medium", label: "Medium+" }, { id: "high", label: "High+" }, { id: "critical", label: "Critical" },
];

export function SentinelConsole({ subject }: { subject: AccessSubject }) {
  if (!can(subject, "sentinel.view")) return <Locked what="the NEURAX Sentinel console" />;
  const canControl = can(subject, "sentinel.control");
  const canApprove = can(subject, "sentinel.approve");
  const canAsk = can(subject, "sentinel.ask");

  const [tab, setTab] = useLocalState<Tab>("sentinel.tab", "advisories");
  const [status, setStatus] = useState<any>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");

  async function load() {
    const d = await getJSON("/api/sentinel/status");
    if (d.ok) { setStatus(d); setErr(""); } else setErr(d.error || "Couldn't reach the Sentinel backend.");
  }
  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, []);

  const edge = status?.edge;
  const edgeOnline = !!(edge && (edge.online ?? edge.connected ?? edge === true));
  const killed = !!status?.killed;
  const autonomy: string = status?.autonomy || "advisory";
  const model: string = status?.model || "NEURAX runtime";
  const configured = status?.configured !== false;
  const advisories: any[] = Array.isArray(status?.advisories) ? status.advisories : [];
  const actions: any[] = Array.isArray(status?.actions) ? status.actions : [];
  const openActions = actions.filter((a) => a?.status === "proposed" || a?.status === "approved");

  async function setSettings(patch: { kill?: boolean; autonomy?: "advisory" | "autonomous" }, label: string) {
    setBusy(label);
    const d = await postJSON("/api/sentinel/settings", patch);
    if (!d.ok) setErr(d.error || "That change was rejected.");
    await load();
    setBusy("");
  }
  async function decide(id: string, decision: "approve" | "reject") {
    setBusy(`action:${id}`);
    const d = await postJSON(`/api/sentinel/actions/${encodeURIComponent(id)}`, { decision });
    if (!d.ok) setErr(d.error || "That decision was rejected.");
    await load();
    setBusy("");
  }
  async function issueAction(id: string, kind: "investigate" | "dispatch") {
    setBusy(`${kind}:${id}`);
    const d = await postJSON(`/api/sentinel/issues/${encodeURIComponent(id)}/${kind}`);
    if (!d.ok) setErr(d.error || "That request was rejected.");
    await load();
    setBusy("");
  }

  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: "advisories", label: "Advisories", badge: advisories.length || undefined },
    { id: "actions", label: "Actions", badge: openActions.length || undefined },
    { id: "ask", label: "Ask Sentinel" },
    { id: "mind", label: "NEURAX Mind" },
  ];

  return (
    <>
      <PageHeader
        title="NEURAX Sentinel"
        subtitle="The guardian AI — health, advisories, action approvals, and the on-GPU brain. This is the only place Sentinel is operated; status.pyraxchain.com is the public status page."
        action={
          <div className="flex items-center gap-2">
            <Badge tone={edgeOnline ? "positive" : "warning"}>
              <span className={`mr-1 inline-block h-2 w-2 rounded-full ${edgeOnline ? "bg-positive" : "bg-[color:var(--color-brand)]"}`} />
              {edgeOnline ? "Brain online" : "Brain offline"}
            </Badge>
            {killed && <Badge tone="danger">Kill-switch ON</Badge>}
            <Badge tone={autonomy === "autonomous" ? "brand" : "muted"}>{autonomy === "autonomous" ? "Autonomous" : "Advisory"}</Badge>
          </div>
        }
      />

      {err && <Card className="mb-4 border-[color:rgba(248,113,113,0.4)] p-3 text-sm text-[color:#fca5a5]">{err}</Card>}
      {!configured && (
        <Card className="mb-4 p-3 text-sm text-muted">
          Sentinel isn't fully configured yet (the backend reports no edge secret). The console will populate once the on-GPU brain is connected.
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* LEFT — the Brain + control panel (sticky) */}
        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card className="p-5">
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted">Brain</h3>
            <div className="mt-3 space-y-2 text-sm">
              <Row k="Status" v={edgeOnline ? "Online" : "Offline"} tone={edgeOnline ? "positive" : "warning"} />
              <Row k="Model" v={model} />
              <Row k="Autonomy" v={autonomy === "autonomous" ? "Autonomous" : "Advisory"} tone={autonomy === "autonomous" ? "brand" : "muted"} />
              <Row k="Kill-switch" v={killed ? "Engaged (paused)" : "Clear"} tone={killed ? "danger" : "positive"} />
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted">Control</h3>
            {canControl ? (
              <div className="mt-3 space-y-2">
                <Button
                  variant={killed ? "primary" : "danger"}
                  className="w-full"
                  disabled={busy === "kill"}
                  onClick={() => {
                    if (!killed && !window.confirm("Trip the Sentinel kill-switch? This halts ALL autonomous action immediately.")) return;
                    setSettings({ kill: !killed }, "kill");
                  }}
                >
                  {killed ? "Resume Sentinel" : "Trip kill-switch"}
                </Button>
                <div className="flex gap-2">
                  <Button variant={autonomy === "advisory" ? "primary" : "ghost"} className="flex-1" disabled={busy === "auto" || autonomy === "advisory"} onClick={() => setSettings({ autonomy: "advisory" }, "auto")}>Advisory</Button>
                  <Button
                    variant={autonomy === "autonomous" ? "primary" : "ghost"}
                    className="flex-1"
                    disabled={busy === "auto" || autonomy === "autonomous"}
                    onClick={() => {
                      if (!window.confirm("Switch Sentinel to AUTONOMOUS? It will investigate, fix, adversarially review, deploy and roll back on its own for non-red-line issues (still fully audited; red lines always need approval).")) return;
                      setSettings({ autonomy: "autonomous" }, "auto");
                    }}
                  >
                    Autonomous
                  </Button>
                </div>
                <p className="pt-1 text-xs text-faint">In autonomous mode NEURAX fixes non-red-line issues end-to-end; auth/secrets/consensus/wallet always escalate to you.</p>
              </div>
            ) : (
              <p className="mt-3 text-xs text-faint">Kill-switch + autonomy require the elevated <code>sentinel.control</code> permission.</p>
            )}
          </Card>
        </div>

        {/* RIGHT — tabbed workspace */}
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                  tab === t.id ? "border-[color:rgba(245,134,34,0.4)] bg-[rgba(245,134,34,0.1)] text-ink" : "border-line text-muted hover:text-ink"
                }`}
              >
                {t.label}
                {t.badge ? <span className="rounded-full bg-[rgba(245,134,34,0.18)] px-2 text-xs text-[color:var(--color-brand)]">{t.badge}</span> : null}
              </button>
            ))}
          </div>

          {tab === "advisories" && <Advisories advisories={advisories} canApprove={canApprove} busy={busy} onAction={issueAction} />}
          {tab === "actions" && <ActionsQueue actions={actions} openCount={openActions.length} canApprove={canApprove} busy={busy} onDecide={decide} />}
          {tab === "ask" && <AskSentinel canAsk={canAsk} online={edgeOnline && !killed} />}
          {tab === "mind" && <MindStream />}
        </div>
      </div>
    </>
  );
}

function Row({ k, v, tone }: { k: string; v: string; tone?: "positive" | "warning" | "danger" | "brand" | "muted" }) {
  const color = tone === "positive" ? "text-positive" : tone === "warning" || tone === "danger" || tone === "brand" ? "text-[color:var(--color-brand)]" : "text-ink";
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted">{k}</span>
      <span className={`text-right font-semibold ${color}`}>{v}</span>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition ${active ? "border-[color:rgba(245,134,34,0.4)] bg-[rgba(245,134,34,0.1)] text-ink" : "border-line text-muted hover:text-ink"}`}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------- Advisories
function Advisories({ advisories, canApprove, busy, onAction }: { advisories: any[]; canApprove: boolean; busy: string; onAction: (id: string, kind: "investigate" | "dispatch") => void }) {
  const [minSev, setMinSev] = useLocalState<string>("sentinel.minSev", "high");
  const [secOnly, setSecOnly] = useLocalState<boolean>("sentinel.secOnly", false);
  const [page, setPage] = useLocalState<number>("sentinel.page", 1);
  const [openIds, setOpenIds] = useLocalState<number[]>("sentinel.open", []);

  const minRank = minSev === "all" ? -1 : (SEV_RANK[minSev] ?? 0);
  let list = advisories.filter((a) => sevMeta(a.severity).rank >= minRank);
  if (secOnly) list = list.filter(isSecurity);
  list = list.slice().sort((a, b) => sevMeta(b.severity).rank - sevMeta(a.severity).rank || (b.last_seen || b.lastSeen || 0) - (a.last_seen || a.lastSeen || 0));

  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const clamped = Math.min(Math.max(1, page), pages);
  const pageItems = list.slice((clamped - 1) * PAGE_SIZE, clamped * PAGE_SIZE);

  let critical = 0, high = 0, sec = 0;
  for (const a of advisories) { const r = sevMeta(a.severity).rank; if (r === 4) critical++; else if (r === 3) high++; if (isSecurity(a)) sec++; }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted">Advisories</h3>
        <div className="flex flex-wrap gap-1">
          {MIN_SEV_OPTS.map((o) => <FilterChip key={o.id} active={minSev === o.id} onClick={() => { setMinSev(o.id); setPage(1); }}>{o.label}</FilterChip>)}
          <FilterChip active={secOnly} onClick={() => { setSecOnly(!secOnly); setPage(1); }}>🛡 Security{sec ? ` ${sec}` : ""}</FilterChip>
        </div>
      </div>
      <p className="mt-1 text-xs text-faint">{critical} critical · {high} high · {advisories.length} total — de-duplicated, severity-ranked. Click an advisory to open its report.</p>

      <div className="mt-3 space-y-3">
        {total === 0 && <p className="py-6 text-center text-sm text-muted">Nothing at this severity. NEURAX sweeps logs, probes endpoints, and runs the white-hat security patrol continuously.</p>}
        {pageItems.map((a) => (
          <AdvisoryCard
            key={a.id}
            a={a}
            open={openIds.includes(a.id)}
            onToggle={() => setOpenIds((ids) => (ids.includes(a.id) ? ids.filter((x) => x !== a.id) : [...ids, a.id]))}
            canApprove={canApprove}
            busy={busy}
            onAction={onAction}
          />
        ))}
      </div>

      {total > PAGE_SIZE && <div className="mt-4"><Pagination page={clamped} total={total} pageSize={PAGE_SIZE} onPage={setPage} /></div>}
    </Card>
  );
}

function AdvisoryCard({ a, open, onToggle, canApprove, busy, onAction }: { a: any; open: boolean; onToggle: () => void; canApprove: boolean; busy: string; onAction: (id: string, kind: "investigate" | "dispatch") => void }) {
  const sm = sevMeta(a.severity);
  const d = a.dossier || {};
  const hasReport = !!(d.rootCause || d.whatToFix);
  const fix = d.fix;
  const sec = isSecurity(a);
  return (
    <div className={`rounded-lg border ${sm.rank >= 4 ? "border-[color:rgba(248,113,113,0.4)]" : "border-line"}`}>
      <button onClick={onToggle} className="flex w-full flex-wrap items-center gap-2 p-3 text-left">
        <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${sm.dot}`} />
        <Badge tone={sm.tone}>{sm.label}</Badge>
        {sec && <Badge tone="brand">🛡 security</Badge>}
        <span className="text-sm font-semibold">{a.title || "(untitled)"}</span>
        {a.count > 1 ? <span className="text-xs text-faint">×{a.count}</span> : null}
        {hasReport && <span title="Investigation report ready" className="ml-1 inline-flex items-center gap-1 rounded-full bg-[rgba(245,134,34,0.15)] px-2 py-0.5 text-[0.6rem] font-semibold text-[color:var(--color-brand)]">📋 report</span>}
        {fix && <span title="Repaired" className="inline-flex items-center gap-1 rounded-full bg-[rgba(74,222,128,0.15)] px-2 py-0.5 text-[0.6rem] font-semibold text-positive">✓ fixed</span>}
        <span className="ml-auto flex items-center gap-2 text-xs text-faint">
          <Badge tone={statusTone(a.status)}>{a.status || "open"}</Badge>
          <span className="hidden sm:inline">{sourceLabel(a.source)}</span>
          {timeAgo(a.last_seen || a.lastSeen)}
          <span aria-hidden>{open ? "▲" : "▼"}</span>
        </span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-line px-3 pb-3 pt-3">
          {hasReport ? (
            <div className="space-y-2 text-sm">
              <ReportRow label="Root cause" value={`${d.rootCause || "—"}${typeof d.confidence === "number" ? `   ·   ${(d.confidence * 100) | 0}% confidence` : ""}`} strong />
              {d.whatToFix && <ReportRow label="What to fix" value={d.whatToFix} />}
              {d.howToFix && <ReportRow label="How" value={d.howToFix} />}
              {d.whyToFix && <ReportRow label="Why" value={d.whyToFix} />}
              {d.blastRadius && <ReportRow label="Blast radius" value={d.blastRadius} />}
              {d.testPlan && <ReportRow label="Test plan" value={d.testPlan} />}
              {d.rollback && <ReportRow label="Rollback" value={d.rollback} />}
              {Array.isArray(d.evidence) && d.evidence.length > 0 && <ReportRow label="Evidence" value={d.evidence.slice(0, 6).map((e: string) => `• ${e}`).join("\n")} />}
              {Array.isArray(d.hypotheses) && d.hypotheses.length > 0 && <ReportRow label="Hypotheses" value={d.hypotheses.slice(0, 5).map((h: string) => `• ${h}`).join("\n")} />}
            </div>
          ) : (
            <p className="text-sm text-muted">Not investigated yet — run an investigation for a full root-cause report (what to fix, how, why, blast radius, test plan, rollback).</p>
          )}

          {fix && (
            <div className="rounded-md border border-[color:rgba(74,222,128,0.35)] bg-[rgba(74,222,128,0.06)] p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="positive">repaired</Badge>
                <span className="font-semibold">{fix.fixRef}</span>
                <span className="ml-auto text-xs text-faint">{timeAgo(fix.at)}</span>
              </div>
              {fix.summary && <p className="mt-1 text-muted">{fix.summary}</p>}
              {Array.isArray(fix.files) && fix.files.length > 0 && (
                <p className="mt-1 text-xs text-faint"><span className="uppercase tracking-wide">Files touched:</span> {fix.files.join(", ")}</p>
              )}
            </div>
          )}

          {canApprove ? (
            <div className="flex flex-wrap gap-2 border-t border-line pt-3">
              <Button variant="ghost" disabled={busy === `investigate:${a.id}`} onClick={() => onAction(a.id, "investigate")}>
                {busy === `investigate:${a.id}` ? "Investigating…" : hasReport ? "Re-investigate" : "Investigate"}
              </Button>
              <Button
                variant="primary"
                disabled={busy === `dispatch:${a.id}`}
                onClick={() => { if (window.confirm("Dispatch to NEURAX auto-repair? It fixes, runs the full test suite, adversarially reviews (design/security/over-hardening), deploys, and auto-rolls-back on any regression.")) onAction(a.id, "dispatch"); }}
              >
                {busy === `dispatch:${a.id}` ? "Dispatching…" : "Dispatch fix"}
              </Button>
            </div>
          ) : (
            <p className="border-t border-line pt-3 text-xs text-faint">Investigate / dispatch need the <code>sentinel.approve</code> permission.</p>
          )}
        </div>
      )}
    </div>
  );
}

function ReportRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <span className="text-[0.65rem] uppercase tracking-wide text-faint">{label}</span>
      <p className={`whitespace-pre-wrap ${strong ? "font-semibold text-ink" : "text-muted"}`}>{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------- Actions queue
function ActionsQueue({ actions, openCount, canApprove, busy, onDecide }: { actions: any[]; openCount: number; canApprove: boolean; busy: string; onDecide: (id: string, decision: "approve" | "reject") => void }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted">Action approval queue</h3>
        <Badge tone={openCount ? "warning" : "positive"}>{openCount ? `${openCount} awaiting` : "nothing queued"}</Badge>
      </div>
      <p className="mt-1 text-xs text-faint">Red-line actions (consensus / comms / p2p, chain-affecting pushes, and other high-impact changes) require your approval before Sentinel executes them.</p>
      <div className="mt-3 space-y-3">
        {actions.length === 0 && <p className="py-6 text-center text-sm text-muted">No proposed actions.</p>}
        {actions.slice(0, 30).map((a) => (
          <div key={a.id} className="rounded-lg border border-line p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">{a.kind || "action"}</Badge>
              <span className="text-sm font-semibold">{a.target || ""}</span>
              {typeof a.confidence === "number" && <span className="text-xs text-faint">confidence {(a.confidence * 100).toFixed(0)}%</span>}
              <span className="ml-auto text-xs text-faint">{a.status} · {timeAgo(a.proposed_at || a.proposedAt)}</span>
            </div>
            {a.rationale && <p className="mt-2 text-xs text-muted">{String(a.rationale).slice(0, 400)}</p>}
            {canApprove && a.status === "proposed" && (
              <div className="mt-2 flex gap-2">
                <Button variant="primary" disabled={busy === `action:${a.id}`} onClick={() => { if (window.confirm(`Approve "${a.kind}"${a.target ? " on " + a.target : ""}? It will execute.`)) onDecide(a.id, "approve"); }}>Approve</Button>
                <Button variant="danger" disabled={busy === `action:${a.id}`} onClick={() => onDecide(a.id, "reject")}>Reject</Button>
              </div>
            )}
            {!canApprove && <p className="mt-2 text-xs text-faint">Approving needs the <code>sentinel.approve</code> permission.</p>}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- Ask Sentinel
function AskSentinel({ canAsk, online }: { canAsk: boolean; online: boolean }) {
  const [msgs, setMsgs] = useLocalState<{ role: "you" | "sentinel"; text: string }[]>("sentinel.ask.log", []);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement | null>(null);
  useEffect(() => { if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight; }, [msgs, busy]);

  async function ask() {
    const text = q.trim();
    if (!text || busy) return;
    setMsgs((m) => [...m, { role: "you", text }]);
    setQ("");
    setBusy(true);
    const d = await postJSON("/api/sentinel/ask", { question: text });
    setMsgs((m) => [...m, { role: "sentinel", text: d.ok ? String(d.answer || "(no answer)") : d.error || "Sentinel is unavailable right now." }]);
    setBusy(false);
  }

  if (!canAsk) return <Locked what="Ask Sentinel" />;
  return (
    <Card className="flex flex-col p-5" style={{ minHeight: 480 }}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted">Ask Sentinel</h3>
        <div className="flex items-center gap-2">
          {msgs.length > 0 && <button className="text-xs text-faint hover:text-ink" onClick={() => setMsgs([])}>Clear</button>}
          <span className="text-xs text-faint">{online ? "on the on-GPU brain" : "brain offline — answers may be limited"}</span>
        </div>
      </div>
      <div ref={scroller} className="my-3 flex-1 space-y-3 overflow-y-auto" style={{ minHeight: 0 }}>
        {msgs.length === 0 && <p className="text-sm text-muted">Ask about incidents, the fleet, an advisory, or what to do next. Sentinel has the ops context + the whole codebase indexed.</p>}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "you" ? "text-right" : "text-left"}>
            <div className="text-[0.65rem] uppercase tracking-wide text-faint">{m.role === "you" ? "You" : "🛰 Sentinel"}</div>
            <div className={`mt-1 inline-block max-w-[88%] whitespace-pre-wrap rounded-xl border px-3 py-2 text-sm ${m.role === "you" ? "border-[color:rgba(245,134,34,0.35)] bg-[rgba(245,134,34,0.08)]" : "border-line bg-[rgba(255,255,255,0.03)]"}`}>{m.text}</div>
          </div>
        ))}
        {busy && <div className="text-sm text-[color:var(--color-brand)]">🛰 Sentinel is thinking…</div>}
      </div>
      <div className="flex items-end gap-2">
        <textarea
          className="input flex-1"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } }}
          placeholder="Ask Sentinel…  (Enter to send · Shift+Enter for a new line)"
          rows={1}
          style={{ height: 44, minHeight: 44, maxHeight: 44, resize: "none", overflowY: "auto" }}
        />
        <Button variant="primary" disabled={busy || !q.trim()} onClick={ask}>Ask</Button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- NEURAX Mind (persistent)
function MindStream() {
  // Cache the stream locally so navigating away + back shows it instantly, then refresh from the server.
  const [entries, setEntries] = useLocalState<any[]>("sentinel.mind.cache", []);
  const [err, setErr] = useState("");
  const [autoscroll, setAutoscroll] = useLocalState<boolean>("sentinel.mind.autoscroll", true);
  const scroller = useRef<HTMLDivElement | null>(null);

  async function load() {
    const d = await getJSON("/api/sentinel/mind");
    if (d.ok) { setEntries((d.entries || d.mind || []).slice(-500)); setErr(""); } else setErr(d.error || "Couldn't load the Mind stream.");
  }
  useEffect(() => { load(); const t = setInterval(load, 6000); return () => clearInterval(t); }, []);
  useEffect(() => { if (autoscroll && scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight; }, [entries, autoscroll]);

  const kindColor = (k: string) =>
    k === "action" ? "text-[color:var(--color-brand)]" : k === "advisory" ? "text-gold" : k === "review" ? "text-positive" : k === "dossier" ? "text-[color:var(--color-brand)]" : "text-faint";

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted">NEURAX Mind</h3>
        <label className="flex items-center gap-1.5 text-xs text-faint">
          <input type="checkbox" checked={autoscroll} onChange={(e) => setAutoscroll(e.target.checked)} /> follow
        </label>
      </div>
      <p className="mt-1 text-xs text-faint">Everything Sentinel is thinking + doing — investigations, reviews, deploys, rollbacks, security findings. Persisted.</p>
      {err && <p className="mt-2 text-sm text-[color:#fca5a5]">{err}</p>}
      <div ref={scroller} className="mt-3 max-h-[560px] space-y-2 overflow-y-auto font-mono text-xs leading-relaxed">
        {entries.length === 0 && !err && <p className="text-muted">No recent activity.</p>}
        {entries.map((e, i) => (
          <div key={e.id || i} className="flex gap-2">
            <span className="shrink-0 text-faint">{new Date(e.at || Date.now()).toLocaleTimeString()}</span>
            <span className={`shrink-0 uppercase ${kindColor(e.kind)}`}>{e.kind || "log"}</span>
            <span className="whitespace-pre-wrap text-ink">{e.text}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- Incidents
export function SentinelIncidents({ subject }: { subject: AccessSubject }) {
  if (!can(subject, "sentinel.incidents")) return <Locked what="Sentinel incidents" />;
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");

  async function load() {
    const d = await getJSON("/api/sentinel/incidents");
    if (d.ok) { setData(d); setErr(""); } else setErr(d.error || "Couldn't load incidents.");
  }
  useEffect(() => { load(); const t = setInterval(load, 12000); return () => clearInterval(t); }, []);

  async function approveUpdate(incidentId: string, uid: string) {
    setBusy(`u:${uid}`);
    const d = await postJSON(`/api/sentinel/incidents/${encodeURIComponent(incidentId)}/approve-update`, { uid });
    if (!d.ok) setErr(d.error || "Couldn't approve that update.");
    await load();
    setBusy("");
  }
  async function resolve(incidentId: string) {
    if (!window.confirm("Mark this incident resolved? A final public update posts to the status page.")) return;
    setBusy(`r:${incidentId}`);
    const d = await postJSON(`/api/sentinel/incidents/${encodeURIComponent(incidentId)}/resolve`, {});
    if (!d.ok) setErr(d.error || "Couldn't resolve that incident.");
    await load();
    setBusy("");
  }

  const incidents: any[] = Array.isArray(data?.incidents) ? data.incidents : [];
  const active = incidents.filter((i) => i?.status !== "resolved");
  const resolved = incidents.filter((i) => i?.status === "resolved");

  return (
    <>
      <PageHeader title="Sentinel Incidents" subtitle="Public incidents Sentinel tracks. Staged status-page notes wait here for your approval before they post publicly." />
      {err && <Card className="mb-4 border-[color:rgba(248,113,113,0.4)] p-3 text-sm text-[color:#fca5a5]">{err}</Card>}

      <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">Active</h3>
      <div className="space-y-3">
        {active.length === 0 && <Card className="p-6 text-sm text-muted">No active incidents. All systems nominal.</Card>}
        {active.map((inc) => (
          <Card key={inc.id} className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="warning">{inc.status || "investigating"}</Badge>
              <span className="font-semibold">{inc.title || "(untitled incident)"}</span>
              {inc.affected && <span className="text-xs text-faint">{Array.isArray(inc.affected) ? inc.affected.join(", ") : inc.affected}</span>}
              <span className="ml-auto text-xs text-faint">{timeAgo(inc.started_at || inc.startedAt)}</span>
            </div>
            {Array.isArray(inc.updates) && inc.updates.length > 0 && (
              <div className="mt-3 space-y-2 border-l-2 border-line pl-3">
                {inc.updates.map((u: any) => (
                  <div key={u.id} className="text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase text-faint">{u.stage}</span>
                      {u.approved === false && <Badge tone="warning">draft — awaiting approval</Badge>}
                      <span className="ml-auto text-xs text-faint">{timeAgo(u.at)}</span>
                    </div>
                    <p className="mt-1 text-muted">{u.body}</p>
                    {u.approved === false && (
                      <Button variant="primary" className="mt-1" disabled={busy === `u:${u.id}`} onClick={() => approveUpdate(inc.id, u.id)}>Approve & publish</Button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3">
              <Button variant="danger" disabled={busy === `r:${inc.id}`} onClick={() => resolve(inc.id)}>Mark resolved</Button>
            </div>
          </Card>
        ))}
      </div>

      {resolved.length > 0 && (
        <>
          <h3 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-muted">Recently resolved</h3>
          <div className="space-y-2">
            {resolved.slice(0, 10).map((inc) => (
              <Card key={inc.id} className="flex items-center gap-2 p-3 text-sm">
                <Badge tone="positive">resolved</Badge>
                <span className="font-medium">{inc.title}</span>
                <span className="ml-auto text-xs text-faint">{timeAgo(inc.resolved_at || inc.resolvedAt)}</span>
              </Card>
            ))}
          </div>
        </>
      )}
    </>
  );
}
