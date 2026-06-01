import { useEffect, useRef } from "react";
import type { HeatmapPoint } from "../types/api";

interface Props {
  heatmap: HeatmapPoint[];
}

function speedToColor(norm: number): string {
  const stops = [
    [0, "#313695"],
    [0.25, "#4575b4"],
    [0.5, "#fee090"],
    [0.75, "#f46d43"],
    [1, "#a50026"],
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const t0 = stops[i][0] as number;
    const t1 = stops[i + 1][0] as number;
    if (norm >= t0 && norm <= t1) {
      const t = (norm - t0) / (t1 - t0);
      return lerpColor(stops[i][1] as string, stops[i + 1][1] as string, t);
    }
  }
  return stops[stops.length - 1][1] as string;
}

function lerpColor(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ra = (pa >> 16) & 0xff, ga = (pa >> 8) & 0xff, ba = pa & 0xff;
  const rb = (pb >> 16) & 0xff, gb = (pb >> 8) & 0xff, bb = pb & 0xff;
  const r = Math.round(ra + (rb - ra) * t);
  const g = Math.round(ga + (gb - ga) * t);
  const bv = Math.round(ba + (bb - ba) * t);
  return `rgb(${r},${g},${bv})`;
}

export function SpeedHeatmap({ heatmap }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !heatmap.length) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const speeds = heatmap.map((p) => p.speed);
    const maxSpd = Math.max(...speeds, 1);
    const minSpd = Math.min(...speeds, 0);

    const lats = heatmap.map((p) => p.lat);
    const lons = heatmap.map((p) => p.lon);
    const latMin = Math.min(...lats), latMax = Math.max(...lats);
    const lonMin = Math.min(...lons), lonMax = Math.max(...lons);
    const pad = 20;

    const toX = (lon: number) => pad + ((lon - lonMin) / (lonMax - lonMin || 1)) * (W - pad * 2);
    const toY = (lat: number) => H - pad - ((lat - latMin) / (latMax - latMin || 1)) * (H - pad * 2);

    const cellW = Math.max(2, (W - pad * 2) / Math.sqrt(heatmap.length) * 1.1);
    const cellH = Math.max(2, (H - pad * 2) / Math.sqrt(heatmap.length) * 1.1);

    for (const p of heatmap) {
      const norm = (p.speed - minSpd) / (maxSpd - minSpd || 1);
      ctx.fillStyle = speedToColor(norm);
      ctx.globalAlpha = 0.85;
      ctx.fillRect(toX(p.lon) - cellW / 2, toY(p.lat) - cellH / 2, cellW, cellH);
    }
    ctx.globalAlpha = 1;

    const gw = 120, gh = 10, gx = W - gw - pad, gy = H - 30;
    for (let i = 0; i < gw; i++) {
      ctx.fillStyle = speedToColor(i / gw);
      ctx.fillRect(gx + i, gy, 1, gh);
    }
    ctx.fillStyle = "#8ba3c4";
    ctx.font = "10px monospace";
    ctx.fillText(`${minSpd.toFixed(0)}`, gx, gy + 22);
    ctx.fillText(`${maxSpd.toFixed(0)} m/s`, gx + gw - 36, gy + 22);
    ctx.fillText("Speed (m/s)", gx + gw / 2 - 24, gy - 4);
  }, [heatmap]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const ro = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "#080f1e", border: "1px solid #1e3a5f" }}
    >
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-sm font-semibold text-white">Mapa de Calor de Velocidad</h2>
        <p className="text-xs mt-0.5" style={{ color: "#4a6380" }}>
          Distribución espacial · escala de color divergente por velocidad
        </p>
      </div>
      <div style={{ height: 300 }}>
        <canvas ref={canvasRef} className="w-full h-full" style={{ display: "block" }} />
      </div>
    </div>
  );
}
