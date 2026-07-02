// SPDX-License-Identifier: LicenseRef-Proprietary
//
// macOS Gatekeeper "app is damaged and can't be opened" helper. PYRAX macOS builds are not yet
// Apple-notarized, so Gatekeeper quarantines a freshly-downloaded app and shows the scary
// "…is damaged" dialog. The one-time fix is to clear the com.apple.quarantine attribute with
// `xattr`. This banner sits at the top of every download page: pick the app you're installing and
// it shows the exact command (with the correct /Applications/<App>.app path or CLI folder) + a
// one-click copy. Self-contained (no site-specific CSS classes) so it drops into team/devnet/nodes.
import React, { useState } from "react";

interface AppTarget { id: string; label: string; cmd: string; hint: string }

// The command clears the quarantine flag recursively. For the two desktop apps it targets the
// installed .app bundle (productName from electron-builder: "Inferno Node" and "Ember"); for the
// CLI it targets the folder you extracted the archive into (which holds pyrax + the miners).
const APPS: AppTarget[] = [
  {
    id: "inferno",
    label: "Inferno Node (.app)",
    cmd: 'xattr -cr "/Applications/Inferno Node.app"',
    hint: "Run after dragging Inferno Node into Applications.",
  },
  {
    id: "ember",
    label: "Ember (.app)",
    cmd: 'xattr -cr "/Applications/Ember.app"',
    hint: "Run after dragging Ember into Applications.",
  },
  {
    id: "cli",
    label: "PYRAX CLI (archive)",
    cmd: "xattr -cr ~/Downloads/pyrax-cli-*-mac",
    hint: "Point it at the folder you extracted the CLI tarball into.",
  },
];

// The Apple logo (nominative use — it labels macOS-specific instructions).
function AppleMark() {
  return (
    <svg
      viewBox="0 0 384 512"
      aria-hidden="true"
      className="h-14 w-14 shrink-0 text-red-300 sm:h-20 sm:w-20"
      fill="currentColor"
    >
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

export default function MacGatekeeperBanner() {
  const [sel, setSel] = useState<string>(APPS[0].id);
  const [copied, setCopied] = useState(false);
  const app = APPS.find((a) => a.id === sel) ?? APPS[0];

  const copy = () => {
    navigator.clipboard?.writeText(app.cmd).then(
      () => { setCopied(true); window.setTimeout(() => setCopied(false), 1600); },
      () => {},
    );
  };

  return (
    <div className="mb-8 flex items-center gap-5 rounded-2xl border-2 border-red-500/70 bg-red-500/[0.06] p-5 sm:gap-6 sm:p-6">
      <AppleMark />
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-bold text-red-200 sm:text-lg">
          macOS: “app is damaged and can’t be opened”? Read this first.
        </h3>
        <p className="mt-1 text-sm text-muted">
          Our macOS builds aren’t Apple-notarized yet, so Gatekeeper quarantines the download. It’s
          safe — clear the flag once in <span className="font-semibold">Terminal</span>. Pick your app:
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={sel}
            onChange={(e) => { setSel(e.target.value); setCopied(false); }}
            className="rounded-lg border border-line bg-[rgba(0,0,0,0.35)] px-3 py-2 text-sm font-medium outline-none focus:border-red-400"
            aria-label="Select the app you're installing"
          >
            {APPS.map((a) => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </select>
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-line bg-[rgba(0,0,0,0.5)] px-3 py-2">
            <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-[13px] text-red-100">{app.cmd}</code>
            <button
              type="button"
              onClick={copy}
              className="shrink-0 rounded-md border border-red-500/60 px-2.5 py-1 text-xs font-semibold text-red-200 transition hover:bg-red-500/20"
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted">{app.hint} If it still won’t open, right-click the app → Open → Open.</p>
      </div>
    </div>
  );
}
