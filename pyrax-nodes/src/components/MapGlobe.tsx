// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Interactive 3D network map (globe.gl / three.js). Plots every ONLINE, geo-located node as a point
// coloured by its network; hover for details. A legend shows per-network online counts and lets you
// focus one network. Auto-rotates until you interact. Mounted client-only (needs WebGL).
import React, { useEffect, useMemo, useRef, useState } from "react";
import Globe from "globe.gl";

interface NetRow { label: string; name: string; color: string; online: boolean; peers: number }
interface Peer { peerId: string; network: string; kind: string; lat?: number; lon?: number; country?: string; city?: string }
interface Pt { lat: number; lng: number; color: string; size: number; net: string; label: string }

const TEX = "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-dark.jpg";
const BUMP = "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png";

// Localhost-only preview markers so the visualization can be evaluated before real located nodes
// exist (geo needs public IPs). Never shown in production.
const SAMPLE_CITIES: [number, number, string][] = [
  [40.71, -74.0, "New York"], [51.5, -0.12, "London"], [35.68, 139.69, "Tokyo"], [1.35, 103.82, "Singapore"],
  [-33.86, 151.2, "Sydney"], [52.52, 13.4, "Berlin"], [37.77, -122.42, "San Francisco"], [-23.55, -46.63, "São Paulo"],
  [19.07, 72.87, "Mumbai"], [55.75, 37.61, "Moscow"], [48.85, 2.35, "Paris"], [25.2, 55.27, "Dubai"],
];

export default function MapGlobe() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);
  const [nets, setNets] = useState<NetRow[]>([]);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [focus, setFocus] = useState<string>("all");
  const [preview, setPreview] = useState(false);
  const [isLocal, setIsLocal] = useState(false);

  useEffect(() => { try { setIsLocal(/^(localhost|127\.|0\.0\.0\.0)/.test(location.hostname)); } catch {} }, []);

  // data polling
  useEffect(() => {
    let alive = true;
    const load = () => {
      fetch("/api/networks").then((r) => r.json()).then((d) => { if (alive && d.ok) setNets(d.networks); }).catch(() => {});
      fetch("/api/peers?network=all", { headers: { accept: "application/json" } }).then((r) => r.json()).then((d) => { if (alive && d.ok) setPeers(d.peers); }).catch(() => {});
    };
    load();
    const i = window.setInterval(load, 6000);
    return () => { alive = false; window.clearInterval(i); };
  }, []);

  const colorByNet = useMemo(() => Object.fromEntries(nets.map((n) => [n.label, n.color])), [nets]);
  const nameByNet = useMemo(() => Object.fromEntries(nets.map((n) => [n.label, n.name])), [nets]);

  const points: Pt[] = useMemo(() => {
    const real = peers
      .filter((p) => typeof p.lat === "number" && typeof p.lon === "number" && (focus === "all" || p.network === focus))
      .map((p) => ({ lat: p.lat!, lng: p.lon!, color: colorByNet[p.network] || "#f58622", size: p.kind === "rpc" ? 0.42 : 0.3, net: p.network, label: `<div style="font:600 12px Inter,sans-serif;color:#f7f9fd;background:rgba(10,12,19,.95);border:1px solid #232838;border-radius:8px;padding:6px 9px"><div>${nameByNet[p.network] || p.network} · ${p.kind}</div><div style="color:#9aa4ba;font-weight:400">${p.city ? p.city + ", " : ""}${p.country || ""}</div></div>` }));
    if (preview && isLocal) {
      const labels = nets.length ? nets : [{ label: "forge", color: "#f58622", name: "PYRAX Forge" } as any];
      return SAMPLE_CITIES.map((c, i) => { const n = labels[i % labels.length]; return { lat: c[0], lng: c[1], color: n.color, size: 0.32, net: n.label, label: `<div style="font:600 12px Inter,sans-serif;color:#f7f9fd;background:rgba(10,12,19,.95);border:1px solid #232838;border-radius:8px;padding:6px 9px">${n.name} · sample<br><span style="color:#9aa4ba;font-weight:400">${c[2]}</span></div>` }; });
    }
    return real;
  }, [peers, focus, colorByNet, nameByNet, preview, isLocal, nets]);

  // init globe once
  useEffect(() => {
    if (!wrapRef.current || globeRef.current) return;
    const g = (Globe as any)()(wrapRef.current)
      .backgroundColor("rgba(0,0,0,0)")
      .globeImageUrl(TEX)
      .bumpImageUrl(BUMP)
      .showAtmosphere(true)
      .atmosphereColor("#f58622")
      .atmosphereAltitude(0.18)
      .pointsData([])
      .pointLat("lat").pointLng("lng").pointColor("color")
      .pointAltitude(0.04).pointRadius("size").pointsMerge(false)
      .pointLabel("label");
    g.controls().autoRotate = true;
    g.controls().autoRotateSpeed = 0.5;
    g.controls().enableZoom = true;
    const size = () => { const w = wrapRef.current!.clientWidth; const h = wrapRef.current!.clientHeight; g.width(w).height(h); };
    size();
    window.addEventListener("resize", size);
    globeRef.current = g;
    return () => { window.removeEventListener("resize", size); try { g._destructor?.(); } catch {} globeRef.current = null; };
  }, []);

  // push points on change
  useEffect(() => { if (globeRef.current) globeRef.current.pointsData(points); }, [points]);

  const totalOnline = nets.reduce((a, n) => a + (n.peers || 0), 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold sm:text-4xl">Network map</h1>
          <p className="mt-2 max-w-xl text-muted">Every located node online across the PYRAX networks, in real time. Drag to spin, scroll to zoom, hover a node for details.</p>
        </div>
        <div className="text-sm text-muted">{totalOnline.toLocaleString()} node{totalOnline === 1 ? "" : "s"} online</div>
      </div>

      {/* legend / focus */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button onClick={() => setFocus("all")} className={`rounded-full border px-3 py-1.5 text-sm transition ${focus === "all" ? "border-[color:var(--color-brand)] bg-[rgba(245,134,34,0.08)] text-ink" : "border-line text-muted hover:text-ink"}`}>All networks</button>
        {nets.map((n) => (
          <button key={n.label} onClick={() => setFocus(n.label)} className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${focus === n.label ? "border-[color:var(--color-brand)] bg-[rgba(245,134,34,0.08)] text-ink" : "border-line text-muted hover:text-ink"}`}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: n.color, boxShadow: `0 0 8px ${n.color}` }} />
            {n.name}<span className="text-xs text-faint">{n.online ? n.peers : "·"}</span>
          </button>
        ))}
        {isLocal && <button onClick={() => setPreview((v) => !v)} className={`ml-auto rounded-full border px-3 py-1.5 text-xs transition ${preview ? "border-[color:var(--color-gold)] text-[color:var(--color-gold)]" : "border-line text-faint hover:text-ink"}`}>{preview ? "● sample nodes (dev)" : "○ preview sample nodes"}</button>}
      </div>

      <div className="relative mt-5 overflow-hidden rounded-2xl border border-line bg-[radial-gradient(circle_at_50%_30%,rgba(245,134,34,0.06),transparent_60%)]">
        <div ref={wrapRef} className="h-[58vh] min-h-[420px] w-full" />
        {points.length === 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-6 text-center text-sm text-faint">Waiting for located nodes to come online…{isLocal ? " (use “preview sample nodes” to see the map populated)" : ""}</div>
        )}
      </div>
    </div>
  );
}
