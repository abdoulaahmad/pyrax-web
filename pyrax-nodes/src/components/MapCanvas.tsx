// SPDX-License-Identifier: LicenseRef-Proprietary
//
// PYRAX Network Map. 3D is globe.gl styled IDENTICALLY to the node apps (bundled earth-dark texture,
// neon-orange country borders, brand atmosphere, colored node dots, animated arcs). 2D is a matching
// d3-geo flat canvas. Both show: online nodes per network, REAL connection arcs (only edges a node
// actually reports — no fabrication), capital-city markers (hover = name + timezone), a real-time
// day/night terminator, a "countries online" panel, and a branded snapshot export at social-media
// sizes incl. 4K UHD. The 2D/3D choice persists. All assets are bundled — no third-party CDN.
import React, { useEffect, useMemo, useRef, useState } from "react";
import Globe from "globe.gl";
import { geoNaturalEarth1, geoPath, geoGraticule10, geoCircle, geoDistance, geoInterpolate, type GeoProjection } from "d3-geo";

interface NetRow { label: string; name: string; color: string; online: boolean; peers: number }
interface Peer { peerId: string; network: string; kind: string; peers?: string[]; lat?: number; lon?: number; country?: string; city?: string }
interface GNode { peerId: string; lat: number; lng: number; net: string; color: string; kind: string; label: string }
interface Cap { n: string; c: string; lat: number; lng: number; tz: string }

const P = { primary: "#f58722", bolt: "#4c99cc", violet: "#7c5cff", gold: "#fcd03d", ok: "#34d399", text: "#f6f8fc", dim: "#99a2b5" };
const BORDER = "rgba(245,135,34,0.45)", BORDER_CAP = "rgba(245,135,34,0.06)", OCEAN = "#070b12", LAND = "#11161f";
const kindColor = (k: string) => (k === "seed" ? P.bolt : k === "rpc" ? P.violet : P.primary);
const LOGO_URL = "https://pyrax.tor1.cdn.digitaloceanspaces.com/brand/logo-vertical.png";
const MODE_KEY = "pyrax:map-mode";
const SHOT_SIZES = [
  { id: "card", label: "Social card · 1200×630", w: 1200, h: 630 },
  { id: "wide", label: "16:9 · 1920×1080", w: 1920, h: 1080 },
  { id: "uhd", label: "4K UHD · 3840×2160", w: 3840, h: 2160 },
  { id: "square", label: "Square · 1080×1080", w: 1080, h: 1080 },
  { id: "story", label: "Story 9:16 · 1080×1920", w: 1080, h: 1920 },
];
const SAMPLE: [number, number, string][] = [[40.71,-74,"operator"],[51.5,-0.12,"seed"],[35.68,139.69,"operator"],[1.35,103.82,"rpc"],[-33.86,151.2,"operator"],[52.52,13.4,"operator"],[37.77,-122.42,"rpc"],[-23.55,-46.63,"operator"],[19.07,72.87,"operator"],[55.75,37.61,"seed"],[48.85,2.35,"operator"],[25.2,55.27,"rpc"],[-1.29,36.82,"operator"],[-34.6,-58.38,"operator"]];

// Subsolar point (lat,lon where the sun is overhead) for the real-time day/night terminator.
function subsolar(date: Date): [number, number] {
  const rad = Math.PI / 180, deg = 180 / Math.PI;
  const n = date.getTime() / 86400000 + 2440587.5 - 2451545.0;
  const L = (280.460 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * rad;
  const lambda = (((L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) % 360)) * rad;
  const eps = (23.439 - 0.0000004 * n) * rad;
  const decl = Math.asin(Math.sin(eps) * Math.sin(lambda)) * deg;
  const RA = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda)) * deg;
  const GMST = (280.46061837 + 360.98564736629 * n) % 360;
  let lon = RA - GMST; lon = ((lon + 540) % 360) - 180;
  return [decl, lon];
}
function tzClock(tz: string): string {
  const m = /UTC([+-])(\d{2}):(\d{2})/.exec(tz); if (!m) return tz;
  const off = (m[1] === "-" ? -1 : 1) * (+m[2] * 60 + +m[3]);
  const now = new Date(); const local = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + off * 60000);
  return `${String(local.getHours()).padStart(2, "0")}:${String(local.getMinutes()).padStart(2, "0")}`;
}

export default function MapCanvas() {
  const [mode, setMode] = useState<"3d" | "2d">("3d");
  const [nets, setNets] = useState<NetRow[]>([]);
  const [focus, setFocus] = useState("all");
  const [paused, setPaused] = useState(false);
  const [dayNight, setDayNight] = useState(true);
  const [showCaps, setShowCaps] = useState(true);
  const [preview, setPreview] = useState(false);
  const [isLocal, setIsLocal] = useState(false);
  const [shot, setShot] = useState("wide");
  const [capturing, setCapturing] = useState(false);
  const [hover, setHover] = useState<{ x: number; y: number; html: string } | null>(null);
  const [tick, setTick] = useState(0);
  const [worldReady, setWorldReady] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvas2dRef = useRef<HTMLCanvasElement>(null);
  const globeHostRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);
  const worldRef = useRef<any>(null);
  const capsRef = useRef<Cap[]>([]);
  const peersRef = useRef<Peer[]>([]);
  const logoRef = useRef<HTMLImageElement | null>(null);
  const netColor = useRef<Record<string, string>>({});
  const netName = useRef<Record<string, string>>({});
  const dirtyRef = useRef(true);
  const modeRef = useRef<"3d" | "2d">("3d");
  const focusRef = useRef("all");
  const previewRef = useRef(false);
  const dayNightRef = useRef(true);
  const showCapsRef = useRef(true);
  const view2d = useRef({ k: 1, x: 0, y: 0 }); // 2D zoom/pan
  const hits2d = useRef<{ x: number; y: number; html: string }[]>([]);

  useEffect(() => { modeRef.current = mode; dirtyRef.current = true; try { localStorage.setItem(MODE_KEY, mode); } catch {} }, [mode]);
  useEffect(() => { focusRef.current = focus; dirtyRef.current = true; }, [focus]);
  useEffect(() => { previewRef.current = preview; dirtyRef.current = true; }, [preview]);
  useEffect(() => { dayNightRef.current = dayNight; dirtyRef.current = true; }, [dayNight]);
  useEffect(() => { showCapsRef.current = showCaps; dirtyRef.current = true; }, [showCaps]);
  useEffect(() => { try { const m = localStorage.getItem(MODE_KEY); if (m === "2d" || m === "3d") setMode(m); setIsLocal(/^(localhost|127\.|0\.0\.0\.0)/.test(location.hostname)); } catch {} }, []);

  // load world + capitals + logo
  useEffect(() => {
    fetch("/globe/countries.json").then((r) => r.json()).then((j) => { worldRef.current = j; dirtyRef.current = true; setWorldReady(true); }).catch((e) => console.error("[map] world load failed", e));
    fetch("/globe/capitals.json").then((r) => r.json()).then((j) => { capsRef.current = j; dirtyRef.current = true; }).catch(() => {});
    const img = new Image(); img.crossOrigin = "anonymous"; img.onload = () => (logoRef.current = img); img.onerror = () => { const f = new Image(); f.onload = () => (logoRef.current = f); f.src = "/brand/logo-vertical.png"; }; img.src = LOGO_URL;
  }, []);

  // data polling
  useEffect(() => {
    let alive = true;
    const load = () => {
      fetch("/api/networks").then((r) => r.json()).then((d) => { if (!alive || !d.ok) return; setNets(d.networks); netColor.current = Object.fromEntries(d.networks.map((n: NetRow) => [n.label, n.color])); netName.current = Object.fromEntries(d.networks.map((n: NetRow) => [n.label, n.name])); dirtyRef.current = true; }).catch(() => {});
      fetch("/api/peers?network=all", { headers: { accept: "application/json" } }).then((r) => r.json()).then((d) => { if (alive && d.ok) { peersRef.current = d.peers; dirtyRef.current = true; setTick((t) => t + 1); } }).catch(() => {});
    };
    load(); const i = window.setInterval(load, 6000); const clk = window.setInterval(() => setTick((t) => t + 1), 30000);
    return () => { alive = false; window.clearInterval(i); window.clearInterval(clk); };
  }, []);

  function gnodes(): GNode[] {
    const f = focusRef.current;
    if (previewRef.current && isLocal) {
      const labels = nets.length ? nets : [{ label: "forge", color: P.primary, name: "PYRAX Forge" } as NetRow];
      return SAMPLE.map((c, i) => { const nr = labels[i % labels.length]; return { peerId: "sample" + i, lat: c[0], lng: c[1], net: nr.label, color: nr.color, kind: c[2], label: `${nr.name} · ${c[2]} · sample` }; }).filter((n) => f === "all" || n.net === f);
    }
    return peersRef.current.filter((p) => typeof p.lat === "number" && typeof p.lon === "number" && (f === "all" || p.network === f))
      .map((p) => ({ peerId: p.peerId, lng: p.lon!, lat: p.lat!, net: p.network, color: netColor.current[p.network] || P.primary, kind: p.kind, label: `${netName.current[p.network] || p.network} · ${p.kind}${p.country ? " · " + (p.city ? p.city + ", " : "") + p.country : ""}` }));
  }

  // REAL connection arcs: only edges a node actually reports (same network, both online + located).
  function arcs(ns: GNode[]): { startLat: number; startLng: number; endLat: number; endLng: number; color: string }[] {
    const byId = new Map(ns.map((n) => [n.peerId, n]));
    if (previewRef.current && isLocal) { // illustrative sample mesh so the demo shows arcs
      const out: any[] = []; for (let i = 0; i < ns.length; i++) { const a = ns[i], b = ns[(i + 1) % ns.length], c = ns[(i + 3) % ns.length]; if (a.net === b.net) out.push({ startLat: a.lat, startLng: a.lng, endLat: b.lat, endLng: b.lng, color: a.color }); if (a.net === c.net) out.push({ startLat: a.lat, startLng: a.lng, endLat: c.lat, endLng: c.lng, color: a.color }); } return out; }
    const raw = previewRef.current ? [] : peersRef.current;
    const seen = new Set<string>(); const out: any[] = [];
    for (const p of raw) { if (!p.peers || !byId.has(p.peerId)) continue; const a = byId.get(p.peerId)!; for (const pid of p.peers) { const b = byId.get(pid); if (!b || b.net !== a.net) continue; const key = a.peerId < pid ? `${a.peerId}|${pid}` : `${pid}|${a.peerId}`; if (seen.has(key)) continue; seen.add(key); out.push({ startLat: a.lat, startLng: a.lng, endLat: b.lat, endLng: b.lng, color: a.color }); } }
    return out.slice(0, 800);
  }

  const countryStats = useMemo(() => {
    const f = focus; const map: Record<string, { total: number; nets: Record<string, number> }> = {};
    for (const p of peersRef.current) { if (!p.country || (f !== "all" && p.network !== f)) continue; (map[p.country] ||= { total: 0, nets: {} }); map[p.country].total++; map[p.country].nets[p.network] = (map[p.country].nets[p.network] || 0) + 1; }
    return Object.entries(map).map(([country, v]) => ({ country, ...v })).sort((a, b) => b.total - a.total);
  }, [tick, focus, nets]);

  // ===================== 3D (globe.gl) =====================
  // Create the globe ONCE, as soon as the host is mounted + world is loaded + 3D is active.
  useEffect(() => {
    if (globeRef.current || !worldReady || mode !== "3d" || !globeHostRef.current) return;
    try {
      const el = globeHostRef.current;
      const g = new (Globe as any)(el, { rendererConfig: { preserveDrawingBuffer: true, antialias: true } })
        .backgroundColor("rgba(0,0,0,0)")
        .globeImageUrl("/globe/earth-dark.jpg")
        .showGraticules(true).showAtmosphere(true).atmosphereColor(P.primary).atmosphereAltitude(0.18)
        .polygonsData(worldRef.current?.features || []).polygonCapColor(() => BORDER_CAP).polygonSideColor(() => "rgba(0,0,0,0)").polygonStrokeColor(() => BORDER).polygonAltitude(0.006)
        .pointLat((d: any) => d.lat).pointLng((d: any) => d.lng).pointColor((d: any) => d.color).pointAltitude(() => 0.01).pointRadius((d: any) => (d.kind === "rpc" ? 0.42 : 0.32)).pointsMerge(false).pointResolution(32)
        .pointLabel((d: any) => `<div style="font:600 12px Inter,sans-serif;color:#f6f8fc;background:rgba(10,12,19,.96);border:1px solid #232838;border-radius:8px;padding:6px 9px">${d.label}</div>`)
        .arcColor((d: any) => [d.color + "00", d.color, d.color + "00"]).arcStroke(0.6).arcDashLength(0.45).arcDashGap(0.2).arcDashAnimateTime(1600).arcAltitudeAutoScale(0.4).arcCurveResolution(96)
        .arcStartLat((d: any) => d.startLat).arcStartLng((d: any) => d.startLng).arcEndLat((d: any) => d.endLat).arcEndLng((d: any) => d.endLng)
        .labelLat((d: any) => d.lat).labelLng((d: any) => d.lng).labelText(() => "").labelDotRadius(0.16).labelColor(() => "rgba(255,255,255,0.45)").labelResolution(2)
        .labelLabel((d: any) => `<div style="font:600 12px Inter,sans-serif;color:#f6f8fc;background:rgba(10,12,19,.96);border:1px solid #232838;border-radius:8px;padding:6px 9px">${d.n}, ${d.c}<br><span style="color:#99a2b5;font-weight:400">${d.tz} · ${tzClock(d.tz)} local</span></div>`);
      const ctrl = g.controls(); ctrl.autoRotate = !paused; ctrl.autoRotateSpeed = 0.5; ctrl.enableZoom = true; ctrl.enableRotate = true;
      g.pointOfView({ lat: 20, lng: 0, altitude: 2.4 });
      try { g.renderer().setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); } catch {}
      g.width(el.clientWidth || 800).height(el.clientHeight || 500);
      globeRef.current = g;
      setTick((t) => t + 1); // kick the first data push
    } catch (e) { console.error("[map] globe init failed", e); }
  }, [worldReady, mode]);

  // Push node/arc/capital data to the globe whenever it changes (not every frame).
  useEffect(() => {
    const g = globeRef.current; if (!g || mode !== "3d") return;
    try { const ns = gnodes(); g.pointsData(ns); g.arcsData(arcs(ns)); g.labelsData(showCaps ? capsRef.current : []); } catch (e) { console.error("[map] data push", e); }
  }, [mode, tick, focus, preview, showCaps, worldReady]);

  // Resize on entering 3D + drive the real-time day/night sun light per frame.
  useEffect(() => {
    const g = globeRef.current; if (!g || mode !== "3d") return;
    const resize = () => { const el = globeHostRef.current; if (el && el.clientWidth) g.width(el.clientWidth).height(el.clientHeight); };
    resize(); window.addEventListener("resize", resize);
    // Capture the globe's default light intensities ONCE so day/night never darkens below them
    // (earth-dark.jpg is a dark texture — dropping ambient too far makes the globe vanish).
    let raf = 0;
    const lights0 = (typeof g.lights === "function" ? g.lights() : []) || [];
    const dir = lights0.find((l: any) => l.type === "DirectionalLight");
    const amb = lights0.find((l: any) => l.type === "AmbientLight");
    const ambBase = amb ? amb.intensity : 1; const dirBase = dir ? dir.intensity : 1;
    const loop = () => {
      try {
        if (dayNight && dir && typeof g.getCoords === "function") {
          const [sl, so] = subsolar(new Date()); const c = g.getCoords(sl, so, 2);
          dir.position.set(c.x, c.y, c.z); dir.intensity = Math.max(dirBase, 1.6); // sun lights the day side
          if (amb) amb.intensity = Math.max(0.55, ambBase * 0.7);                  // night dimmer but visible
        } else { if (dir) dir.intensity = dirBase; if (amb) amb.intensity = ambBase; }
      } catch { /* keep looping */ }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [mode, dayNight]);

  useEffect(() => { const g = globeRef.current; if (g && mode === "3d") { try { g.controls().autoRotate = !paused; } catch {} } }, [paused, mode]);

  // ===================== 2D (d3-geo canvas) =====================
  useEffect(() => {
    if (mode !== "2d") return;
    const canvas = canvas2dRef.current!, wrap = wrapRef.current!; const ctx = canvas.getContext("2d")!;
    let raf = 0, cw = 0, ch = 0, dpr = 1;
    const resize = () => { dpr = Math.min(window.devicePixelRatio || 1, 2); cw = wrap.clientWidth; ch = wrap.clientHeight; canvas.width = cw * dpr; canvas.height = ch * dpr; canvas.style.width = cw + "px"; canvas.style.height = ch + "px"; dirtyRef.current = true; };
    resize(); window.addEventListener("resize", resize);
    function frame() {
      if (dirtyRef.current) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, cw, ch);
        draw2d(ctx, cw, ch, view2d.current, true); dirtyRef.current = false;
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    // pan + zoom
    let dragging = false, lx = 0, ly = 0;
    const down = (e: PointerEvent) => { dragging = true; lx = e.clientX; ly = e.clientY; };
    const move = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (dragging) { view2d.current.x += e.clientX - lx; view2d.current.y += e.clientY - ly; lx = e.clientX; ly = e.clientY; dirtyRef.current = true; setHover(null); return; }
      const mx = e.clientX - rect.left, my = e.clientY - rect.top; let best: any = null, bd = 13 * 13;
      for (const h of hits2d.current) { const dd = (h.x - mx) ** 2 + (h.y - my) ** 2; if (dd < bd) { bd = dd; best = h; } }
      setHover(best ? { x: best.x, y: best.y, html: best.html } : null);
    };
    const up = () => { dragging = false; };
    const wheel = (e: WheelEvent) => { e.preventDefault(); const f = e.deltaY < 0 ? 1.12 : 1 / 1.12; const nk = Math.max(1, Math.min(8, view2d.current.k * f)); const rect = canvas.getBoundingClientRect(); const mx = e.clientX - rect.left, my = e.clientY - rect.top; view2d.current.x = mx - (mx - view2d.current.x) * (nk / view2d.current.k); view2d.current.y = my - (my - view2d.current.y) * (nk / view2d.current.k); view2d.current.k = nk; dirtyRef.current = true; };
    canvas.addEventListener("pointerdown", down); window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); canvas.addEventListener("wheel", wheel, { passive: false });
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); canvas.removeEventListener("pointerdown", down); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); canvas.removeEventListener("wheel", wheel); };
  }, [mode, tick, isLocal]);

  function draw2d(ctx: CanvasRenderingContext2D, w: number, h: number, view: { k: number; x: number; y: number }, collectHits: boolean) {
    const world = worldRef.current; if (!world) return;
    ctx.save(); ctx.translate(view.x, view.y); ctx.scale(view.k, view.k);
    const proj = geoNaturalEarth1().fitExtent([[12, 12], [w - 12, h - 12]], { type: "Sphere" } as any);
    const path = geoPath(proj as any, ctx);
    ctx.beginPath(); (path as any)({ type: "Sphere" }); ctx.fillStyle = OCEAN; ctx.fill();
    ctx.beginPath(); (path as any)(geoGraticule10()); ctx.lineWidth = 0.4 / view.k; ctx.strokeStyle = "rgba(120,140,170,0.10)"; ctx.stroke();
    ctx.beginPath(); (path as any)(world); ctx.fillStyle = LAND; ctx.fill(); ctx.lineWidth = 0.7 / view.k; ctx.strokeStyle = BORDER; ctx.stroke();
    // day/night night cap
    if (dayNightRef.current) { const [sl, so] = subsolar(new Date()); const night = geoCircle().center([so + 180, -sl]).radius(90)(); ctx.beginPath(); (path as any)(night); ctx.fillStyle = "rgba(2,4,9,0.46)"; ctx.fill(); }
    const ns = gnodes();
    for (const a of arcs(ns)) { const pts = Array.from({ length: 20 }, (_, i) => geoInterpolate([a.startLng, a.startLat], [a.endLng, a.endLat])(i / 19)); ctx.beginPath(); (path as any)({ type: "LineString", coordinates: pts }); ctx.lineWidth = 0.7 / view.k; ctx.strokeStyle = a.color + "55"; ctx.stroke(); }
    if (collectHits) hits2d.current = [];
    if (showCapsRef.current) for (const c of capsRef.current) { const xy = (proj as any)([c.lng, c.lat]); if (!xy) continue; ctx.beginPath(); ctx.arc(xy[0], xy[1], 1.5 / view.k, 0, 6.2832); ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.fill(); if (collectHits) hits2d.current.push({ x: view.x + xy[0] * view.k, y: view.y + xy[1] * view.k, html: `${c.n}, ${c.c} · ${c.tz} (${tzClock(c.tz)})` }); }
    for (const n of ns) { const xy = (proj as any)([n.lng, n.lat]); if (!xy) continue; const r = (n.kind === "rpc" ? 3.4 : 2.7) / view.k; ctx.beginPath(); ctx.arc(xy[0], xy[1], r, 0, 6.2832); ctx.fillStyle = n.color; ctx.shadowColor = n.color; ctx.shadowBlur = 10 / view.k; ctx.fill(); ctx.shadowBlur = 0; if (collectHits) hits2d.current.push({ x: view.x + xy[0] * view.k, y: view.y + xy[1] * view.k, html: n.label }); }
    ctx.restore();
  }

  // ===================== branded snapshot =====================
  async function capture() {
    setCapturing(true);
    try {
      const size = SHOT_SIZES.find((z) => z.id === shot)!; const W = size.w, H = size.h;
      const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d")!;
      const headH = Math.round(H * 0.11), footH = Math.round(H * 0.075);
      x.fillStyle = "#06070b"; x.fillRect(0, 0, W, H);
      const glow = x.createRadialGradient(W / 2, H * 0.5, 60, W / 2, H * 0.5, W * 0.55); glow.addColorStop(0, "rgba(245,134,34,0.10)"); glow.addColorStop(1, "transparent"); x.fillStyle = glow; x.fillRect(0, 0, W, H);
      const mapY = headH, mapH = H - headH - footH;
      if (mode === "3d" && globeRef.current) {
        const g = globeRef.current; const prevW = g.width(), prevH = g.height();
        g.width(W).height(mapH); try { g.renderer().render(g.scene(), g.camera()); } catch {}
        try { const url = g.renderer().domElement.toDataURL("image/png"); await new Promise<void>((res) => { const im = new Image(); im.onload = () => { x.drawImage(im, 0, mapY, W, mapH); res(); }; im.onerror = () => res(); im.src = url; }); } catch {}
        g.width(prevW).height(prevH);
      } else {
        const mc = document.createElement("canvas"); mc.width = W; mc.height = mapH; const mx = mc.getContext("2d")!;
        // fit the 2D map into the export map region
        const world = worldRef.current; if (world) { const proj = geoNaturalEarth1().fitExtent([[20, 20], [W - 20, mapH - 20]], { type: "Sphere" } as any); const path = geoPath(proj as any, mx); mx.fillStyle = OCEAN; mx.beginPath(); (path as any)({ type: "Sphere" }); mx.fill(); mx.beginPath(); (path as any)(geoGraticule10()); mx.lineWidth = 0.6; mx.strokeStyle = "rgba(120,140,170,0.10)"; mx.stroke(); mx.beginPath(); (path as any)(world); mx.fillStyle = LAND; mx.fill(); mx.lineWidth = 0.8; mx.strokeStyle = BORDER; mx.stroke(); if (dayNightRef.current) { const [sl, so] = subsolar(new Date()); mx.beginPath(); (path as any)(geoCircle().center([so + 180, -sl]).radius(90)()); mx.fillStyle = "rgba(2,4,9,0.46)"; mx.fill(); } const ns = gnodes(); for (const a of arcs(ns)) { const pts = Array.from({ length: 24 }, (_, i) => geoInterpolate([a.startLng, a.startLat], [a.endLng, a.endLat])(i / 23)); mx.beginPath(); (path as any)({ type: "LineString", coordinates: pts }); mx.lineWidth = 1.1; mx.strokeStyle = a.color + "66"; mx.stroke(); } for (const n of ns) { const xy = (proj as any)([n.lng, n.lat]); if (!xy) continue; mx.beginPath(); mx.arc(xy[0], xy[1], n.kind === "rpc" ? 5 : 4, 0, 6.2832); mx.fillStyle = n.color; mx.shadowColor = n.color; mx.shadowBlur = 14; mx.fill(); mx.shadowBlur = 0; } }
        x.drawImage(mc, 0, mapY);
      }
      // chrome
      const fb = x.createLinearGradient(0, 0, W, 0); fb.addColorStop(0, "#fcd03d"); fb.addColorStop(0.5, "#f58622"); fb.addColorStop(1, "#d75427"); x.fillStyle = fb; x.fillRect(0, 0, W, Math.max(5, H * 0.006));
      const logo = logoRef.current; const pad = Math.round(W * 0.03);
      if (logo && logo.width) { const lh = headH * 0.62, lw = (logo.width / logo.height) * lh; x.drawImage(logo, pad, (headH - lh) / 2, lw, lh); }
      const onlineTotal = nets.reduce((a, n) => a + (n.peers || 0), 0), onlineNets = nets.filter((n) => n.online).length;
      const netLabel = focus === "all" ? "All networks" : (netName.current[focus] || focus);
      x.textAlign = "right"; x.fillStyle = "#f6f8fc"; x.font = `800 ${Math.round(H * 0.034)}px Inter, Segoe UI, sans-serif`; x.fillText("PYRAX Network Map", W - pad, headH * 0.5);
      x.fillStyle = "#99a2b5"; x.font = `500 ${Math.round(H * 0.019)}px Inter, Segoe UI, sans-serif`; x.fillText(`${netLabel} · ${onlineTotal} node${onlineTotal === 1 ? "" : "s"} online across ${onlineNets} network${onlineNets === 1 ? "" : "s"}`, W - pad, headH * 0.78);
      x.fillStyle = "rgba(255,255,255,0.03)"; x.fillRect(0, H - footH, W, footH);
      x.textAlign = "left"; x.fillStyle = "#f58622"; x.font = `700 ${Math.round(H * 0.022)}px Inter, Segoe UI, sans-serif`; x.fillText("nodes.pyraxchain.com", pad, H - footH * 0.45);
      x.textAlign = "right"; x.fillStyle = "#6a7286"; x.font = `500 ${Math.round(H * 0.017)}px Inter, Segoe UI, sans-serif`; x.fillText(`${mode === "3d" ? "3D globe" : "2D map"} · ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`, W - pad, H - footH * 0.45);
      await new Promise<void>((res) => c.toBlob((b) => { if (b) { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `pyrax-network-map-${size.id}-${Date.now()}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); } res(); }, "image/png"));
    } finally { setCapturing(false); }
  }

  const totalOnline = nets.reduce((a, n) => a + (n.peers || 0), 0);
  const pill = (active: boolean) => `rounded-full border px-3 py-1.5 text-sm transition ${active ? "border-[color:var(--color-brand)] bg-[rgba(245,134,34,0.08)] text-ink" : "border-line text-muted hover:text-ink"}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="text-3xl font-extrabold sm:text-4xl">Network map</h1><p className="mt-2 max-w-xl text-muted">Every located node online across the PYRAX networks, in real time — with real connection arcs, capital cities, and a live day/night terminator.</p></div>
        <div className="text-sm text-muted">{totalOnline.toLocaleString()} node{totalOnline === 1 ? "" : "s"} online</div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="inline-flex overflow-hidden rounded-full border border-line">{(["3d", "2d"] as const).map((m) => (<button key={m} onClick={() => setMode(m)} className={`px-4 py-1.5 text-sm font-semibold transition ${mode === m ? "bg-[rgba(245,134,34,0.12)] text-ink" : "text-muted hover:text-ink"}`}>{m === "3d" ? "3D Globe" : "2D Map"}</button>))}</div>
        <button onClick={() => setFocus("all")} className={pill(focus === "all")}>All</button>
        {nets.map((n) => (<button key={n.label} onClick={() => setFocus(n.label)} className={`flex items-center gap-2 ${pill(focus === n.label)}`}><span className="h-2.5 w-2.5 rounded-full" style={{ background: n.color, boxShadow: `0 0 8px ${n.color}` }} />{n.name}<span className="text-xs text-faint">{n.online ? n.peers : "·"}</span></button>))}
        {mode === "3d" && <button onClick={() => setPaused((v) => !v)} className={pill(paused)}>{paused ? "▶ Play" : "⏸ Pause"}</button>}
        <button onClick={() => setDayNight((v) => !v)} className={pill(dayNight)} title="Real-time day/night">🌓 Day/Night</button>
        <button onClick={() => setShowCaps((v) => !v)} className={pill(showCaps)}>🏙 Capitals</button>
        {isLocal && <button onClick={() => setPreview((v) => !v)} className={`rounded-full border px-3 py-1.5 text-xs transition ${preview ? "border-[color:var(--color-gold)] text-[color:var(--color-gold)]" : "border-line text-faint hover:text-ink"}`}>{preview ? "● sample" : "○ preview"}</button>}
        <div className="ml-auto flex items-center gap-2">
          <select value={shot} onChange={(e) => setShot(e.target.value)} className="rounded-lg border border-line bg-[rgba(5,6,9,0.6)] px-2 py-1.5 text-xs text-muted">{SHOT_SIZES.map((z) => <option key={z.id} value={z.id}>{z.label}</option>)}</select>
          <button onClick={capture} disabled={capturing} className="btn btn-primary py-1.5 text-sm">{capturing ? "Rendering…" : "📸 Capture"}</button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="relative overflow-hidden rounded-2xl border border-line bg-[radial-gradient(circle_at_50%_35%,rgba(245,134,34,0.05),transparent_60%)]">
          <div ref={wrapRef} className="h-[62vh] min-h-[460px] w-full">
            <div ref={globeHostRef} className="h-full w-full" style={{ display: mode === "3d" ? "block" : "none" }} />
            <canvas ref={canvas2dRef} className="h-full w-full cursor-grab active:cursor-grabbing" style={{ display: mode === "2d" ? "block" : "none" }} />
          </div>
          {hover && <div className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-[rgba(10,12,19,0.96)] px-2.5 py-1.5 text-xs text-ink shadow-xl" style={{ left: hover.x, top: hover.y - 8 }} dangerouslySetInnerHTML={{ __html: hover.html }} />}
          {gnodes().length === 0 && <div className="pointer-events-none absolute inset-x-0 bottom-6 text-center text-sm text-faint">Waiting for located nodes to come online…{isLocal ? " (use “preview” to populate)" : ""}</div>}
        </div>

        {/* Countries online */}
        <aside className="rounded-2xl border border-line bg-[rgba(8,10,17,0.5)] p-4">
          <div className="flex items-center justify-between"><h3 className="text-sm font-bold">Countries online</h3><span className="text-xs text-faint">{countryStats.length}</span></div>
          <p className="mt-0.5 text-[0.7rem] text-faint">{focus === "all" ? "All networks" : (netName.current[focus] || focus)}</p>
          <div className="mt-3 max-h-[52vh] space-y-1.5 overflow-y-auto pr-1">
            {countryStats.length === 0 ? <p className="text-xs text-faint">No located nodes yet.</p> : countryStats.map((cs) => (
              <div key={cs.country} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm odd:bg-[rgba(255,255,255,0.02)]">
                <span className="min-w-0 truncate text-ink">{cs.country}</span>
                <span className="flex shrink-0 items-center gap-1.5">{Object.entries(cs.nets).map(([net, n]) => <span key={net} className="h-2 w-2 rounded-full" style={{ background: netColor.current[net] || P.primary, boxShadow: `0 0 5px ${netColor.current[net] || P.primary}` }} title={`${netName.current[net] || net}: ${n}`} />)}<span className="ml-1 font-mono text-xs text-muted">{cs.total}</span></span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
