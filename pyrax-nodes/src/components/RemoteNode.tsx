// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Remote node access. A running node opens an outbound tunnel to the relay (nodes.pyraxchain.com) and
// is reachable at https://<id>.nodes.pyraxchain.com, where <id> is the first 12 hex of SHA-256(peerId).
// Enter your node's id (or full link) to open its dashboard — in a new tab or embedded inline.
import React, { useEffect, useState } from "react";

const TUNNEL_BASE = "nodes.pyraxchain.com";
const RECENT_KEY = "pyrax:recent-nodes";

function toUrl(input: string): string | null {
  const v = input.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) {
    try { const u = new URL(v); return u.host.endsWith(TUNNEL_BASE) ? u.origin : null; } catch { return null; }
  }
  const id = v.replace(/\.nodes\.pyraxchain\.com.*$/i, "").toLowerCase();
  if (/^[0-9a-f]{4,64}$/.test(id)) return `https://${id}.${TUNNEL_BASE}`;
  return null;
}

export default function RemoteNode() {
  const [input, setInput] = useState("");
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => { try { setRecent(JSON.parse(localStorage.getItem(RECENT_KEY) || "[]")); } catch {} }, []);
  function remember(url: string) {
    const id = url.replace(/^https?:\/\//, "").split(".")[0];
    const next = [id, ...recent.filter((r) => r !== id)].slice(0, 6);
    setRecent(next); try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch {}
  }
  function open(target?: string) {
    const url = toUrl(target ?? input);
    if (!url) { setErr("Enter a valid node id or *.nodes.pyraxchain.com link."); return; }
    setErr(""); remember(url); window.open(url, "_blank", "noopener");
  }
  function embed(target?: string) {
    const url = toUrl(target ?? input);
    if (!url) { setErr("Enter a valid node id or *.nodes.pyraxchain.com link."); return; }
    setErr(""); remember(url); setEmbedUrl(url);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Remote node access</h1>
        <p className="mt-3 text-lg text-muted">View and manage any of your nodes from anywhere through PYRAX's secure tunnel — even behind NAT or a firewall. Your node opens the connection outbound; nothing is exposed publicly except the dashboard you authorize.</p>
      </div>

      <div className="card mt-8 p-6">
        <label className="label">Node id or dashboard link</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input className="input font-mono" placeholder="e.g. a1b2c3d4e5f6  or  https://a1b2c3d4e5f6.nodes.pyraxchain.com" value={input}
            onChange={(e) => { setInput(e.target.value); setErr(""); }} onKeyDown={(e) => e.key === "Enter" && open()} />
          <div className="flex gap-2">
            <button className="btn btn-primary whitespace-nowrap" onClick={() => open()}>Open dashboard ↗</button>
            <button className="btn btn-ghost whitespace-nowrap" onClick={() => embed()}>Embed</button>
          </div>
        </div>
        {err && <p className="mt-2 text-sm text-[color:var(--color-negative)]">{err}</p>}
        <p className="mt-3 text-xs text-faint">Find your node's id in the Inferno app under <span className="text-muted">Node → Remote access</span> (copy link or scan the QR), or in the CLI with <code className="rounded bg-[rgba(5,6,9,0.6)] px-1.5 py-0.5 font-mono">pyrax portal</code>.</p>

        {recent.length > 0 && (
          <div className="mt-4">
            <div className="mb-1.5 text-[0.66rem] font-semibold uppercase tracking-wider text-faint">Recent</div>
            <div className="flex flex-wrap gap-2">
              {recent.map((id) => (
                <button key={id} onClick={() => { setInput(id); embed(id); }} className="chip chip-muted font-mono hover:text-ink">{id}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {embedUrl && (
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm text-muted">Embedded dashboard · <span className="font-mono text-ink">{embedUrl.replace(/^https?:\/\//, "")}</span></div>
            <div className="flex gap-2">
              <a href={embedUrl} target="_blank" rel="noreferrer" className="btn btn-ghost py-1.5 text-xs">Open in new tab ↗</a>
              <button onClick={() => setEmbedUrl(null)} className="btn btn-ghost py-1.5 text-xs">Close</button>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-line bg-[rgba(5,6,9,0.5)]">
            <iframe src={embedUrl} title="Node dashboard" className="h-[70vh] min-h-[480px] w-full" sandbox="allow-scripts allow-forms allow-same-origin allow-popups" />
          </div>
          <p className="mt-2 text-xs text-faint">If the dashboard doesn't load, the node may be offline, or its dashboard disallows embedding — use “Open in new tab”.</p>
        </div>
      )}

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {[
          ["Outbound only", "Your node dials the relay — no inbound ports, no firewall changes, works behind any NAT."],
          ["End-to-end to your node", "The relay only forwards bytes between your browser and your node over the tunnel it opened."],
          ["You're in control", "Expose the read-only dashboard, or enable RPC per-node. Turn remote access off anytime in the app."],
        ].map(([t, b]) => (
          <div key={t} className="card p-5"><div className="font-semibold">{t}</div><p className="mt-1 text-sm text-muted">{b}</p></div>
        ))}
      </div>
    </div>
  );
}
