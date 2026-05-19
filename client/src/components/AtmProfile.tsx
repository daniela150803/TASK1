import { useEffect, useRef } from "react";
import type { ProfilePoint } from "../types/api";

interface Props {
  profile: ProfilePoint[];
}

export function AtmProfile({ profile }: Props) {
  const canvasSpeedRef = useRef<HTMLCanvasElement>(null);
  const canvasTempRef = useRef<HTMLCanvasElement>(null);

  const drawSpeed = () => {
    const canvas = canvasSpeedRef.current;
    if (!canvas || !profile.length) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const padL = 50, padR = 20, padT = 20, padB = 36;
    const iW = W - padL - padR;
    const iH = H - padT - padB;

    const alts = profile.map((p) => p.altitudeKm);
    const speeds = profile.map((p) => p.speed);
    const altMin = Math.min(...alts), altMax = Math.max(...alts);
    const sMin = 0, sMax = Math.max(...speeds, 1);

    const toX = (s: number) => padL + ((s - sMin) / (sMax - sMin)) * iW;
    const toY = (a: number) => padT + iH - ((a - altMin) / (altMax - altMin || 1)) * iH;

    [0, 0.25, 0.5, 0.75, 1].forEach((t) => {
      const alt = altMin + t * (altMax - altMin);
      const y = toY(alt);
      ctx.strokeStyle = "#1e3a5f";
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
      ctx.fillStyle = "#8ba3c4";
      ctx.font = "9px monospace";
      ctx.fillText(alt.toFixed(0), 2, y + 4);
    });

    [0, 0.25, 0.5, 0.75, 1].forEach((t) => {
      const s = sMin + t * (sMax - sMin);
      const x = toX(s);
      ctx.strokeStyle = "#1e3a5f";
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + iH);
      ctx.stroke();
      ctx.fillStyle = "#4a6380";
      ctx.font = "9px monospace";
      ctx.fillText(s.toFixed(0), x - 8, H - padB + 14);
    });

    const grd = ctx.createLinearGradient(0, padT, 0, padT + iH);
    grd.addColorStop(0, "rgba(34,211,238,0.8)");
    grd.addColorStop(1, "rgba(34,211,238,0.2)");

    ctx.beginPath();
    let first = true;
    for (const p of profile) {
      const x = toX(p.speed);
      const y = toY(p.altitudeKm);
      first ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      first = false;
    }
    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 2;
    ctx.stroke();

    for (const p of profile) {
      ctx.beginPath();
      ctx.arc(toX(p.speed), toY(p.altitudeKm), 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "#22d3ee";
      ctx.fill();
    }

    ctx.fillStyle = "#8ba3c4";
    ctx.font = "10px sans-serif";
    ctx.save();
    ctx.translate(10, padT + iH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Altitude (km)", -28, 0);
    ctx.restore();
    ctx.fillText("Avg Speed (m/s)", padL + iW / 2 - 32, H - 6);
  };

  const drawTemp = () => {
    const canvas = canvasTempRef.current;
    if (!canvas || !profile.length) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const padL = 50, padR = 20, padT = 20, padB = 36;
    const iW = W - padL - padR;
    const iH = H - padT - padB;

    const alts = profile.map((p) => p.altitudeKm);
    const temps = profile.map((p) => p.temperature);
    const altMin = Math.min(...alts), altMax = Math.max(...alts);
    const tMin = Math.min(...temps), tMax = Math.max(...temps, tMin + 1);

    const toX = (t: number) => padL + ((t - tMin) / (tMax - tMin)) * iW;
    const toY = (a: number) => padT + iH - ((a - altMin) / (altMax - altMin || 1)) * iH;

    [0, 0.25, 0.5, 0.75, 1].forEach((f) => {
      const alt = altMin + f * (altMax - altMin);
      const y = toY(alt);
      ctx.strokeStyle = "#1e3a5f";
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
      ctx.fillStyle = "#8ba3c4";
      ctx.font = "9px monospace";
      ctx.fillText(alt.toFixed(0), 2, y + 4);
    });

    [0, 0.25, 0.5, 0.75, 1].forEach((f) => {
      const t = tMin + f * (tMax - tMin);
      const x = toX(t);
      ctx.strokeStyle = "#1e3a5f";
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + iH);
      ctx.stroke();
      ctx.fillStyle = "#4a6380";
      ctx.font = "9px monospace";
      ctx.fillText(t.toFixed(0), x - 10, H - padB + 14);
    });

    ctx.beginPath();
    let first = true;
    for (const p of profile) {
      const x = toX(p.temperature);
      const y = toY(p.altitudeKm);
      first ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      first = false;
    }
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 2;
    ctx.stroke();

    for (const p of profile) {
      ctx.beginPath();
      ctx.arc(toX(p.temperature), toY(p.altitudeKm), 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "#f59e0b";
      ctx.fill();
    }

    ctx.fillStyle = "#8ba3c4";
    ctx.font = "10px sans-serif";
    ctx.save();
    ctx.translate(10, padT + iH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Altitude (km)", -28, 0);
    ctx.restore();
    ctx.fillText("Temperature (K)", padL + iW / 2 - 32, H - 6);
  };

  useEffect(() => {
    const setup = (ref: React.RefObject<HTMLCanvasElement | null>) => {
      const c = ref.current;
      if (!c) return;
      c.width = c.offsetWidth;
      c.height = c.offsetHeight;
      const ro = new ResizeObserver(() => {
        c.width = c.offsetWidth;
        c.height = c.offsetHeight;
        drawSpeed();
        drawTemp();
      });
      ro.observe(c);
      return () => ro.disconnect();
    };
    const d1 = setup(canvasSpeedRef);
    const d2 = setup(canvasTempRef);
    return () => { d1?.(); d2?.(); };
  }, []);

  useEffect(() => { drawSpeed(); drawTemp(); }, [profile]);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "#080f1e", border: "1px solid #1e3a5f" }}
    >
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-sm font-semibold text-white">Perfil Atmosférico Multivariable</h2>
        <p className="text-xs mt-0.5" style={{ color: "#4a6380" }}>
          Velocidad y Temperatura vs Altitud · capas atmosféricas
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
        <div style={{ height: 300 }}>
          <div className="px-4 py-2 text-xs font-medium" style={{ color: "#22d3ee" }}>
            Perfil de Temperatura Atmosférica
          </div>
          <canvas ref={canvasSpeedRef} className="w-full" style={{ display: "block", height: 260 }} />
        </div>
        <div style={{ height: 300 }}>
          <div className="px-4 py-2 text-xs font-medium" style={{ color: "#f59e0b" }}>
            Perfil atmosférico multicapa · bandas, gradientes, perfil comparativo
          </div>
          <canvas ref={canvasTempRef} className="w-full" style={{ display: "block", height: 260 }} />
        </div>
      </div>
    </div>
  );
}
