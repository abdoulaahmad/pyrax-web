// SPDX-License-Identifier: LicenseRef-Proprietary
// Landing hero — animated headline, live online-node counter (from /api/networks), and CTAs.
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function Hero() {
  const [online, setOnline] = useState<number | null>(null);
  const [nets, setNets] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = () => fetch("/api/networks").then((r) => r.json()).then((d) => {
      if (!alive || !d.ok) return;
      setOnline(d.networks.reduce((a: number, n: any) => a + (n.peers || 0), 0));
      setNets(d.networks.filter((n: any) => n.online).length);
    }).catch(() => {});
    load();
    const i = window.setInterval(load, 10_000);
    return () => { alive = false; window.clearInterval(i); };
  }, []);

  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-10%] h-[480px] w-[820px] -translate-x-1/2 rounded-full opacity-40 blur-3xl" style={{ background: "radial-gradient(closest-side, rgba(245,134,34,0.25), transparent)" }} />
      </div>
      <div className="mx-auto max-w-7xl px-4 pt-20 pb-10 sm:px-6 sm:pt-28">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-[rgba(255,255,255,0.03)] px-3 py-1 text-xs font-medium text-muted">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--color-positive)] opacity-70" /><span className="relative inline-flex h-2 w-2 rounded-full bg-[color:var(--color-positive)]" /></span>
            {online === null ? "Connecting to the network…" : `${online.toLocaleString()} node${online === 1 ? "" : "s"} online across ${nets} network${nets === 1 ? "" : "s"}`}
          </span>
          <h1 className="mt-6 max-w-4xl text-balance text-4xl font-extrabold leading-[1.05] sm:text-6xl">
            The home of the <span className="flame-text">PYRAX</span> network
          </h1>
          <p className="mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-muted">
            Download a node, watch the live peer map, and connect to a decentralized blockchain built to endure. Run a node from anywhere — no port-forwarding, no gatekeepers.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <a href="/downloads" className="btn btn-primary px-6 py-3 text-base">Get the node app</a>
            <a href="/map" className="btn btn-ghost px-6 py-3 text-base">Explore the 3D map</a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
