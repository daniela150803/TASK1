import { useEffect, useRef } from "react";
import type { HistogramBin, BarEntry } from "../types/api";

interface Props {
  histogram: HistogramBin[];
  bar: BarEntry[];
}

export function VorticityViz({ histogram, bar }: Props) {
  const canvasHistRef = useRef<HTMLCanvasElement>(null);
  const canvasBarRef = useRef<HTMLCanvasElement>(null);

  const drawHistogram = () => {
    const canvas = canvasHistRef.current;
    if (!canvas || !histogram.length) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const padL = 50, padR = 20, padT = 20, padB = 36;
    const iW = W - padL - padR;
    const iH = H - padT - padB;
    const n = histogram.length;
    const maxCount = Math.max(...histogram.map((h) => h.count), 1);
    const barW = iW / n * 0.85;

    [0, 0.25, 0.5, 0.75, 1].forEach((t) => {
      const y = padT + iH - t * iH;
      ctx.strokeStyle = "#1e3a5f";
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
      ctx.fillStyle = "#4a6380";
      ctx.font = "9px monospace";
      ctx.fillText(Math.round(t * maxCount).toString(), 2, y + 4);
    });

    histogram.forEach((h, i) => {
      const norm = h.count / maxCount;
      const bh = norm * iH;
      const x = padL + (i / n) * iW + (iW / n - barW) / 2;
      const y = padT + iH - bh;

      const grd = ctx.createLinearGradient(0, y, 0, y + bh);
      grd.addColorStop(0, "rgba(34,211,238,0.9)");
      grd.addColorStop(1, "rgba(34,211,238,0.3)");
      ctx.fillStyle = grd;
      ctx.fillRect(x, y, barW, bh);
    });

    ctx.fillStyle = "#8ba3c4";
    ctx.font = "10px sans-serif";
    ctx.save();
    ctx.translate(12, padT + iH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Count", -16, 0);
    ctx.restore();
    ctx.fillText("Speed (m/s)", padL + iW / 2 - 24, H - 6);

    if (histogram.length <= 20) {
      histogram.forEach((h, i) => {
        if (i % Math.ceil(n / 8) === 0) {
          const x = padL + (i / n) * iW + iW / n / 2;
          ctx.fillStyle = "#4a6380";
          ctx.font = "9px monospace";
          ctx.fillText(h.bin?.toString() ?? String(i), x - 8, H - padB + 14);
        }
      });
    }
  };

  const drawBar = () => {
    const canvas = canvasBarRef.current;
    if (!canvas || !bar.length) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const padL = 50, padR = 20, padT = 20, padB = 36;
    const iW = W - padL - padR;
    const iH = H - padT - padB;
    const n = bar.length;
    const maxSpd = Math.max(...bar.map((b) => b.speed), 1);
    const barW = iW / n * 0.75;

    [0, 0.25, 0.5, 0.75, 1].forEach((t) => {
      const y = padT + iH - t * iH;
      ctx.strokeStyle = "#1e3a5f";
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
      ctx.fillStyle = "#4a6380";
      ctx.font = "9px monospace";
      ctx.fillText((t * maxSpd).toFixed(0), 2, y + 4);
    });

    const months = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

    bar.forEach((b, i) => {
      const norm = b.speed / maxSpd;
      const bh = norm * iH;
      const x = padL + (i / n) * iW + (iW / n - barW) / 2;
      const y = padT + iH - bh;

      const h = Math.round(200 - norm * 140);
      ctx.fillStyle = `hsl(${h},85%,55%)`;
      ctx.fillRect(x, y, barW, bh);

      ctx.fillStyle = "#4a6380";
      ctx.font = "9px monospace";
      const label = b.month != null ? (months[b.month - 1] ?? String(b.month)) : String(i + 1);
      ctx.fillText(label, x + barW / 2 - 8, H - padB + 14);
    });

    ctx.fillStyle = "#8ba3c4";
    ctx.font = "10px sans-serif";
    ctx.save();
    ctx.translate(12, padT + iH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Avg Speed (m/s)", -36, 0);
    ctx.restore();
  };

  useEffect(() => {
    const setup = (ref: React.RefObject<HTMLCanvasElement | null>, draw: () => void) => {
      const c = ref.current;
      if (!c) return;
      c.width = c.offsetWidth;
      c.height = c.offsetHeight;
      const ro = new ResizeObserver(() => {
        c.width = c.offsetWidth;
        c.height = c.offsetHeight;
        draw();
      });
      ro.observe(c);
      return () => ro.disconnect();
    };
    const d1 = setup(canvasHistRef, drawHistogram);
    const d2 = setup(canvasBarRef, drawBar);
    return () => { d1?.(); d2?.(); };
  }, []);

  useEffect(() => { drawHistogram(); }, [histogram]);
  useEffect(() => { drawBar(); }, [bar]);

  return (
    <div className="space-y-4">
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "#080f1e", border: "1px solid #1e3a5f" }}
      >
        <div className="px-4 pt-4 pb-2">
          <h2 className="text-sm font-semibold text-white">Visualización de Vorticidad</h2>
          <p className="text-xs mt-0.5" style={{ color: "#4a6380" }}>
            Relative Vorticity (s⁻¹) · Distribución de frecuencias por velocidad
          </p>
        </div>
        <div style={{ height: 300 }}>
          <canvas ref={canvasHistRef} className="w-full h-full" style={{ display: "block" }} />
        </div>
      </div>

      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "#080f1e", border: "1px solid #1e3a5f" }}
      >
        <div className="px-4 pt-4 pb-2">
          <h2 className="text-sm font-semibold text-white">Relaciones Atmosféricas</h2>
          <p className="text-xs mt-0.5" style={{ color: "#4a6380" }}>
            Distribución de la velocidad del viento por niveles atmosféricos a lo largo del tiempo
          </p>
        </div>
        <div style={{ height: 300 }}>
          <canvas ref={canvasBarRef} className="w-full h-full" style={{ display: "block" }} />
        </div>
      </div>
    </div>
  );
}
