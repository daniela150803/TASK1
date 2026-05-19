import { useEffect, useRef } from "react";
import type { WindPoint } from "../types/api";

interface Props {
  heatmapData: WindPoint[];
  vectorData: WindPoint[];
  loading: boolean;
}

function speedToColor(speed: number, maxSpeed: number): string {
  const t = Math.min(1, speed / maxSpeed);
  const r = Math.round(t * 255);
  const g = Math.round((1 - Math.abs(t - 0.5) * 2) * 200);
  const b = Math.round((1 - t) * 255);
  return `rgba(${r},${g},${b},0.75)`;
}

export function WindMap({ heatmapData, vectorData, loading }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || heatmapData.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const maxSpeed = Math.max(...heatmapData.map((p) => p.speed), 1);

    for (const pt of heatmapData) {
      const x = ((pt.lon + 180) / 360) * W;
      const y = ((90 - pt.lat) / 180) * H;
      const size = W / 36;
      ctx.fillStyle = speedToColor(pt.speed, maxSpeed);
      ctx.fillRect(x - size / 2, y - size / 2, size, size);
    }

    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 1;
    const step = Math.max(1, Math.floor(vectorData.length / 200));
    for (let i = 0; i < vectorData.length; i += step) {
      const pt = vectorData[i];
      const x = ((pt.lon + 180) / 360) * W;
      const y = ((90 - pt.lat) / 180) * H;
      const scale = 0.4;
      const dx = pt.u * scale;
      const dy = -pt.v * scale;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + dx, y + dy);
      const angle = Math.atan2(dy, dx);
      const arrowLen = 4;
      ctx.lineTo(
        x + dx - arrowLen * Math.cos(angle - Math.PI / 6),
        y + dy - arrowLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(x + dx, y + dy);
      ctx.lineTo(
        x + dx - arrowLen * Math.cos(angle + Math.PI / 6),
        y + dy - arrowLen * Math.sin(angle + Math.PI / 6)
      );
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 0.5;
    for (let lon = -180; lon <= 180; lon += 30) {
      const x = ((lon + 180) / 360) * W;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let lat = -90; lat <= 90; lat += 30) {
      const y = ((90 - lat) / 180) * H;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "10px Inter";
    for (let lon = -150; lon <= 180; lon += 60) {
      const x = ((lon + 180) / 360) * W;
      ctx.fillText(`${lon}°`, x + 2, H - 4);
    }
    for (let lat = -60; lat <= 90; lat += 30) {
      const y = ((90 - lat) / 180) * H;
      ctx.fillText(`${lat}°`, 2, y - 2);
    }
  }, [heatmapData, vectorData]);

  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <h3 className="text-sm font-semibold text-white mb-3">
        Wind Heatmap &amp; Vector Field
      </h3>
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface/80 rounded-lg z-10">
            <span className="text-muted text-sm">Loading...</span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          width={720}
          height={360}
          className="w-full rounded-lg"
          style={{ background: "hsl(222,47%,10%)" }}
        />
        <div className="flex items-center gap-2 mt-2 text-xs text-muted">
          <div
            className="w-24 h-2 rounded"
            style={{
              background: "linear-gradient(to right, #0000ff, #00c800, #ff0000)",
            }}
          />
          <span>Low → High speed</span>
          <span className="ml-auto">Arrows = wind direction</span>
        </div>
      </div>
    </div>
  );
}
