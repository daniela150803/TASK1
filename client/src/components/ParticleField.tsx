import { useEffect, useRef } from "react";
import type { ParticleField as ParticleFieldData } from "../types/api";

interface Props {
  data: ParticleFieldData | null;
  loading: boolean;
}

interface Particle {
  x: number;
  y: number;
  age: number;
  maxAge: number;
}

export function ParticleField({ data, loading }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const numParticles = 600;

    function createParticle(): Particle {
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        age: 0,
        maxAge: 60 + Math.random() * 80,
      };
    }

    particlesRef.current = Array.from({ length: numParticles }, createParticle);

    function getUV(x: number, y: number): [number, number] {
      const fi = Math.floor((x / W) * data!.width);
      const fj = Math.floor((y / H) * data!.height);
      const i = Math.max(0, Math.min(data!.width - 1, fi));
      const j = Math.max(0, Math.min(data!.height - 1, fj));
      const idx = j * data!.width + i;
      const u = data!.uField[idx] ?? 0;
      const v = data!.vField[idx] ?? 0;
      const scale = 1.5;
      return [
        (u / (Math.max(Math.abs(data!.uMax), Math.abs(data!.uMin)) || 1)) * scale,
        (-v / (Math.max(Math.abs(data!.vMax), Math.abs(data!.vMin)) || 1)) * scale,
      ];
    }

    function frame() {
      ctx!.fillStyle = "rgba(10,14,28,0.15)";
      ctx!.fillRect(0, 0, W, H);

      for (let k = 0; k < particlesRef.current.length; k++) {
        const p = particlesRef.current[k];
        const [du, dv] = getUV(p.x, p.y);
        const nx = p.x + du;
        const ny = p.y + dv;

        const alpha = Math.sin((p.age / p.maxAge) * Math.PI) * 0.7;
        ctx!.strokeStyle = `rgba(14,165,233,${alpha})`;
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        ctx!.moveTo(p.x, p.y);
        ctx!.lineTo(nx, ny);
        ctx!.stroke();

        p.x = nx;
        p.y = ny;
        p.age++;

        if (
          p.age >= p.maxAge ||
          p.x < 0 ||
          p.x > W ||
          p.y < 0 ||
          p.y > H
        ) {
          particlesRef.current[k] = createParticle();
        }
      }

      animRef.current = requestAnimationFrame(frame);
    }

    ctx.fillStyle = "hsl(222,47%,10%)";
    ctx.fillRect(0, 0, W, H);
    animRef.current = requestAnimationFrame(frame);

    return () => {
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);
    };
  }, [data]);

  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">
          Particle Flow Animation
        </h3>
        {data && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              data.dataSource === "openvisus"
                ? "bg-accent-2/20 text-accent-2"
                : "bg-surface-2 text-muted"
            }`}
          >
            {data.dataSource}
          </span>
        )}
      </div>
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
      </div>
    </div>
  );
}
