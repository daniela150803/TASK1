import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import type { WindVector } from "@workspace/api-client-react";
import { useChartInteraction } from "../ChartInteractionContext";

interface Props {
  data: WindVector[] | undefined;
  loading: boolean;
}

type Tooltip = {
  x: number;
  y: number;
  lat: number;
  lon: number;
  speed: number;
  u: number;
  v: number;
  count: number;
} | null;

type HeatPoint = {
  lat: number;
  lon: number;
  speed: number;
  u: number;
  v: number;
  x: number;
  y: number;
};

type Layout = {
  W: number;
  H: number;
  w: number;
  h: number;
  margin: { top: number; right: number; bottom: number; left: number };
  xScale: d3.ScaleLinear<number, number>;
  yScale: d3.ScaleLinear<number, number>;
  points: HeatPoint[];
  maxVal: number;
  focusedPoint: HeatPoint | null;
};

const HEAT_PALETTE = Array.from({ length: 256 }, (_, i) => {
  const t = i / 255;
  const c = d3.rgb(d3.interpolateTurbo(t));
  return [c.r, c.g, c.b] as const;
});

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function nearestPoint(points: HeatPoint[], lat: number, lon: number) {
  let best: HeatPoint | null = null;
  let bestDist = Infinity;

  for (const p of points) {
    const dist = Math.hypot(p.lat - lat, p.lon - lon);
    if (dist < bestDist) {
      bestDist = dist;
      best = p;
    }
  }

  return best;
}

function nearestScreenPoint(points: HeatPoint[], x: number, y: number) {
  let best: HeatPoint | null = null;
  let bestDist = Infinity;

  for (const p of points) {
    const dist = Math.hypot(p.x - x, p.y - y);
    if (dist < bestDist) {
      bestDist = dist;
      best = p;
    }
  }

  return { point: best, dist: bestDist };
}

export default function WindHeatmapChart({ data, loading }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [tooltip, setTooltip] = useState<Tooltip>(null);
  const [width, setWidth] = useState(0);

  const { geoFocus, setGeoFocus, setActiveVariable } = useChartInteraction();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const layout = useMemo<Layout | null>(() => {
    if (!data?.length) return null;

    const W = Math.max(width || 0, 320);
    const H = 220;
    const margin = { top: 10, right: 12, bottom: 26, left: 36 };
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    if (w <= 0 || h <= 0) return null;

    const latExtent = d3.extent(data, (d) => d.lat) as [number, number];
    const lonExtent = d3.extent(data, (d) => d.lon) as [number, number];

    if (
      !latExtent ||
      !lonExtent ||
      !Number.isFinite(latExtent[0]) ||
      !Number.isFinite(latExtent[1]) ||
      !Number.isFinite(lonExtent[0]) ||
      !Number.isFinite(lonExtent[1])
    ) {
      return null;
    }

    const xScale = d3.scaleLinear().domain(lonExtent).range([0, w]);
    const yScale = d3.scaleLinear().domain(latExtent).range([h, 0]);

    const points: HeatPoint[] = data.map((d) => ({
      lat: d.lat,
      lon: d.lon,
      speed: d.speed,
      u: d.u,
      v: d.v,
      x: xScale(d.lon),
      y: yScale(d.lat),
    }));

    const maxVal = d3.max(points, (d) => d.speed) ?? 1;

    const focusedPoint =
      geoFocus && points.length > 0
        ? nearestPoint(points, geoFocus.lat, geoFocus.lon)
        : null;

    return {
      W,
      H,
      w,
      h,
      margin,
      xScale,
      yScale,
      points,
      maxVal,
      focusedPoint,
    };
  }, [data, width, geoFocus]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !layout) return;

    const { W, H, w, h, margin, points, maxVal, focusedPoint } = layout;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = "hsl(220, 45%, 6%)";
    ctx.fillRect(0, 0, W, H);

    ctx.globalCompositeOperation = "lighter";
    ctx.imageSmoothingEnabled = true;

    const baseRadius = Math.max(8, Math.min(w, h) / 26);

    for (const p of points) {
      const t = clamp01(p.speed / maxVal);
      const [r, g, b] = HEAT_PALETTE[Math.round(t * 255)];

      const cx = margin.left + p.x;
      const cy = margin.top + p.y;

      const radiusOuter = baseRadius * (1.9 + t * 1.05);
      const radiusInner = baseRadius * (0.7 + t * 0.45);

      const alphaOuter = 0.06 + t * 0.12;
      const alphaInner = 0.12 + t * 0.18;

      const outer = ctx.createRadialGradient(cx, cy, 0, cx, cy, radiusOuter);
      outer.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alphaOuter})`);
      outer.addColorStop(0.45, `rgba(${r}, ${g}, ${b}, ${alphaOuter * 0.7})`);
      outer.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

      ctx.fillStyle = outer;
      ctx.beginPath();
      ctx.arc(cx, cy, radiusOuter, 0, Math.PI * 2);
      ctx.fill();

      const inner = ctx.createRadialGradient(cx, cy, 0, cx, cy, radiusInner);
      inner.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alphaInner})`);
      inner.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${alphaInner * 0.8})`);
      inner.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

      ctx.fillStyle = inner;
      ctx.beginPath();
      ctx.arc(cx, cy, radiusInner, 0, Math.PI * 2);
      ctx.fill();
    }

    if (focusedPoint) {
      const cx = margin.left + focusedPoint.x;
      const cy = margin.top + focusedPoint.y;

      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "rgba(120, 245, 255, 0.98)";
      ctx.lineWidth = 1.8;
      ctx.shadowColor = "rgba(120, 245, 255, 0.55)";
      ctx.shadowBlur = 10;

      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * 1.7, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * 0.75, 0, Math.PI * 2);
      ctx.stroke();

      ctx.shadowBlur = 0;
    }

    ctx.globalCompositeOperation = "source-over";
  }, [layout]);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || !layout) return;

    const { W, H, w, h, margin, xScale, yScale, maxVal, focusedPoint } = layout;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${W} ${H}`).attr("width", "100%").attr("height", H);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    g.append("rect")
      .attr("width", w)
      .attr("height", h)
      .attr("rx", 4)
      .attr("fill", "transparent");

    g.append("g")
      .attr("class", "d3-axis")
      .attr("transform", `translate(0,${h})`)
      .call(d3.axisBottom(xScale).ticks(5).tickFormat((d) => `${d}°` as string));

    g.append("g")
      .attr("class", "d3-axis")
      .call(d3.axisLeft(yScale).ticks(4).tickFormat((d) => `${d}°` as string));

    svg.selectAll(".d3-axis text")
      .attr("fill", "hsl(210, 35%, 80%)")
      .attr("font-size", 10);

    svg.selectAll(".d3-axis path, .d3-axis line")
      .attr("stroke", "hsla(210, 35%, 75%, 0.25)");

    const defs = svg.append("defs");
    const grad = defs
      .append("linearGradient")
      .attr("id", "heatGrad")
      .attr("x1", "0%")
      .attr("x2", "100%");

    [0, 0.15, 0.35, 0.6, 0.85, 1].forEach((t) => {
      grad
        .append("stop")
        .attr("offset", `${t * 100}%`)
        .attr("stop-color", d3.interpolateTurbo(t));
    });

    const lg = g.append("g").attr("transform", `translate(${w - 110},4)`);
    lg.append("rect")
      .attr("width", 105)
      .attr("height", 8)
      .attr("rx", 3)
      .attr("fill", "url(#heatGrad)")
      .attr("opacity", 0.98);

    lg.append("text")
      .attr("x", 0)
      .attr("y", 18)
      .attr("fill", "hsl(210,25%,68%)")
      .attr("font-size", 9)
      .text("0");

    lg.append("text")
      .attr("x", 105)
      .attr("y", 18)
      .attr("text-anchor", "end")
      .attr("fill", "hsl(210,25%,68%)")
      .attr("font-size", 9)
      .text(`${maxVal.toFixed(0)} m/s`);

    if (focusedPoint) {
      const cx = xScale(focusedPoint.lon);
      const cy = yScale(focusedPoint.lat);

      g.append("circle")
        .attr("cx", cx)
        .attr("cy", cy)
        .attr("r", 13)
        .attr("fill", "none")
        .attr("stroke", "hsl(190, 100%, 72%)")
        .attr("stroke-width", 1.4)
        .attr("opacity", 0.98);

      g.append("circle")
        .attr("cx", cx)
        .attr("cy", cy)
        .attr("r", 6)
        .attr("fill", "none")
        .attr("stroke", "hsl(190, 100%, 72%)")
        .attr("stroke-width", 1.8)
        .attr("opacity", 0.98);
    }
  }, [layout]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!layout || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const { margin, w, h, xScale, yScale, points } = layout;

    const x = px - margin.left;
    const y = py - margin.top;

    if (x < 0 || y < 0 || x > w || y > h) {
      setTooltip(null);
      return;
    }

    // Buscar el punto más cercano en coordenadas de gráfico
    const { point, dist } = nearestScreenPoint(points, x, y);

    // Umbral real de hover: si el cursor está muy lejos, no mostrar tooltip
    const hoverThreshold = Math.max(12, Math.min(w, h) / 18);

    if (!point || dist > hoverThreshold) {
      setTooltip(null);
      return;
    }

    setActiveVariable("speed");
    setGeoFocus({
      lat: point.lat,
      lon: point.lon,
      speed: point.speed,
      u: point.u,
      v: point.v,
      variable: "speed",
      source: "Mapa de calor",
    });

    setTooltip({
      x: margin.left + xScale(point.lon),
      y: margin.top + yScale(point.lat),
      lat: point.lat,
      lon: point.lon,
      speed: point.speed,
      u: point.u,
      v: point.v,
      count: 1,
    });
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => {
        setTooltip(null);
        setGeoFocus(null);
      }}
      className="relative w-full overflow-hidden"
      style={{ height: 220 }}
    >
      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center text-xs text-[hsl(210,20%,55%)] animate-pulse">
          Loading heatmap...
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full pointer-events-none"
      />

      <svg
        ref={svgRef}
        className="absolute inset-0 z-10 h-full w-full pointer-events-none"
      />

      {tooltip && (
        <div
          className="absolute z-30 pointer-events-none rounded-md border border-[hsl(190,100%,55%,0.55)] bg-[hsl(222,50%,7%,0.96)] px-2.5 py-2 text-[10px] shadow-lg shadow-cyan-950/30 backdrop-blur-sm"
          style={{
            left: Math.min(tooltip.x + 12, Math.max(width - 180, 8)),
            top: Math.max(8, tooltip.y - 58),
          }}
        >
          <div className="mb-1 font-semibold text-[hsl(190,100%,72%)]">
            Punto de calor
          </div>
          <div className="font-mono text-[hsl(210,40%,90%)] leading-4">
            Prom. {tooltip.speed.toFixed(2)} m/s
            <br />
            U {tooltip.u.toFixed(2)} · V {tooltip.v.toFixed(2)}
            <br />
            {tooltip.lat.toFixed(1)}°, {tooltip.lon.toFixed(1)}°
          </div>
        </div>
      )}
    </div>
  );
}