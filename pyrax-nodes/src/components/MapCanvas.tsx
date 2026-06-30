// SPDX-License-Identifier: LicenseRef-Proprietary
//
// PYRAX Network Map — a single d3-geo canvas renderer with a 2D⇄3D toggle. 3D is a draggable
// orthographic globe with vector country borders; 2D is a flat Natural-Earth map. Both plot online,
// geo-located nodes (coloured per network) and draw connection arcs between same-network peers.
// "Capture" renders a branded PYRAX network-map PNG (logo served from DO Spaces) for download.
// All assets (world topojson, Earth styling) are local/bundled — no third-party CDN at runtime.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { geoOrthographic, geoNaturalEarth1, geoPath, geoGraticule10, geoDistance, geoInterpolate, type GeoProjection } from "d3-geo";
import { feature, mesh } from "topojson-client";

interface NetRow { label: string; name: string; color: string; online: boolean; peers: number }
interface Peer { peerId: string; network: string; kind: string; lat?: number; lon?: number; country?: string; city?: string }
interface Node { lng: number; lat: number; net: string; color: string; kind: string; label: string }

const LOGO_URL = "https://pyrax.tor1.cdn.digitaloceanspaces.com/brand/logo-vertical.png";
const C = { ocean: "#0a1019", land: "#19212f", border: "rgba(125,145,180,0.38)", grat: "rgba(120,140,170,0.10)", rim: "rgba(245,134,34,0.55)" };
const SAMPLE: [number, number, string][] = [[40.71,-74],[51.5,-0.12],[35.68,139.69],[1.35,103.82],[-33.86,151.2],[52.52,13.4],[37.77,-122.42],[-23.55,-46.63],[19.07,72.87],[55.75,37.61],[48.85,2.35],[25.2,55.27],[-1.29,36.82],[-34.6,-58.38]];

export default function MapCanvas() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<"3d" | "2d">("3d");
  const [nets, setNets] = useState<NetRow[]>([]);
  const [focus, setFocus] = useState("all");
  const [preview, setPreview] = useState(false);
  const [isLocal, setIsLocal] = useState(false);
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);

  // refs the render loop reads
  const worldRef = useRef<{ countries: any; borders: any } | null>(null);
  const peersRef = useRef<Peer[]>([]);
  const netColorRef = useRef<Record<string, string>>({});
  const netNameRef = useRef<Record<string, string>>({});
  const rotateRef = useRef<[number, number]>([-10, -25]);
  const autoRef = useRef(true);
  const dirtyRef = useRef(true);
  const modeRef = useRef<"3d" | "2d">("3d");
  const focusRef = useRef("all");
  const previewRef = useRef(false);
  const hitsRef = useRef<{ x: number; y: number; node: Node }[]>([]);
  const logoRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => { modeRef.current = mode; dirtyRef.current = true; }, [mode]);
  useEffect(() => { focusRef.current = focus; dirtyRef.current = true; }, [focus]);
  useEffect(() => { previewRef.current = preview; dirtyRef.current = true; }, [preview]);
  useEffect(() => { try { setIsLocal(/^(localhost|127\.|0\.0\.0\.0)/.test(location.hostname)); } catch {} }, []);

  // load world topojson + the branded logo
  useEffect(() => {
    fetch("/geo/countries-50m.json").then((r) => r.json()).then((topo) => {
      worldRef.current = { countries: (feature as any)(topo, topo.objects.countries), borders: (mesh as any)(topo, topo.objects.countries, (a: any, b: any) => a !== b) };
      dirtyRef.current = true; setReady(true);
    }).catch(() => setReady(true));
    const img = new Image(); img.crossOrigin = "anonymous";
    img.onload = () => { logoRef.current = img; };
    img.onerror = () => { const f = new Image(); f.onload = () => (logoRef.current = f); f.src = "/brand/logo-vertical.png"; };
    img.src = LOGO_URL;
  }, []);

  // data polling
  useEffect(() => {
    let alive = true;
    const load = () => {
      fetch("/api/networks").then((r) => r.json()).then((d) => { if (!alive || !d.ok) return; setNets(d.networks); netColorRef.current = Object.fromEntries(d.networks.map((n: NetRow) => [n.label, n.color])); netNameRef.current = Object.fromEntries(d.networks.map((n: NetRow) => [n.label, n.name])); dirtyRef.current = true; }).catch(() => {});
      fetch("/api/peers?network=all", { headers: { accept: "application/json" } }).then((r) => r.json()).then((d) => { if (alive && d.ok) { peersRef.current = d.peers; dirtyRef.current = true; } }).catch(() => {});
    };
    load(); const i = window.setInterval(load, 6000);
    return () => { alive = false; window.clearInterval(i); };
  }, []);

  function nodes(): Node[] {
    const f = focusRef.current;
    if (previewRef.current && isLocal) {
      const labels = nets.length ? nets : [{ label: "forge", color: "#f58622", name: "PYRAX Forge" } as NetRow];
      return SAMPLE.filter(() => true).map((c, i) => { const n = labels[i % labels.length]; return { lat: c[0], lng: c[1], net: n.label, color: n.color, kind: "operator", label: `${n.name} · sample` }; })
        .filter((n) => f === "all" || n.net === f);
    }
    return peersRef.current.filter((p) => typeof p.lat === "number" && typeof p.lon === "number" && (f === "all" || p.network === f))
      .map((p) => ({ lng: p.lon!, lat: p.lat!, net: p.network, color: netColorRef.current[p.network] || "#f58622", kind: p.kind, label: `${netNameRef.current[p.network] || p.network} · ${p.kind}${p.country ? " · " + (p.city ? p.city + ", " : "") + p.country : ""}` }));
  }

  function edges(ns: Node[]): [Node, Node][] {
    const byNet: Record<string, Node[]> = {};
    for (const n of ns) (byNet[n.net] ||= []).push(n);
    const out: [Node, Node][] = []; const seen = new Set<string>();
    for (const arr of Object.values(byNet)) {
      for (let i = 0; i < arr.length; i++) {
        const d = arr.map((o, j) => [j === i ? Infinity : geoDistance([arr[i].lng, arr[i].lat], [o.lng, o.lat]), j] as [number, number]).sort((a, b) => a[0] - b[0]);
        for (let k = 0; k < Math.min(2, d.length); k++) { const j = d[k][1]; if (!isFinite(d[k][0])) continue; const key = i < j ? `${arr[i].net}:${i}-${j}` : `${arr[i].net}:${j}-${i}`; if (seen.has(key)) continue; seen.add(key); out.push([arr[i], arr[j]]); }
      }
    }
    return out.slice(0, 600);
  }

  function projectionFor(mode: "3d" | "2d", w: number, h: number, pad = 12): GeoProjection {
    const p = mode === "3d" ? geoOrthographic().rotate(rotateRef.current).clipAngle(90) : geoNaturalEarth1();
    p.fitExtent([[pad, pad], [w - pad, h - pad]], { type: "Sphere" } as any);
    return p;
  }

  // the scene draw — reused by the live canvas and the export
  function drawScene(ctx: CanvasRenderingContext2D, w: number, h: number, mode: "3d" | "2d", proj: GeoProjection, opts: { collectHits?: boolean } = {}) {
    const path = geoPath(proj, ctx);
    const world = worldRef.current;
    // ocean / sphere
    ctx.beginPath(); (path as any)({ type: "Sphere" });
    if (mode === "3d") { const c = (proj as any)([(rotateRef.current[0] * -1), (rotateRef.current[1] * -1)]); const cx = c ? c[0] : w / 2, cy = c ? c[1] : h / 2; const g = ctx.createRadialGradient(cx, cy, 10, w / 2, h / 2, Math.min(w, h) * 0.55); g.addColorStop(0, "#0d1622"); g.addColorStop(1, C.ocean); ctx.fillStyle = g; } else ctx.fillStyle = C.ocean;
    ctx.fill();
    // graticule
    ctx.beginPath(); (path as any)(geoGraticule10()); ctx.lineWidth = 0.5; ctx.strokeStyle = C.grat; ctx.stroke();
    // countries + borders
    if (world) {
      ctx.beginPath(); (path as any)(world.countries); ctx.fillStyle = C.land; ctx.fill();
      ctx.beginPath(); (path as any)(world.borders); ctx.lineWidth = 0.6; ctx.strokeStyle = C.border; ctx.stroke();
    }
    // sphere rim glow (3d)
    if (mode === "3d") { ctx.beginPath(); (path as any)({ type: "Sphere" }); ctx.lineWidth = 1.4; ctx.strokeStyle = C.rim; ctx.shadowColor = "rgba(245,134,34,0.6)"; ctx.shadowBlur = 22; ctx.stroke(); ctx.shadowBlur = 0; }
    // connections
    const ns = nodes();
    const center: [number, number] = [rotateRef.current[0] * -1, rotateRef.current[1] * -1];
    const visible = (n: Node) => mode === "2d" || geoDistance([n.lng, n.lat], center) < Math.PI / 2 + 0.08;
    for (const [a, b] of edges(ns)) {
      if (mode === "3d" && !visible(a) && !visible(b)) continue;
      const pts = Array.from({ length: 24 }, (_, i) => geoInterpolate([a.lng, a.lat], [b.lng, b.lat])(i / 23));
      ctx.beginPath(); (path as any)({ type: "LineString", coordinates: pts });
      ctx.lineWidth = 0.8; ctx.strokeStyle = (netColorRef.current[a.net] || "#f58622") + "44"; ctx.stroke();
    }
    // nodes
    if (opts.collectHits) hitsRef.current = [];
    for (const n of ns) {
      if (!visible(n)) continue;
      const xy = (proj as any)([n.lng, n.lat]); if (!xy) continue;
      const r = n.kind === "rpc" ? 3.6 : 2.8;
      ctx.beginPath(); ctx.arc(xy[0], xy[1], r, 0, 6.2832); ctx.fillStyle = n.color; ctx.shadowColor = n.color; ctx.shadowBlur = 12; ctx.fill(); ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.arc(xy[0], xy[1], r + 2.4, 0, 6.2832); ctx.strokeStyle = n.color + "55"; ctx.lineWidth = 1; ctx.stroke();
      if (opts.collectHits) hitsRef.current.push({ x: xy[0], y: xy[1], node: n });
    }
  }

  // live render loop
  useEffect(() => {
    if (!ready) return;
    let raf = 0; const canvas = canvasRef.current!, wrap = wrapRef.current!;
    const ctx = canvas.getContext("2d")!;
    let cw = 0, ch = 0, dpr = 1;
    function resize() { dpr = Math.min(window.devicePixelRatio || 1, 2); cw = wrap.clientWidth; ch = wrap.clientHeight; canvas.width = cw * dpr; canvas.height = ch * dpr; canvas.style.width = cw + "px"; canvas.style.height = ch + "px"; dirtyRef.current = true; }
    resize(); window.addEventListener("resize", resize);
    function frame() {
      if (modeRef.current === "3d" && autoRef.current) { rotateRef.current = [rotateRef.current[0] + 0.18, rotateRef.current[1]]; dirtyRef.current = true; }
      if (dirtyRef.current) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, cw, ch);
        drawScene(ctx, cw, ch, modeRef.current, projectionFor(modeRef.current, cw, ch), { collectHits: true });
        dirtyRef.current = false;
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    // drag to rotate (3d) / pointer
    let dragging = false, lx = 0, ly = 0;
    const down = (e: PointerEvent) => { if (modeRef.current !== "3d") return; dragging = true; autoRef.current = false; lx = e.clientX; ly = e.clientY; (e.target as Element).setPointerCapture?.(e.pointerId); };
    const move = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (dragging) { const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; const k = 0.3; rotateRef.current = [rotateRef.current[0] + dx * k, Math.max(-90, Math.min(90, rotateRef.current[1] - dy * k))]; dirtyRef.current = true; setHover(null); return; }
      const mx = e.clientX - rect.left, my = e.clientY - rect.top; let best: any = null, bd = 13 * 13;
      for (const h of hitsRef.current) { const dd = (h.x - mx) ** 2 + (h.y - my) ** 2; if (dd < bd) { bd = dd; best = h; } }
      setHover(best ? { x: best.x, y: best.y, text: best.node.label } : null);
    };
    const up = () => { dragging = false; };
    canvas.addEventListener("pointerdown", down); window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); canvas.removeEventListener("pointerdown", down); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [ready, isLocal]);

  // branded screenshot
  async function capture() {
    setCapturing(true);
    try {
      const W = 1600, H = 1000;
      const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d")!;
      x.fillStyle = "#06070b"; x.fillRect(0, 0, W, H);
      const glow = x.createRadialGradient(W / 2, H * 0.46, 60, W / 2, H * 0.46, W * 0.55); glow.addColorStop(0, "rgba(245,134,34,0.12)"); glow.addColorStop(1, "transparent"); x.fillStyle = glow; x.fillRect(0, 0, W, H);
      // map region (leave header + footer)
      const proj = (modeRef.current === "3d" ? geoOrthographic().rotate(rotateRef.current).clipAngle(90) : geoNaturalEarth1());
      (proj as any).fitExtent([[70, 150], [W - 70, H - 120]], { type: "Sphere" });
      drawScene(x, W, H, modeRef.current, proj as any);
      // header flame bar
      const fb = x.createLinearGradient(0, 0, W, 0); fb.addColorStop(0, "#fcd03d"); fb.addColorStop(0.5, "#f58622"); fb.addColorStop(1, "#d75427"); x.fillStyle = fb; x.fillRect(0, 0, W, 7);
      // logo
      const logo = logoRef.current; if (logo && logo.width) { const lh = 92, lw = (logo.width / logo.height) * lh; x.drawImage(logo, 54, 40, lw, lh); }
      // title + subtitle
      const onlineTotal = nets.reduce((a, n) => a + (n.peers || 0), 0); const onlineNets = nets.filter((n) => n.online).length;
      const netLabel = focus === "all" ? "All networks" : (netNameRef.current[focus] || focus);
      x.textAlign = "right"; x.fillStyle = "#f7f9fd"; x.font = "800 38px Inter, Segoe UI, sans-serif"; x.fillText("PYRAX Network Map", W - 54, 70);
      x.fillStyle = "#9aa4ba"; x.font = "500 20px Inter, Segoe UI, sans-serif"; x.fillText(`${netLabel} · ${onlineTotal} node${onlineTotal === 1 ? "" : "s"} online across ${onlineNets} network${onlineNets === 1 ? "" : "s"}`, W - 54, 102);
      // footer
      x.fillStyle = "rgba(255,255,255,0.04)"; x.fillRect(0, H - 64, W, 64);
      x.textAlign = "left"; x.fillStyle = "#f58622"; x.font = "700 22px Inter, Segoe UI, sans-serif"; x.fillText("nodes.pyraxchain.com", 54, H - 26);
      x.textAlign = "right"; x.fillStyle = "#6a7286"; x.font = "500 18px Inter, Segoe UI, sans-serif";
      const dt = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";
      x.fillText(`${mode === "3d" ? "3D globe" : "2D map"} · ${dt}`, W - 54, H - 26);
      // legend dots
      let lx2 = 54;
      x.textAlign = "left"; x.font = "600 16px Inter, sans-serif";
      for (const n of nets) { x.beginPath(); x.arc(lx2 + 6, H - 88, 6, 0, 6.2832); x.fillStyle = n.color; x.fill(); x.fillStyle = "#9aa4ba"; x.fillText(n.name, lx2 + 18, H - 83); lx2 += x.measureText(n.name).width + 46; }

      await new Promise<void>((res) => c.toBlob((blob) => { if (blob) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `pyrax-network-map-${Date.now()}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); } res(); }, "image/png"));
    } finally { setCapturing(false); }
  }

  const totalOnline = nets.reduce((a, n) => a + (n.peers || 0), 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold sm:text-4xl">Network map</h1>
          <p className="mt-2 max-w-xl text-muted">Every located node online across the PYRAX networks, in real time. {mode === "3d" ? "Drag to spin the globe." : "Flat world view."} Hover a node for details.</p>
        </div>
        <div className="text-sm text-muted">{totalOnline.toLocaleString()} node{totalOnline === 1 ? "" : "s"} online</div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {/* 2D / 3D toggle */}
        <div className="inline-flex overflow-hidden rounded-full border border-line">
          {(["3d", "2d"] as const).map((m) => (
            <button key={m} onClick={() => { setMode(m); autoRef.current = m === "3d"; }} className={`px-4 py-1.5 text-sm font-semibold transition ${mode === m ? "bg-[rgba(245,134,34,0.12)] text-ink" : "text-muted hover:text-ink"}`}>{m === "3d" ? "3D Globe" : "2D Map"}</button>
          ))}
        </div>
        <button onClick={() => setFocus("all")} className={`rounded-full border px-3 py-1.5 text-sm transition ${focus === "all" ? "border-[color:var(--color-brand)] bg-[rgba(245,134,34,0.08)] text-ink" : "border-line text-muted hover:text-ink"}`}>All</button>
        {nets.map((n) => (
          <button key={n.label} onClick={() => setFocus(n.label)} className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${focus === n.label ? "border-[color:var(--color-brand)] bg-[rgba(245,134,34,0.08)] text-ink" : "border-line text-muted hover:text-ink"}`}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: n.color, boxShadow: `0 0 8px ${n.color}` }} />{n.name}<span className="text-xs text-faint">{n.online ? n.peers : "·"}</span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {isLocal && <button onClick={() => setPreview((v) => !v)} className={`rounded-full border px-3 py-1.5 text-xs transition ${preview ? "border-[color:var(--color-gold)] text-[color:var(--color-gold)]" : "border-line text-faint hover:text-ink"}`}>{preview ? "● sample nodes" : "○ preview"}</button>}
          <button onClick={capture} disabled={capturing} className="btn btn-primary py-1.5 text-sm">{capturing ? "Capturing…" : "📸 Capture map"}</button>
        </div>
      </div>

      <div className="relative mt-5 overflow-hidden rounded-2xl border border-line bg-[radial-gradient(circle_at_50%_35%,rgba(245,134,34,0.05),transparent_60%)]">
        <div ref={wrapRef} className="h-[60vh] min-h-[440px] w-full">
          <canvas ref={canvasRef} className={mode === "3d" ? "cursor-grab active:cursor-grabbing" : "cursor-default"} />
        </div>
        {hover && <div className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-[rgba(10,12,19,0.96)] px-2.5 py-1.5 text-xs text-ink shadow-xl" style={{ left: hover.x, top: hover.y - 8 }}>{hover.text}</div>}
        {!ready && <div className="absolute inset-0 grid place-items-center text-sm text-muted">Loading map…</div>}
        {ready && nodes().length === 0 && <div className="pointer-events-none absolute inset-x-0 bottom-6 text-center text-sm text-faint">Waiting for located nodes to come online…{isLocal ? " (use “preview” to populate the map)" : ""}</div>}
      </div>
    </div>
  );
}
