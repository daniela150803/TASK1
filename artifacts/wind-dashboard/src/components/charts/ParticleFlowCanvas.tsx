import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { feature } from "topojson-client";
import type { ParticleField, WindVector } from "@workspace/api-client-react";
import { useChartInteraction, type GeoFocus } from "../ChartInteractionContext";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import worldDataRaw from "world-atlas/countries-110m.json";

let landGeo: GeoJSON.FeatureCollection | GeoJSON.Feature | null = null;
let borderGeo: GeoJSON.FeatureCollection | GeoJSON.Feature | null = null;
try {
  landGeo = feature(
    worldDataRaw as Parameters<typeof feature>[0],
    (worldDataRaw as { objects: { land: Parameters<typeof feature>[1] } }).objects.land
  ) as GeoJSON.FeatureCollection;
  borderGeo = feature(
    worldDataRaw as Parameters<typeof feature>[0],
    (worldDataRaw as { objects: { countries: Parameters<typeof feature>[1] } }).objects.countries
  ) as GeoJSON.FeatureCollection;
} catch { /* ignore */ }

interface Props {
  data: ParticleField | undefined;
  vectorData?: WindVector[] | undefined;
  heatmapData?: WindVector[] | undefined;
  loading: boolean;
}

type GeoParticle = { lat: number; lon: number; age: number; maxAge: number };
type LayerMode = "particles" | "vectors" | "heat" | "combined";
type HoverInfo = {
  x: number;
  y: number;
  lat: number;
  lon: number;
  speed: number;
  u: number;
  v: number;
  source: "Vector" | "Calor";
} | null;

type ProjectResult = [number, number, boolean];

const ROT_LAT = 18;
const MIN_DENSITY = 800;
const MAX_DENSITY = 6200;
const DEFAULT_DENSITY = 3000;

function orthoProject(
  lat: number,
  lon: number,
  cx: number,
  cy: number,
  r: number,
  rotLon: number,
  rotLat: number
): ProjectResult {
  const phi = (lat * Math.PI) / 180;
  const lambda = ((lon - rotLon) * Math.PI) / 180;
  const phi0 = (rotLat * Math.PI) / 180;
  const x = Math.cos(phi) * Math.sin(lambda);
  const y = Math.sin(phi) * Math.cos(phi0) - Math.cos(phi) * Math.cos(lambda) * Math.sin(phi0);
  const z = Math.sin(phi) * Math.sin(phi0) + Math.cos(phi) * Math.cos(lambda) * Math.cos(phi0);
  return [cx + x * r, cy - y * r, z > 0];
}

function makeParticle(): GeoParticle {
  return {
    lat: (Math.random() - 0.5) * 168,
    lon: (Math.random() - 0.5) * 360,
    age: Math.floor(Math.random() * 40),
    maxAge: 50 + Math.floor(Math.random() * 70),
  };
}

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  size: number
) {
  const angle = Math.atan2(ey - sy, ex - sx);
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(ex - Math.cos(angle - Math.PI / 6) * size, ey - Math.sin(angle - Math.PI / 6) * size);
  ctx.lineTo(ex - Math.cos(angle + Math.PI / 6) * size, ey - Math.sin(angle + Math.PI / 6) * size);
  ctx.closePath();
  ctx.fill();
}

export default function ParticleFlowCanvas({ data, vectorData, heatmapData, loading }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const dataRef = useRef<ParticleField | null>(null);
  const vectorsRef = useRef<WindVector[]>([]);
  const heatRef = useRef<WindVector[]>([]);
  const particlesRef = useRef<GeoParticle[]>([]);
  const rotRef = useRef({ lon: 0 });
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const dragRef = useRef<{ active: boolean; x: number; lon: number }>({ active: false, x: 0, lon: 0 });
  const sizeRef = useRef({ w: 980, h: 620, dpr: 1 });

  const [particleSpeed, setParticleSpeed] = useState(0.75);
  const [rotationSpeed, setRotationSpeed] = useState(0.35);
  const [density, setDensity] = useState(DEFAULT_DENSITY);
  const [zoom, setZoom] = useState(1.05);
  const [paused, setPaused] = useState(false);
  const [layerMode, setLayerMode] = useState<LayerMode>("combined");
  const [hover, setHover] = useState<HoverInfo>(null);
  const { geoFocus, setGeoFocus, setActiveVariable } = useChartInteraction();
  const geoFocusRef = useRef<GeoFocus>(null);

  const controlRef = useRef({ particleSpeed, rotationSpeed, density, zoom, paused, layerMode });
  useEffect(() => {
    controlRef.current = { particleSpeed, rotationSpeed, density, zoom, paused, layerMode };
  }, [particleSpeed, rotationSpeed, density, zoom, paused, layerMode]);

  useEffect(() => { if (data) dataRef.current = data; }, [data]);
  useEffect(() => { geoFocusRef.current = geoFocus; }, [geoFocus]);
  useEffect(() => { vectorsRef.current = vectorData ?? []; }, [vectorData]);
  useEffect(() => { heatRef.current = heatmapData ?? []; }, [heatmapData]);

  useEffect(() => {
    const target = Math.max(MIN_DENSITY, Math.min(MAX_DENSITY, Math.round(density)));
    const particles = particlesRef.current;
    if (particles.length < target) {
      particles.push(...Array.from({ length: target - particles.length }, makeParticle));
    } else if (particles.length > target) {
      particles.splice(target);
    }
  }, [density]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(760, Math.floor(rect.width));
      const h = 620;
      sizeRef.current = { w, h, dpr };
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  const speedSummary = useMemo(() => {
    const values = (vectorData?.length ? vectorData : heatmapData ?? []).map((d) => d.speed);
    const max = d3.max(values) ?? 1;
    const avg = values.length ? d3.mean(values) ?? 0 : 0;
    return { max, avg };
  }, [vectorData, heatmapData]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (particlesRef.current.length === 0) {
      particlesRef.current = Array.from({ length: DEFAULT_DENSITY }, makeParticle);
    }

    function windDeg(lat: number, lon: number): [number, number] {
      const d = dataRef.current;
      const phi = (lat * Math.PI) / 180;
      const lambda = (lon * Math.PI) / 180;
      if (!d) {
        const jetBand = Math.exp(-(((Math.abs(lat) - 45) / 12) ** 2));
        const hadley = Math.sin(2 * phi);
        const uDeg = (14 * Math.cos(phi) + 22 * jetBand * Math.sign(lat) + 5 * Math.sin(lambda * 2)) * 0.22;
        const vDeg = (6 * hadley + 3 * Math.cos(lambda * 3) * Math.cos(phi)) * 0.14;
        return [uDeg, vDeg];
      }
      const ni = Math.max(0, Math.min(d.width - 1, Math.floor(((lon + 180) / 360) * d.width)));
      const nj = Math.max(0, Math.min(d.height - 1, Math.floor(((lat + 90) / 180) * d.height)));
      const maxMag = Math.max(Math.abs(d.uMax), Math.abs(d.vMax), 1);
      const idx = nj * d.width + ni;
      return [(d.uField[idx] ?? 0) / maxMag * 3.2, (d.vField[idx] ?? 0) / maxMag * 2.0];
    }

    function trailColor(u: number, v: number, alpha: number): string {
      const norm = Math.min(1, Math.sqrt(u * u + v * v) / 3.5);
      let h: number, l: number;
      if (norm < 0.35) {
        const t = norm / 0.35;
        h = 196 - t * 40; l = 55 + t * 15;
      } else if (norm < 0.7) {
        const t = (norm - 0.35) / 0.35;
        h = 156 - t * 118; l = 65 + t * 10;
      } else {
        const t = (norm - 0.7) / 0.3;
        h = 38 + t * 22; l = 72 + t * 18;
      }
      return `hsla(${h},90%,${l}%,${alpha.toFixed(3)})`;
    }

    function drawBase(cx: number, cy: number, r: number, w: number, h: number) {
      const bg = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.25, r * 0.1, cx, cy, r);
      bg.addColorStop(0, "hsl(214,48%,15%)");
      bg.addColorStop(0.6, "hsl(216,44%,9%)");
      bg.addColorStop(1, "hsl(222,47%,5%)");
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = bg; ctx.fill();

      const halo = ctx.createRadialGradient(cx, cy, r * 0.86, cx, cy, r * 1.2);
      halo.addColorStop(0, "rgba(40,100,200,0)");
      halo.addColorStop(0.48, "rgba(54,132,230,0.09)");
      halo.addColorStop(1, "rgba(40,100,200,0)");
      ctx.beginPath(); ctx.arc(cx, cy, r * 1.2, 0, Math.PI * 2);
      ctx.fillStyle = halo; ctx.fill();

      const vignette = ctx.createLinearGradient(0, 0, w, h);
      vignette.addColorStop(0, "rgba(4,8,20,0.15)");
      vignette.addColorStop(1, "rgba(4,8,20,0.42)");
      ctx.fillStyle = vignette; ctx.fillRect(0, 0, w, h);
    }

    function drawContinents(cx: number, cy: number, r: number, rotLon: number) {
      if (!landGeo && !borderGeo) return;
      const proj = d3.geoOrthographic()
        .scale(r)
        .translate([cx, cy])
        .rotate([-rotLon, -ROT_LAT, 0])
        .clipAngle(90);
      const pathGen = d3.geoPath(proj, ctx);

      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();

      const graticule = d3.geoGraticule().step([30, 30])();
      ctx.beginPath(); pathGen(graticule);
      ctx.strokeStyle = "rgba(90,140,210,0.18)";
      ctx.lineWidth = 0.45;
      ctx.stroke();

      if (landGeo) {
        ctx.beginPath(); pathGen(landGeo as d3.GeoPermissibleObjects);
        ctx.fillStyle = "rgba(50,84,72,0.72)";
        ctx.fill();
        ctx.strokeStyle = "rgba(116,160,135,0.42)";
        ctx.lineWidth = 0.55;
        ctx.stroke();
      }

      if (borderGeo) {
        ctx.beginPath(); pathGen(borderGeo as d3.GeoPermissibleObjects);
        ctx.strokeStyle = "rgba(154,188,160,0.20)";
        ctx.lineWidth = 0.32;
        ctx.stroke();
      }

      ctx.restore();
    }

    function drawHeatLayer(cx: number, cy: number, r: number, rotLon: number) {
      const heat = heatRef.current;
      if (!heat.length) return;
      const maxSpeed = Math.max(d3.max(heat, (d) => d.speed) ?? 1, 1);
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r - 1, 0, Math.PI * 2); ctx.clip();
      ctx.globalCompositeOperation = "screen";

      const step = Math.max(1, Math.floor(heat.length / 950));
      for (let i = 0; i < heat.length; i += step) {
        const pt = heat[i];
        const [x, y, visible] = orthoProject(pt.lat, pt.lon, cx, cy, r, rotLon, ROT_LAT);
        if (!visible) continue;
        const norm = Math.min(1, pt.speed / maxSpeed);
        const radius = 5 + norm * 11;
        const grd = ctx.createRadialGradient(x, y, 0, x, y, radius);
        const c = d3.color(d3.interpolateInferno(norm));
        const rgb = c ? `${c.r},${c.g},${c.b}` : "255,180,60";
        grd.addColorStop(0, `rgba(${rgb},0.34)`);
        grd.addColorStop(0.55, `rgba(${rgb},0.13)`);
        grd.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      ctx.globalCompositeOperation = "source-over";
    }

    function drawVectorLayer(cx: number, cy: number, r: number, rotLon: number, hoverPt: HoverInfo) {
      const vectors = vectorsRef.current;
      if (!vectors.length) return;
      const maxSpeed = Math.max(d3.max(vectors, (d) => d.speed) ?? 1, 1);
      const colorScale = d3.scaleSequential(d3.interpolatePlasma).domain([0, maxSpeed]);
      const step = Math.max(1, Math.floor(vectors.length / 420));

      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r - 1, 0, Math.PI * 2); ctx.clip();
      for (let i = 0; i < vectors.length; i += step) {
        const pt = vectors[i];
        const [sx, sy, visible] = orthoProject(pt.lat, pt.lon, cx, cy, r, rotLon, ROT_LAT);
        if (!visible) continue;
        const mag = Math.max(pt.speed, 0.001);
        const unitU = pt.u / mag;
        const unitV = pt.v / mag;
        const len = 6 + (pt.speed / maxSpeed) * 13;
        const angle = Math.atan2(-unitV, unitU);
        const ex = sx + Math.cos(angle) * len;
        const ey = sy + Math.sin(angle) * len;
        const color = colorScale(pt.speed);
        const selected = hoverPt && Math.abs(hoverPt.lat - pt.lat) < 0.0001 && Math.abs(hoverPt.lon - pt.lon) < 0.0001;

        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.globalAlpha = selected ? 1 : 0.82;
        ctx.lineWidth = selected ? 1.55 : 0.9;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
        drawArrowHead(ctx, sx, sy, ex, ey, selected ? 4.2 : 3.1);

        if (selected) {
          ctx.globalAlpha = 1;
          ctx.beginPath();
          ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255,255,255,0.85)";
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    function drawParticles(cx: number, cy: number, r: number, rotLon: number, dt: number) {
      const ps = particlesRef.current;
      const spd = controlRef.current.particleSpeed;
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r - 1, 0, Math.PI * 2); ctx.clip();

      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        const [uDeg, vDeg] = windDeg(p.lat, p.lon);
        const effU = uDeg * spd;
        const effV = vDeg * spd;
        const [sx, sy, vis] = orthoProject(p.lat, p.lon, cx, cy, r, rotLon, ROT_LAT);
        const nLat = Math.max(-87, Math.min(87, p.lat + effV * dt));
        const nLon = ((p.lon + effU * dt + 540) % 360) - 180;
        const [ex, ey, vis2] = orthoProject(nLat, nLon, cx, cy, r, rotLon, ROT_LAT);

        p.lat = nLat;
        p.lon = nLon;
        p.age += dt;

        if (vis && vis2) {
          const fadeIn = Math.min(1, p.age / 8);
          const fadeOut = Math.max(0, 1 - p.age / p.maxAge);
          const alpha = fadeIn * fadeOut;
          if (alpha > 0.025) {
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey);
            ctx.strokeStyle = trailColor(effU, effV, alpha);
            ctx.lineWidth = 1.35;
            ctx.stroke();
          }
        }
        if (p.age > p.maxAge) ps[i] = makeParticle();
      }
      ctx.restore();
    }

    function drawSharedFocus(cx: number, cy: number, r: number, rotLon: number) {
      const focus = geoFocusRef.current;
      if (!focus) return;
      const [x, y, visible] = orthoProject(focus.lat, focus.lon, cx, cy, r, rotLon, ROT_LAT);
      if (!visible) return;
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r - 1, 0, Math.PI * 2); ctx.clip();
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 180);
      ctx.beginPath();
      ctx.arc(x, y, 8 + pulse * 4, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(125,220,255,0.9)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, 3.4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(125,220,255,0.95)";
      ctx.fill();
      ctx.fillStyle = "rgba(8,14,28,0.86)";
      ctx.strokeStyle = "rgba(125,220,255,0.42)";
      ctx.lineWidth = 0.8;
      const label = focus.variable === "vorticity" ? "ζ" : focus.speed !== undefined ? `${focus.speed.toFixed(1)} m/s` : focus.source;
      const labelW = Math.max(58, label.length * 6 + 14);
      const lx = Math.min(Math.max(x + 12, 8), sizeRef.current.w - labelW - 8);
      const ly = Math.max(8, y - 18);
      ctx.beginPath();
      ctx.roundRect(lx, ly, labelW, 20, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(218,244,255,0.92)";
      ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(label, lx + 7, ly + 13);
      ctx.restore();
    }

    function drawGlowBorder(cx: number, cy: number, r: number) {
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(86,165,245,0.62)";
      ctx.lineWidth = 1.55;
      ctx.stroke();

      const spec = ctx.createRadialGradient(cx - r * 0.34, cy - r * 0.34, 0, cx, cy, r);
      spec.addColorStop(0, "rgba(220,240,255,0.12)");
      spec.addColorStop(0.5, "rgba(180,220,255,0.025)");
      spec.addColorStop(1, "rgba(0,0,0,0)");
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = spec; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      ctx.restore();

      const shadow = ctx.createRadialGradient(cx + r * 0.32, cy, r * 0.36, cx + r * 0.32, cy, r * 1.1);
      shadow.addColorStop(0, "rgba(0,0,0,0)");
      shadow.addColorStop(0.62, "rgba(3,6,16,0)");
      shadow.addColorStop(0.9, "rgba(3,6,16,0.64)");
      shadow.addColorStop(1, "rgba(3,6,16,0)");
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = shadow; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      ctx.restore();
    }

    function findHoverPoint(cx: number, cy: number, r: number, rotLon: number): HoverInfo {
      const { x: mx, y: my } = mouseRef.current;
      const mode = controlRef.current.layerMode;
      const sources: Array<{ label: "Vector" | "Calor"; data: WindVector[] }> = [];
      if (mode === "vectors" || mode === "combined") sources.push({ label: "Vector", data: vectorsRef.current });
      if (mode === "heat" || mode === "combined") sources.push({ label: "Calor", data: heatRef.current });

      let best: HoverInfo = null;
      let bestDist = 24;
      sources.forEach((source) => {
        const step = Math.max(1, Math.floor(source.data.length / 900));
        for (let i = 0; i < source.data.length; i += step) {
          const pt = source.data[i];
          const [x, y, visible] = orthoProject(pt.lat, pt.lon, cx, cy, r, rotLon, ROT_LAT);
          if (!visible) continue;
          const dist = Math.hypot(x - mx, y - my);
          if (dist < bestDist) {
            bestDist = dist;
            best = { x, y, lat: pt.lat, lon: pt.lon, speed: pt.speed, u: pt.u, v: pt.v, source: source.label };
          }
        }
      });
      return best;
    }

    let last = performance.now();
    let hoverTick = 0;
    function frame(now: number) {
      const { w, h, dpr } = sizeRef.current;
      const controls = controlRef.current;
      const width = Math.floor(w * dpr);
      const height = Math.floor(h * dpr);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const dt = Math.min((now - last) / 16, 2.5);
      last = now;
      if (!controls.paused && !dragRef.current.active) {
        rotRef.current.lon += 0.038 * controls.rotationSpeed * dt;
      }

      const cx = w / 2;
      const cy = h / 2 + 8;
      const r = Math.min(w, h) * 0.43 * controls.zoom;
      const rotLon = rotRef.current.lon;
      const mode = controls.layerMode;
      const hoverPt = findHoverPoint(cx, cy, r, rotLon);

      hoverTick += dt;
      if (hoverTick > 8) {
        hoverTick = 0;
        setHover((prev) => {
          if (!hoverPt && !prev) return prev;
          if (!hoverPt || !prev) return hoverPt;
          if (Math.abs(prev.lat - hoverPt.lat) < 0.0001 && Math.abs(prev.lon - hoverPt.lon) < 0.0001 && prev.source === hoverPt.source) return prev;
          return hoverPt;
        });
        if (hoverPt) {
          setActiveVariable("speed");
          setGeoFocus({ lat: hoverPt.lat, lon: hoverPt.lon, speed: hoverPt.speed, u: hoverPt.u, v: hoverPt.v, variable: "speed", source: `Globo · ${hoverPt.source}` });
        } else {
          setGeoFocus(null);
        }
      }

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "hsl(222,47%,5%)";
      ctx.fillRect(0, 0, w, h);
      drawBase(cx, cy, r, w, h);
      drawContinents(cx, cy, r, rotLon);

      if (mode === "heat" || mode === "combined") drawHeatLayer(cx, cy, r, rotLon);
      if (mode === "particles" || mode === "combined") drawParticles(cx, cy, r, rotLon, controls.paused ? 0 : dt);
      if (mode === "vectors" || mode === "combined") drawVectorLayer(cx, cy, r, rotLon, hoverPt);
      drawSharedFocus(cx, cy, r, rotLon);
      drawGlowBorder(cx, cy, r);

      animRef.current = requestAnimationFrame(frame);
    }

    animRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animRef.current);
  }, [setActiveVariable, setGeoFocus]);

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    mouseRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    if (dragRef.current.active) {
      const dx = event.clientX - dragRef.current.x;
      rotRef.current.lon = dragRef.current.lon - dx * 0.32;
    }
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { active: true, x: event.clientX, lon: rotRef.current.lon };
  };

  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current.active = false;
  };

  const onWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const next = Math.max(0.72, Math.min(1.55, zoom + (event.deltaY < 0 ? 0.06 : -0.06)));
    setZoom(Number(next.toFixed(2)));
  };

  const speedLabel = particleSpeed <= 0.45 ? "Muy lento" : particleSpeed <= 0.9 ? "Lento" : particleSpeed <= 1.5 ? "Normal" : "Rápido";
  const rotationLabel = paused || rotationSpeed === 0 ? "quieto" : rotationSpeed <= 0.25 ? "muy lento" : rotationSpeed <= 0.6 ? "lento" : "normal";

  return (
    <div ref={wrapRef} className="relative w-full" style={{ height: 620 }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full rounded cursor-grab active:cursor-grabbing"
        style={{ background: "hsl(222,47%,5%)", touchAction: "none" }}
        onPointerMove={onPointerMove}
        onPointerLeave={() => { mouseRef.current = { x: -9999, y: -9999 }; setHover(null); setGeoFocus(null); }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onWheel={onWheel}
      />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-xs text-[hsl(196,80%,55%)] animate-pulse">Loading wind field…</div>
        </div>
      )}

      <div className="absolute top-3 left-4 right-4 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2 bg-[hsl(222,40%,8%,0.86)] backdrop-blur-sm border border-[hsl(220,30%,16%)] rounded-xl px-3 py-2 shadow-lg">
          {([
            ["particles", "Partículas"],
            ["vectors", "Vectores"],
            ["heat", "Calor"],
            ["combined", "Todo"],
          ] as Array<[LayerMode, string]>).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setLayerMode(value)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
                layerMode === value
                  ? "bg-[hsl(196,80%,45%)] text-[hsl(222,47%,7%)] shadow-[0_0_14px_-4px_hsl(196,80%,45%)]"
                  : "text-[hsl(220,20%,60%)] hover:text-white hover:bg-[hsl(220,25%,18%)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="pointer-events-auto grid grid-cols-2 md:grid-cols-4 gap-2 bg-[hsl(222,40%,8%,0.86)] backdrop-blur-sm border border-[hsl(220,30%,16%)] rounded-xl px-3 py-2 shadow-lg min-w-[520px]">
          <label className="flex flex-col gap-1 text-[10px] text-[hsl(220,20%,55%)]">
            Densidad <span className="text-[hsl(196,80%,65%)] font-mono">{density}</span>
            <input type="range" min={MIN_DENSITY} max={MAX_DENSITY} step={200} value={density} onChange={(e) => setDensity(Number(e.target.value))} className="accent-[hsl(196,80%,45%)]" />
          </label>
          <label className="flex flex-col gap-1 text-[10px] text-[hsl(220,20%,55%)]">
            Zoom <span className="text-[hsl(196,80%,65%)] font-mono">{zoom.toFixed(2)}x</span>
            <input type="range" min={0.72} max={1.55} step={0.03} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="accent-[hsl(196,80%,45%)]" />
          </label>
          <label className="flex flex-col gap-1 text-[10px] text-[hsl(220,20%,55%)]">
            Flujo <span className="text-[hsl(196,80%,65%)] font-mono">{speedLabel}</span>
            <input type="range" min={0.15} max={2.2} step={0.05} value={particleSpeed} onChange={(e) => setParticleSpeed(Number(e.target.value))} className="accent-[hsl(196,80%,45%)]" />
          </label>
          <label className="flex flex-col gap-1 text-[10px] text-[hsl(220,20%,55%)]">
            Rotación <span className="text-[hsl(196,80%,65%)] font-mono">{rotationLabel}</span>
            <input type="range" min={0} max={1.15} step={0.05} value={rotationSpeed} onChange={(e) => setRotationSpeed(Number(e.target.value))} className="accent-[hsl(196,80%,45%)]" />
          </label>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setPaused((value) => !value)}
        className="absolute bottom-4 right-4 bg-[hsl(222,40%,8%,0.88)] backdrop-blur-sm border border-[hsl(220,30%,16%)] hover:border-[hsl(196,80%,45%,0.65)] rounded-lg px-3 py-1.5 text-[10px] text-[hsl(210,40%,86%)] transition-all"
      >
        {paused ? "Reanudar movimiento" : "Dejar quieto"}
      </button>

      {hover && (
        <div
          className="absolute z-20 pointer-events-none rounded-lg border border-[hsl(196,80%,45%,0.45)] bg-[hsl(222,45%,7%,0.94)] px-3 py-2 text-[10px] shadow-xl backdrop-blur-sm"
          style={{ left: Math.min(hover.x + 16, sizeRef.current.w - 190), top: Math.max(12, hover.y - 58) }}
        >
          <div className="mb-1 font-semibold text-[hsl(196,80%,68%)]">{hover.source} · punto de viento</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 font-mono text-[hsl(210,40%,86%)]">
            <span>Vel.</span><span>{hover.speed.toFixed(2)} m/s</span>
            <span>U</span><span>{hover.u.toFixed(2)}</span>
            <span>V</span><span>{hover.v.toFixed(2)}</span>
            <span>Lat/Lon</span><span>{hover.lat.toFixed(1)}°, {hover.lon.toFixed(1)}°</span>
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-4 flex flex-wrap gap-4 text-[10px] text-[hsl(220,20%,48%)] pointer-events-none">
        <span className="flex items-center gap-1.5"><span className="inline-block w-7 h-[1.5px] rounded-full bg-[hsl(196,80%,60%)]" /> Baja</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-7 h-[1.5px] rounded-full bg-[hsl(155,90%,60%)]" /> Media</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-7 h-[1.5px] rounded-full bg-[hsl(38,90%,68%)]" /> Alta</span>
        <span className="text-[hsl(220,20%,38%)]">Arrastra para girar · rueda para zoom · hover para detalle</span>
      </div>

      <div className="absolute top-[76px] left-4 text-[10px] text-[hsl(220,20%,45%)] bg-[hsl(222,40%,8%,0.72)] rounded-lg px-2 py-1 border border-[hsl(220,30%,16%)]">
        Promedio {speedSummary.avg.toFixed(2)} m/s · Máximo {speedSummary.max.toFixed(2)} m/s
      </div>
    </div>
  );
}
