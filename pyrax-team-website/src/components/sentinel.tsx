// SPDX-License-Identifier: LicenseRef-Proprietary
//
// NEURAX Sentinel — the guardian-AI operations console, LIVE inside the team portal (SRE role).
// ALL Sentinel activity happens here now; status.pyraxchain.com is the PUBLIC status page only.
// Every panel calls the team site's `/api/sentinel/*` proxy, which forwards to the Sentinel backend
// with a shared bearer and is gated by the SRE `sentinel.*` permissions.
import React, { useEffect, useRef, useState } from "react";
import { Card, Button, Badge, PageHeader, Icon } from "./ui";
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

function sev(s: string): "danger" | "warning" | "muted" {
  return s === "critical" ? "danger" : s === "warn" || s === "warning" ? "warning" : "muted";
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

type Tab = "overview" | "actions" | "ask" | "mind";

export function SentinelConsole({ subject }: { subject: AccessSubject }) {
  if (!can(subject, "sentinel.view")) return <Locked what="the NEURAX Sentinel console" />;
  const canControl = can(subject, "sentinel.control");
  const canApprove = can(subject, "sentinel.approve");
  const canAsk = can(subject, "sentinel.ask");

  const [tab, setTab] = useState<Tab>("overview");
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
    { id: "overview", label: "Overview" },
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

      <div className="mb-5 flex flex-wrap gap-2">
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

      {tab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-5">
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted">Brain</h3>
            <div className="mt-3 space-y-2 text-sm">
              <Row k="Status" v={edgeOnline ? "Online" : "Offline"} tone={edgeOnline ? "positive" : "warning"} />
              <Row k="Model" v={model} />
              <Row k="Autonomy" v={autonomy === "autonomous" ? "Autonomous" : "Advisory"} tone={autonomy === "autonomous" ? "brand" : "muted"} />
              <Row k="Kill-switch" v={killed ? "Engaged (paused)" : "Clear"} tone={killed ? "danger" : "positive"} />
            </div>
            {canControl ? (
              <div className="mt-4 space-y-2 border-t border-line pt-4">
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
                  <Button
                    variant={autonomy === "advisory" ? "primary" : "ghost"}
                    className="flex-1"
                    disabled={busy === "auto" || autonomy === "advisory"}
                    onClick={() => setSettings({ autonomy: "advisory" }, "auto")}
                  >
                    Advisory
                  </Button>
                  <Button
                    variant={autonomy === "autonomous" ? "primary" : "ghost"}
                    className="flex-1"
                    disabled={busy === "auto" || autonomy === "autonomous"}
                    onClick={() => {
                      if (!window.confirm("Switch Sentinel to AUTONOMOUS? It may execute approved-class high-confidence actions without asking (still audited; red-lines still need approval).")) return;
                      setSettings({ autonomy: "autonomous" }, "auto");
                    }}
                  >
                    Autonomous
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-4 border-t border-line pt-4 text-xs text-faint">Kill-switch + autonomy require the elevated <code>sentinel.control</code> permission.</p>
            )}
          </Card>

          <Card className="p-5 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wide text-muted">Advisories</h3>
              <Badge tone={advisories.length ? "warning" : "positive"}>{advisories.length ? `${advisories.length} open` : "all clear"}</Badge>
            </div>
            <div className="mt-3 space-y-3">
              {advisories.length === 0 && <p className="text-sm text-muted">Sentinel hasn't raised anything. It sweeps logs + probes continuously.</p>}
              {advisories.slice(0, 12).map((a) => (
                <div key={a.id} className="rounded-lg border border-line p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={sev(a.severity)}>{a.severity || "info"}</Badge>
                    <span className="text-sm font-semibold">{a.title || "(untitled)"}</span>
                    {a.count ? <span className="text-xs text-faint">×{a.count}</span> : null}
                    <span className="ml-auto text-xs text-faint">{a.source || "sentinel"} · {timeAgo(a.last_seen || a.lastSeen)}</span>
                  </div>
                  {a.dossier?.summary && <p className="mt-2 text-xs text-muted">{String(a.dossier.summary).slice(0, 300)}</p>}
                  {canApprove && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button variant="ghost" disabled={busy === `investigate:${a.id}`} onClick={() => issueAction(a.id, "investigate")}>Investigate</Button>
                      <Button variant="primary" disabled={busy === `dispatch:${a.id}`} onClick={() => { if (window.confirm("Dispatch to Sentinel's auto-repair? It proposes a fix for your approval.")) issueAction(a.id, "dispatch"); }}>Dispatch fix</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === "actions" && (
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted">Action approval queue</h3>
            <Badge tone={openActions.length ? "warning" : "positive"}>{openActions.length ? `${openActions.length} awaiting` : "nothing queued"}</Badge>
          </div>
          <p className="mt-1 text-xs text-faint">Red-line actions (consensus / comms / p2p and other high-impact changes) require your approval before Sentinel executes them.</p>
          <div className="mt-3 space-y-3">
            {actions.length === 0 && <p className="text-sm text-muted">No proposed actions.</p>}
            {actions.slice(0, 20).map((a) => (
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
                    <Button variant="primary" disabled={busy === `action:${a.id}`} onClick={() => { if (window.confirm(`Approve "${a.kind}"${a.target ? " on " + a.target : ""}? It will execute.`)) decide(a.id, "approve"); }}>Approve</Button>
                    <Button variant="danger" disabled={busy === `action:${a.id}`} onClick={() => decide(a.id, "reject")}>Reject</Button>
                  </div>
                )}
                {!canApprove && <p className="mt-2 text-xs text-faint">Approving needs the <code>sentinel.approve</code> permission.</p>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "ask" && <AskSentinel canAsk={canAsk} online={edgeOnline && !killed} />}
      {tab === "mind" && <MindStream />}
    </>
  );
}

function Row({ k, v, tone }: { k: string; v: string; tone?: "positive" | "warning" | "danger" | "brand" | "muted" }) {
  const color = tone === "positive" ? "text-positive" : tone === "warning" || tone === "danger" ? "text-[color:var(--color-brand)]" : tone === "brand" ? "text-[color:var(--color-brand)]" : "text-ink";
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{k}</span>
      <span className={`font-semibold ${color}`}>{v}</span>
    </div>
  );
}

function AskSentinel({ canAsk, online }: { canAsk: boolean; online: boolean }) {
  const [msgs, setMsgs] = useState<{ role: "you" | "sentinel"; text: string }[]>([]);
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
    <Card className="flex flex-col p-5" style={{ minHeight: 460 }}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted">Ask Sentinel</h3>
        <span className="text-xs text-faint">{online ? "on the on-GPU brain" : "brain offline — answers may be limited"}</span>
      </div>
      <div ref={scroller} className="my-3 flex-1 space-y-3 overflow-y-auto" style={{ minHeight: 0 }}>
        {msgs.length === 0 && <p className="text-sm text-muted">Ask about incidents, the fleet, an advisory, or what to do next. Sentinel has the ops context.</p>}
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

function MindStream() {
  const [entries, setEntries] = useState<any[]>([]);
  const [err, setErr] = useState("");
  async function load() {
    const d = await getJSON("/api/sentinel/mind");
    if (d.ok) { setEntries(d.entries || d.mind || []); setErr(""); } else setErr(d.error || "Couldn't load the Mind stream.");
  }
  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, []);
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted">NEURAX Mind</h3>
        <span className="text-xs text-faint">everything Sentinel is thinking / doing</span>
      </div>
      {err && <p className="mt-2 text-sm text-[color:#fca5a5]">{err}</p>}
      <div className="mt-3 max-h-[520px] space-y-2 overflow-y-auto font-mono text-xs leading-relaxed">
        {entries.length === 0 && !err && <p className="text-muted">No recent activity.</p>}
        {entries.map((e, i) => (
          <div key={e.id || i} className="flex gap-2">
            <span className="shrink-0 text-faint">{new Date(e.at || Date.now()).toLocaleTimeString()}</span>
            <span className={`shrink-0 uppercase ${e.kind === "action" ? "text-[color:var(--color-brand)]" : e.kind === "advisory" ? "text-gold" : "text-faint"}`}>{e.kind || "log"}</span>
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
