// SPDX-License-Identifier: LicenseRef-Proprietary
// Persistent site footer — present on every page (consistent chrome), with brand, link columns,
// and a live network status strip.
import React from "react";
import { BrandMark } from "./ui";

const COLS = [
  { title: "Network", links: [["Network Map", "/map"], ["Peers Directory", "/peers"], ["Run a Node", "/run"], ["Downloads", "/downloads"]] },
  { title: "Develop", links: [["Documentation", "https://pyraxchain.com/docs.html"], ["Explorer", "https://explorer.pyraxchain.com"], ["RPC & Endpoints", "/run#rpc"]] },
  { title: "PYRAX", links: [["Main site", "https://pyraxchain.com"], ["Token", "https://pyraxchain.com/token.html"], ["NEURAX AI", "https://pyraxchain.com/neurax.html"]] },
];

export default function Footer() {
  const year = new Date().getFullYear();
  const ext = (h: string) => /^https?:/.test(h);
  return (
    <footer className="relative mt-24 border-t border-line bg-[rgba(5,6,9,0.6)]">
      <div className="flame-bar h-[3px] w-full opacity-80" />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <BrandMark variant="horizontal" className="h-7 w-[5.2rem]" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">The home of the PYRAX network. Download a node, watch the live peer map, and connect to a decentralized blockchain built to endure.</p>
          <div className="mt-4 flex items-center gap-2 text-xs text-faint">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--color-positive)] opacity-70" /><span className="relative inline-flex h-2 w-2 rounded-full bg-[color:var(--color-positive)]" /></span>
            Self-hosted · decentralized · no third-party trackers
          </div>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <div className="text-[0.7rem] font-semibold uppercase tracking-wider text-faint">{c.title}</div>
            <ul className="mt-3 space-y-2">
              {c.links.map(([label, href]) => (
                <li key={label}><a href={href} {...(ext(href) ? { target: "_blank", rel: "noreferrer" } : {})} className="text-sm text-muted transition hover:text-ink">{label}</a></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line-soft">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-faint sm:flex-row sm:px-6">
          <span>© {year} PYRAX LLC · Sheridan, WY</span>
          <span className="flex items-center gap-4">
            <a href="https://pyraxchain.com/privacy.html" target="_blank" rel="noreferrer" className="hover:text-ink">Privacy</a>
            <a href="https://pyraxchain.com/terms.html" target="_blank" rel="noreferrer" className="hover:text-ink">Terms</a>
            <a href="/peers" className="hover:text-ink">Status</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
