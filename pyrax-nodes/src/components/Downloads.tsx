// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Public downloads hub. Fetches the CURRENT Inferno + CLI installers (Windows / macOS / Linux) with
// real versions and short-lived PRESIGNED download links from /api/downloads (which lists + presigns
// the private Spaces bucket server-side). No Ember here — the nodes site never exposes the seed app.
// Handles three honest states: closed (team kill-switch → notice + signup), no build published yet
// (disabled buttons, no fake links), and live (working per-platform download buttons).
import React, { useEffect, useState } from "react";
import { platformIcon } from "./ui";
import NotifyForm from "./NotifyForm";

interface PlatformDownload { platform: "win" | "mac" | "linux"; label: string; filename: string; url: string }
interface Product { id: string; name: string; note: string; version: string | null; downloads: PlatformDownload[] }
interface DownloadsResponse { ok: boolean; open?: boolean; configured?: boolean; message?: string; products?: Product[] }

type State =
  | { kind: "loading" }
  | { kind: "closed"; message: string }
  | { kind: "ready"; products: Product[] };

export default function Downloads() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let alive = true;
    fetch("/api/downloads", { headers: { accept: "application/json" } })
      .then((r) => r.json() as Promise<DownloadsResponse>)
      .then((d) => {
        if (!alive) return;
        if (d.open === false) {
          setState({ kind: "closed", message: d.message || "Public node downloads open when the testnet goes live." });
          return;
        }
        setState({ kind: "ready", products: d.products || [] });
      })
      .catch(() => { if (alive) setState({ kind: "ready", products: [] }); });
    return () => { alive = false; };
  }, []);

  // Team kill-switch: the link stays in the nav, but the page shows a notice + a signup to be
  // emailed when official public downloads open.
  if (state.kind === "closed") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-[rgba(255,255,255,0.03)] px-3 py-1 text-xs font-medium text-muted"><span className="h-2 w-2 rounded-full bg-[color:var(--color-warning)]" /> Downloads not yet open</span>
            <h1 className="mt-5 text-3xl font-extrabold sm:text-5xl">Download a PYRAX node</h1>
            <p className="mt-4 text-lg leading-relaxed text-muted">{state.message}</p>
            <ul className="mt-5 space-y-2 text-sm text-muted">
              <li className="flex items-center gap-2"><span className="text-[color:var(--color-positive)]">✓</span> Official, checksum-verified public builds</li>
              <li className="flex items-center gap-2"><span className="text-[color:var(--color-positive)]">✓</span> Windows · macOS · Linux + CLI</li>
              <li className="flex items-center gap-2"><span className="text-[color:var(--color-positive)]">✓</span> One email the moment they go live</li>
            </ul>
          </div>
          <NotifyForm purpose="downloads" />
        </div>
      </div>
    );
  }

  const products = state.kind === "ready" ? state.products : [];
  const anyBuild = products.some((p) => p.downloads.length > 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Download a PYRAX node</h1>
        <p className="mt-3 text-lg text-muted">Pick your platform and join the network in minutes. Nodes connect outbound — no port-forwarding required. Every release is checksum-verified by the app on update.</p>
      </div>

      {state.kind === "loading" ? (
        <div className="card mt-8 p-10 text-center text-sm text-muted">Loading downloads…</div>
      ) : !anyBuild ? (
        <div className="card mt-8 p-10 text-center">
          <div className="text-base font-semibold">No public build is available yet</div>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">Official Inferno + CLI installers appear here the moment the first release is published. Get notified below so you don't miss it.</p>
          <a href="/notify" className="btn btn-primary mt-5">Notify me when it's ready</a>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {products.map((product) => (
            <div key={product.id} className="card p-6">
              <div className="flex items-baseline justify-between">
                <h2 className="text-xl font-bold">{product.name}</h2>
                {product.version && <span className="chip chip-muted">v{product.version}</span>}
              </div>
              <p className="mt-1.5 text-sm text-muted">{product.note}</p>
              {product.downloads.length === 0 ? (
                <div className="mt-4 rounded-xl border border-line bg-[rgba(255,255,255,0.02)] p-4 text-sm text-muted">
                  No published build yet — check back soon or get notified below.
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2.5">
                  {product.downloads.map((it) => (
                    <a key={it.platform} href={it.url} rel="noreferrer" className="btn btn-ghost" title={it.filename}>
                      {platformIcon(platformSlug(it.platform), "h-4 w-4")}
                      {it.label}
                    </a>
                  ))}
                </div>
              )}
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

/** Map the feed platform code to the slug platformIcon() expects (windows / macos / linux). */
function platformSlug(p: "win" | "mac" | "linux"): string {
  return p === "win" ? "windows" : p === "mac" ? "macos" : "linux";
}
