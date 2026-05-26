import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { ProfilePoint } from "@workspace/api-client-react";
import { useChartInteraction } from "../ChartInteractionContext";

type Variable = "temperature" | "u" | "v" | "w";

interface Props {
  data: ProfilePoint[] | undefined;
  loading: boolean;
  activeVars: Variable[];
  colorVar: Variable;
  varConfig: Record<Variable, { label: string; color: string }>;
}

type Tooltip = {
  x: number;
  y: number;
  variable: Variable;
  label: string;
  value: number;
  level: number;
  altitudeKm: number;
  speed: number;
  temperature: number;
  u: number;
  v: number;
  w: number;
} | null;

const VAR_ACCESSORS: Record<Variable, (d: ProfilePoint) => number> = {
  temperature: (d) => d.temperature,
  u: (d) => d.u,
  v: (d) => d.v,
  w: (d) => d.w,
};

function nearestProfile(data: ProfilePoint[], altitudeKm: number) {
  let best = data[0];
  let bestDist = Infinity;
  data.forEach((point) => {
    const dist = Math.abs(point.altitudeKm - altitudeKm);
    if (dist < bestDist) {
      bestDist = dist;
      best = point;
    }
  });
  return best;
}

export default function MultiVariableProfile({ data, loading, activeVars, colorVar, varConfig }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<Tooltip>(null);
  const { levelFocus, activeVariable, setLevelFocus, setActiveVariable } = useChartInteraction();

  useEffect(() => {
    if (!data || data.length === 0 || activeVars.length === 0 || !svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const W = svgRef.current.clientWidth || 900;
    const H = 340;
    const margin = { top: 24, right: 24, bottom: 42, left: 56 };
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 ${W} ${H}`).attr("height", H);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const altExtent = d3.extent(data, (d) => d.altitudeKm) as [number, number];
    const yScale = d3.scaleLinear().domain(altExtent).range([h, 0]);

    g.append("g").attr("class", "d3-grid")
      .call(d3.axisLeft(yScale).tickSize(-w).tickFormat(() => "").ticks(8));

    const layers = [
      { lo: 0, hi: 12, color: "hsl(196,40%,8%)" },
      { lo: 12, hi: 50, color: "hsl(270,40%,8%)" },
      { lo: 50, hi: 80, color: "hsl(155,40%,8%)" },
    ];
    layers.forEach((l) => {
      const lo = Math.max(l.lo, altExtent[0]);
      const hi = Math.min(l.hi, altExtent[1]);
      if (hi <= lo) return;
      g.append("rect").attr("x", 0)
        .attr("y", yScale(hi)).attr("width", w)
        .attr("height", yScale(lo) - yScale(hi))
        .attr("fill", l.color).attr("opacity", 0.5);
    });

    const focusPoint = levelFocus ? nearestProfile(data, levelFocus.altitudeKm) : null;
    const xScales = new Map<Variable, d3.ScaleLinear<number, number>>();

    activeVars.forEach((varKey, idx) => {
      const acc = VAR_ACCESSORS[varKey];
      const vals = data.map(acc);
      const ext = d3.extent(vals) as [number, number];
      const xFrac = idx / Math.max(activeVars.length - 1, 1);
      const xOffset = xFrac * w * 0.7;
      const bandW = w * 0.28;
      const xScale = d3.scaleLinear().domain(ext).range([xOffset, xOffset + bandW]);
      xScales.set(varKey, xScale);
      const cfg = varConfig[varKey];
      const isActive = activeVariable === varKey || colorVar === varKey;

      const area = d3.area<ProfilePoint>()
        .x0(xOffset)
        .x1((d) => xScale(acc(d)))
        .y((d) => yScale(d.altitudeKm))
        .curve(d3.curveCatmullRom);
      g.append("path").datum(data)
        .attr("fill", cfg.color).attr("opacity", isActive ? 0.18 : 0.1)
        .attr("d", area);

      const line = d3.line<ProfilePoint>()
        .x((d) => xScale(acc(d))).y((d) => yScale(d.altitudeKm))
        .curve(d3.curveCatmullRom);
      g.append("path").datum(data)
        .attr("fill", "none")
        .attr("stroke", cfg.color)
        .attr("stroke-width", isActive ? 3 : 2)
        .attr("opacity", isActive ? 1 : 0.88)
        .attr("d", line);

      const maxPt = data.reduce((a, b) => acc(a) > acc(b) ? a : b);
      const minPt = data.reduce((a, b) => acc(a) < acc(b) ? a : b);
      [maxPt, minPt].forEach((pt) => {
        g.append("circle")
          .attr("cx", xScale(acc(pt))).attr("cy", yScale(pt.altitudeKm))
          .attr("r", 4).attr("fill", cfg.color).attr("opacity", 0.85)
          .attr("stroke", "hsl(222,47%,10%)").attr("stroke-width", 1.5);
        g.append("text").attr("x", xScale(acc(pt)) + 6).attr("y", yScale(pt.altitudeKm))
          .attr("fill", cfg.color).attr("font-size", 9).attr("dominant-baseline", "middle")
          .text(acc(pt).toFixed(1));
      });

      if (focusPoint) {
        g.append("circle")
          .attr("cx", xScale(acc(focusPoint))).attr("cy", yScale(focusPoint.altitudeKm))
          .attr("r", isActive ? 5.5 : 4.5)
          .attr("fill", cfg.color)
          .attr("stroke", "hsl(222,47%,7%)")
          .attr("stroke-width", 1.4);
      }

      g.append("rect")
        .attr("x", xOffset).attr("y", 0).attr("width", bandW).attr("height", h)
        .attr("fill", "transparent")
        .style("cursor", "crosshair")
        .on("mousemove", (event) => {
          const [, my] = d3.pointer(event);
          const altitude = yScale.invert(my);
          const pt = nearestProfile(data, altitude);
          setActiveVariable(varKey);
          setLevelFocus({ level: pt.level, altitudeKm: pt.altitudeKm, speed: pt.speed, temperature: pt.temperature, u: pt.u, v: pt.v, w: pt.w, source: `Perfil multivariable · ${cfg.label}` });
          setTooltip({ x: xScale(acc(pt)) + margin.left, y: yScale(pt.altitudeKm) + margin.top, variable: varKey, label: cfg.label, value: acc(pt), ...pt });
        })
        .on("mouseleave", () => {
          setTooltip(null);
          setLevelFocus(null);
        });

      g.append("text")
        .attr("x", xOffset + bandW / 2).attr("y", h + 24)
        .attr("text-anchor", "middle").attr("fill", cfg.color).attr("font-size", 10)
        .text(cfg.label);

      const barH = 12;
      const defs = svg.select("defs").empty() ? svg.append("defs") : svg.select("defs");
      const gradId = `mv-grad-${varKey}`;
      const grad = defs.append("linearGradient").attr("id", gradId).attr("x1", 0).attr("x2", 1);
      grad.append("stop").attr("offset", "0%").attr("stop-color", cfg.color).attr("stop-opacity", 0.1);
      grad.append("stop").attr("offset", "100%").attr("stop-color", cfg.color);
      g.append("rect").attr("x", xOffset).attr("y", -barH - 4).attr("width", bandW)
        .attr("height", barH).attr("rx", 2).attr("fill", `url(#${gradId})`).attr("opacity", isActive ? 0.9 : 0.6);
    });

    if (focusPoint) {
      const fy = yScale(focusPoint.altitudeKm);
      g.append("line")
        .attr("x1", 0).attr("x2", w).attr("y1", fy).attr("y2", fy)
        .attr("stroke", "hsl(196,80%,72%)").attr("stroke-width", 1.3)
        .attr("stroke-dasharray", "5,4");
      g.append("text")
        .attr("x", w - 6).attr("y", fy - 5).attr("text-anchor", "end")
        .attr("fill", "hsl(196,80%,72%)").attr("font-size", 10)
        .text(`L${focusPoint.level} · ${focusPoint.altitudeKm.toFixed(1)} km`);
    }

    g.append("g").attr("class", "d3-axis")
      .call(d3.axisLeft(yScale).ticks(8).tickFormat((d) => `${d} km`));
    g.append("text").attr("transform", "rotate(-90)").attr("x", -h / 2).attr("y", -44)
      .attr("text-anchor", "middle").attr("fill", "hsl(220,20%,45%)").attr("font-size", 10)
      .text("Altitude (km)");

  }, [data, activeVars, colorVar, varConfig, levelFocus, activeVariable, setActiveVariable, setLevelFocus]);

  return (
    <div onMouseLeave={() => { setTooltip(null); setLevelFocus(null); }} className="w-full relative" style={{ height: 340 }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-[hsl(220,20%,45%)] animate-pulse">
          Loading profile...
        </div>
      )}
      <svg ref={svgRef} className="w-full" />
      {tooltip && (
        <div
          className="absolute z-10 pointer-events-none rounded-md border border-[hsl(196,80%,45%,0.45)] bg-[hsl(222,45%,7%,0.94)] px-2.5 py-2 text-[10px] shadow-lg backdrop-blur-sm"
          style={{ left: Math.min(tooltip.x + 10, 720), top: Math.max(8, tooltip.y - 64) }}
        >
          <div className="font-semibold text-[hsl(196,80%,68%)] mb-1">{tooltip.label} conectado</div>
          <div className="font-mono text-[hsl(210,40%,86%)] leading-4">
            Valor {tooltip.value.toFixed(2)}<br />
            L{tooltip.level} · {tooltip.altitudeKm.toFixed(1)} km<br />
            Vel. {tooltip.speed.toFixed(2)} · Temp. {tooltip.temperature.toFixed(1)} K<br />
            U {tooltip.u.toFixed(2)} · V {tooltip.v.toFixed(2)} · ω {tooltip.w.toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
}
