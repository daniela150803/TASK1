import { useEffect, useRef } from "react";
import type { ParticlePoint } from "../types/api";

interface Props {
  particles: ParticlePoint[];
}

interface Tracer {
  lat: number;
  lon: number;
  u: number;
  v: number;
  age: number;
  maxAge: number;
  x: number;
  y: number;
}

function toRad(d: number) { return d * Math.PI / 180; }

function orthographicProject(
  lat: number, lon: number,
  rotLon: number, rotLat: number,
  cx: number, cy: number, r: number
): [number, number] | null {
  const phi = toRad(lat);
  const lam = toRad(lon) - toRad(rotLon);
  const phi0 = toRad(rotLat);
  const cosc = Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(lam);
  if (cosc < 0) return null;
  const x = cx + r * Math.cos(phi) * Math.sin(lam);
  const y = cy - r * (Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(lam));
  return [x, y];
}

async function fetchWorldTopology() {
  const res = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json");
  return res.json();
}

export function ParticleGlobe({ particles }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotRef = useRef(0);
  const rafRef = useRef<number>(0);
  const tracersRef = useRef<Tracer[]>([]);
  const topoRef = useRef<any>(null);
  const countriesRef = useRef<[number, number][][]>([]);

  useEffect(() => {
    fetchWorldTopology().then((topo) => {
      topoRef.current = topo;
      const geom = topo.objects.countries;
      const arcs: number[][][] = topo.arcs;
      const lines: [number, number][][] = [];
      for (const f of geom.geometries) {
        const parseRings = (rings: number[][]) => {
          const pts: [number, number][] = [];
          for (const arcIdx of rings) {
            const rev = arcIdx < 0;
            const aIdx = rev ? ~arcIdx : arcIdx;
            const arc = arcs[aIdx];
            let dx = 0, dy = 0;
            const points = arc.map(([x, y]) => {
              dx += x; dy += y;
              return [dx / 32, dy / 32] as [number, number];
            });
            if (rev) points.reverse();
            pts.push(...points);
          }
          return pts;
        };
        if (f.type === "Polygon") {
          for (const ring of f.arcs) lines.push(parseRings(ring));
        } else if (f.type === "MultiPolygon") {
          for (const poly of f.arcs) for (const ring of poly) lines.push(parseRings(ring));
        }
      }
      countriesRef.current = lines;
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!particles.length) return;
    const maxTracers = 600;
    const sample = particles.length > maxTracers
      ? particles.filter((_, i) => i % Math.ceil(particles.length / maxTracers) === 0)
      : particles;
    tracersRef.current = sample.map((p) => ({
      lat: p.lat, lon: p.lon, u: p.u, v: p.v,
      age: Math.random() * 60,
      maxAge: 40 + Math.random() * 40,
      x: p.lon, y: p.lat,
    }));
  }, [particles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      const cx = W / 2;
      const cy = H / 2;
      const r = Math.min(W, H) * 0.44;
      const rotLon = rotRef.current;
      const rotLat = 20;

      ctx.clearRect(0, 0, W, H);

      const grad = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 1.1);
      grad.addColorStop(0, "rgba(40,100,200,0.07)");
      grad.addColorStop(0.7, "rgba(70,140,230,0.18)");
      grad.addColorStop(1, "rgba(70,140,230,0.55)");
      ctx.beginPath();
      ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = "#030a14";
      ctx.fill();

      const countries = countriesRef.current;
      if (countries.length) {
        ctx.strokeStyle = "rgba(100,180,220,0.18)";
        ctx.lineWidth = 0.5;
        for (const ring of countries) {
          let started = false;
          ctx.beginPath();
          for (const [lon, lat] of ring) {
            const pt = orthographicProject(lat, lon, rotLon, rotLat, cx, cy, r);
            if (!pt) { started = false; continue; }
            if (!started) { ctx.moveTo(pt[0], pt[1]); started = true; }
            else ctx.lineTo(pt[0], pt[1]);
          }
          ctx.stroke();
        }
      } else {
        for (let lat = -80; lat <= 80; lat += 20) {
          ctx.beginPath();
          let f = true;
          for (let lon = -180; lon <= 180; lon += 3) {
            const pt = orthographicProject(lat, lon, rotLon, rotLat, cx, cy, r);
            if (!pt) { f = true; continue; }
            f ? ctx.moveTo(pt[0], pt[1]) : ctx.lineTo(pt[0], pt[1]);
            f = false;
          }
          ctx.strokeStyle = "rgba(100,180,220,0.08)";
          ctx.lineWidth = 0.4;
          ctx.stroke();
        }
      }

      const tracers = tracersRef.current;
      for (const t of tracers) {
        t.age++;
        const speed = Math.sqrt(t.u ** 2 + t.v ** 2);
        const dlat = t.v * 0.12;
        const dlon = t.u * 0.12 / Math.max(0.1, Math.cos(toRad(t.lat)));
        t.lat += dlat;
        t.lon += dlon;
        if (t.lat > 90) t.lat = 90;
        if (t.lat < -90) t.lat = -90;
        t.lon = ((t.lon + 180) % 360) - 180;

        if (t.age > t.maxAge) {
          const src = particles[Math.floor(Math.random() * particles.length)];
          Object.assign(t, { lat: src.lat, lon: src.lon, u: src.u, v: src.v, age: 0 });
        }

        const pt = orthographicProject(t.lat, t.lon, rotLon, rotLat, cx, cy, r);
        if (!pt) continue;

        const alpha = Math.min(1, t.age / 10) * (1 - t.age / t.maxAge);
        const norm = Math.min(1, speed / 60);
        const h = Math.round(180 - norm * 180);
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], 1.2, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${h},90%,65%,${alpha.toFixed(2)})`;
        ctx.fill();
      }

      rotRef.current = (rotRef.current + 0.08) % 360;
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [particles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    });
    ro.observe(canvas);
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    return () => ro.disconnect();
  }, []);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "#080f1e", border: "1px solid #1e3a5f" }}
    >
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-sm font-semibold text-white">Simulación de Flujo de Partículas</h2>
        <p className="text-xs mt-0.5" style={{ color: "#4a6380" }}>
          Globo ortográfico · Trazadores de partículas U/V · Usa el control deslizante para ajustar la velocidad
        </p>
      </div>
      <div className="relative" style={{ height: 480 }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ display: "block" }}
        />
        <span
          className="absolute top-3 right-4 text-xs"
          style={{ color: "#4a6380" }}
        >
          Ortográfico · rotando
        </span>
      </div>
    </div>
  );
}
