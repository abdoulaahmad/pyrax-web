// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Public downloads hub. Renders the download list the team configures in "Network & App Management"
// (via /api/site); falls back to sensible defaults until the team sets exact artifact URLs. OS icons
// on every button. Also links to the "notify me when an app updates" signup.
import React, { useEffect, useMemo, useState } from "react";
import { platformIcon } from "./ui";

interface DownloadItem { product: string; platform: string; arch?: string; url: string; version?: string; note?: string }

const DEFAULTS: DownloadItem[] = [
  { product: "Inferno Node App", platform: "Windows", url: "https://pyraxchain.com/download", version: "latest", note: "Desktop node — run, mine, and manage from a UI" },
  { product: "Inferno Node App", platform: "macOS", url: "https://pyraxchain.com/download", version: "latest" },
  { product: "Inferno Node App", platform: "Linux", url: "https://pyraxchain.com/download", version: "latest" },
  { product: "PYRAX CLI", platform: "Linux", url: "https://pyraxchain.com/install.sh", version: "latest", note: "Headless node + wallet for servers" },
  { product: "PYRAX CLI", platform: "macOS", url: "https://pyraxchain.com/install.sh", version: "latest" },
];

export default function Downloads() {
  const [items, setItems] = useState<DownloadItem[] | null>(null);
  useEffect(() => {
    fetch("/api/site").then((r) => r.json()).then((d) => { setItems(d.ok && d.downloads?.length ? d.downloads : DEFAULTS); }).catch(() => setItems(DEFAULTS));
  }, []);

  const groups = useMemo(() => {
    const g: Record<string, DownloadItem[]> = {};
    for (const it of items || []) (g[it.product] ||= []).push(it);
    return Object.entries(g);
  }, [items]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Download a PYRAX node</h1>
        <p className="mt-3 text-lg text-muted">Pick your platform and join the network in minutes. Nodes connect outbound — no port-forwarding required. Every release is checksum-verified by the app on update.</p>
      </div>

      {items === null ? (
        <div className="card mt-8 p-10 text-center text-sm text-muted">Loading downloads…</div>
      ) : (
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {groups.map(([product, list]) => (
            <div key={product} className="card p-6">
              <div className="flex items-baseline justify-between">
                <h2 className="text-xl font-bold">{product}</h2>
                {list[0]?.version && <span className="chip chip-muted">{list[0].version}</span>}
              </div>
              {list.find((l) => l.note) && <p className="mt-1.5 text-sm text-muted">{list.find((l) => l.note)!.note}</p>}
              <div className="mt-4 flex flex-wrap gap-2.5">
                {list.map((it, i) => (
                  <a key={i} href={it.url} target="_blank" rel="noreferrer" className="btn btn-ghost">
                    {platformIcon(it.platform.toLowerCase(), "h-4 w-4")}
                    {it.platform}{it.arch ? ` · ${it.arch}` : ""}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 flex flex-col items-start gap-3 rounded-2xl border border-line bg-[rgba(255,255,255,0.02)] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-semibold">Be the first to know about updates</div>
          <p className="text-sm text-muted">Get an email + browser notification the moment a new node release ships.</p>
        </div>
        <a href="/notify" className="btn btn-primary">Notify me</a>
      </div>

      <div className="mt-6 flex flex-col items-start gap-3 rounded-2xl border border-line p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-semibold">Already running a node?</div>
          <p className="text-sm text-muted">Open its dashboard remotely from anywhere through the secure tunnel.</p>
        </div>
        <a href="/remote" className="btn btn-ghost">Remote access →</a>
      </div>
    </div>
  );
}
