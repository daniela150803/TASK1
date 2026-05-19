import { useEffect, useRef } from "react";
import type { LevelData } from "../types/api";

interface Props {
  levels: LevelData[];
}

function omegaColor(v: number, max: number): string {
  const norm = v / (max || 1);
  if (norm > 0) {
    const i = Math.round(norm * 255);
    return `rgb(${i},${30 + Math.round(norm * 80)},${255 - i})`;
  }
  const i = Math.round(-norm * 255);
  return `rgb(${255 - i},${30 + Math.round(-norm * 80)},${i})`;
}

export function VerticalSection({ levels }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !levels.length) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const padL = 56, padR = 20, padT = 20, padB = 40;
    const iW = W - padL - padR;
    const iH = H - padT - padB;
    const n = levels.length;
    const cellW = iW / n;

    const omegas = levels.map((d) => d.avgOmega ?? d.avgW ?? 0);
    const maxOmega = Math.max(...omegas.map(Math.abs), 0.01);
    const alts = levels.map((d) => d.altitudeKm);
    const altMin = Math.min(...alts);
    const altMax = Math.max(...alts);

    const toY = (alt: number) =>
      padT + iH - ((alt - altMin) / (altMax - altMin || 1)) * iH;

    for (let i = 0; i < n; i++) {
      const d = levels[i];
      const omega = d.avgOmega ?? d.avgW ?? 0;
      const x = padL + i * cellW;
      const y = toY(d.altitudeKm);
      const h = Math.max(4, cellW * 0.9);
      ctx.fillStyle = omegaColor(omega, maxOmega);
      ctx.globalAlpha = 0.85;
      ctx.fillRect(x, y - 6, h, 12);
      ctx.globalAlpha = 1;
    }

    ctx.strokeStyle = "#1e3a5f";
    ctx.lineWidth = 0.5;
    [0, 0.25, 0.5, 0.75, 1].forEach((t) => {
      const alt = altMin + t * (altMax - altMin);
      const y = toY(alt);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
      ctx.fillStyle = "#8ba3c4";
      ctx.font = "10px monospace";
      ctx.fillText(alt.toFixed(0) + " km", 2, y + 4);
    });

    if (n <= 20) {
      for (let i = 0; i < n; i += Math.ceil(n / 8)) {
        const x = padL + i * cellW + cellW / 2;
        ctx.fillStyle = "#4a6380";
        ctx.font = "9px monospace";
        ctx.fillText(String(levels[i].level), x - 8, H - padB + 14);
      }
    }

    ctx.fillStyle = "#8ba3c4";
    ctx.font = "10px sans-serif";
    ctx.save();
    ctx.translate(10, padT + iH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Altitude (km)", -30, 0);
    ctx.restore();
    ctx.fillText("Atmospheric Level", padL + iW / 2 - 40, H - 8);

    const gw = 100, gh = 10, gx = W - gw - padR, gy = padT;
    const grd = ctx.createLinearGradient(gx, 0, gx + gw, 0);
    grd.addColorStop(0, "rgb(0,30,255)");
    grd.addColorStop(0.5, "rgb(30,30,30)");
    grd.addColorStop(1, "rgb(255,30,0)");
    ctx.fillStyle = grd;
    ctx.fillRect(gx, gy, gw, gh);
    ctx.fillStyle = "#8ba3c4";
    ctx.font = "9px monospace";
    ctx.fillText(`-${maxOmega.toFixed(1)}`, gx - 2, gy + 20);
    ctx.fillText(`+${maxOmega.toFixed(1)}`, gx + gw - 20, gy + 20);
  }, [levels]);

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
        <h2 className="text-sm font-semibold text-white">Sección Transversal del Flujo Vertical</h2>
        <p className="text-xs mt-0.5" style={{ color: "#4a6380" }}>
          Cuadrícula D3 — ω (m/s) por nivel de altitud · escala de color divergente
        </p>
      </div>
      <div style={{ height: 320 }}>
        <canvas ref={canvasRef} className="w-full h-full" style={{ display: "block" }} />
      </div>
    </div>
  );
}
