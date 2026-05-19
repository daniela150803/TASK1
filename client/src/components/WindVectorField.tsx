import { useEffect, useRef } from "react";
import type { WindVector } from "../types/api";

interface Props {
  vectors: WindVector[];
}

export function WindVectorField({ vectors }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !vectors.length) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const lats = vectors.map((v) => v.lat);
    const lons = vectors.map((v) => v.lon);
    const latMin = Math.min(...lats), latMax = Math.max(...lats);
    const lonMin = Math.min(...lons), lonMax = Math.max(...lons);
    const pad = 24;

    const toX = (lon: number) => pad + ((lon - lonMin) / (lonMax - lonMin || 1)) * (W - pad * 2);
    const toY = (lat: number) => H - pad - ((lat - latMin) / (latMax - latMin || 1)) * (H - pad * 2);

    const maxSpeed = Math.max(...vectors.map((v) => v.speed), 1);

    for (const v of vectors) {
      const x = toX(v.lon);
      const y = toY(v.lat);
      const norm = v.speed / maxSpeed;
      const len = 4 + norm * 14;
      const angle = Math.atan2(-v.v, v.u);
      const h = Math.round(200 - norm * 200);
      const alpha = 0.5 + norm * 0.5;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.strokeStyle = `hsla(${h},90%,65%,${alpha.toFixed(2)})`;
      ctx.lineWidth = 0.8 + norm * 0.8;
      ctx.beginPath();
      ctx.moveTo(-len / 2, 0);
      ctx.lineTo(len / 2, 0);
      ctx.moveTo(len / 2 - 4, -3);
      ctx.lineTo(len / 2, 0);
      ctx.lineTo(len / 2 - 4, 3);
      ctx.stroke();
      ctx.restore();
    }

    const gradU = ctx.createLinearGradient(W - 110, 0, W - 10, 0);
    gradU.addColorStop(0, "hsl(200,90%,65%)");
    gradU.addColorStop(1, "hsl(0,90%,65%)");
    ctx.fillStyle = gradU;
    ctx.fillRect(W - 110, H - 20, 100, 8);
    ctx.fillStyle = "#8ba3c4";
    ctx.font = "10px monospace";
    ctx.fillText(`0`, W - 114, H - 13);
    ctx.fillText(`${maxSpeed.toFixed(0)} m/s`, W - 66, H - 24);
  }, [vectors]);

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
        <h2 className="text-sm font-semibold text-white">Campo Vectorial del Viento</h2>
        <p className="text-xs mt-0.5" style={{ color: "#4a6380" }}>
          Ejes U/V · flechas coloreadas por velocidad
        </p>
      </div>
      <div style={{ height: 300 }}>
        <canvas ref={canvasRef} className="w-full h-full" style={{ display: "block" }} />
      </div>
    </div>
  );
}
