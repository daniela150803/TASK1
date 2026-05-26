import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { LevelData } from "@workspace/api-client-react";
import { useChartInteraction } from "../ChartInteractionContext";

interface Props {
  data: LevelData[] | undefined;
  loading: boolean;
}

type Cell = { month: number; label: string; level: LevelData; value: number; x: number; y: number };

type Tooltip = {
  x: number;
  y: number;
  month: number;
  label: string;
  level: number;
  altitudeKm: number;
  value: number;
  avgSpeed: number;
  avgTemp: number;
} | null;

function nearestLevel(data: LevelData[], altitudeKm: number) {
  let best = data[0];
  let bestDist = Infinity;
  data.forEach((level) => {
    const dist = Math.abs(level.altitudeKm - altitudeKm);
    if (dist < bestDist) {
      bestDist = dist;
      best = level;
    }
  });
  return best;
}

export default function VerticalVelocityHeatmap({ data, loading }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<Tooltip>(null);
  const { levelFocus, timeFocus, setLevelFocus, setTimeFocus, setActiveVariable } = useChartInteraction();

  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const W = svgRef.current.clientWidth || 420;
    const H = 180;
    const margin = { top: 10, right: 70, bottom: 28, left: 46 };
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 ${W} ${H}`).attr("height", H);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const nTime = 12;
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const altExtent = d3.extent(data, (d) => d.altitudeKm) as [number, number];
    const wExtent = d3.extent(data, (d) => d.avgW) as [number, number];
    const absMax = Math.max(Math.abs(wExtent[0]), Math.abs(wExtent[1]), 0.01);

    const xScale = d3.scaleLinear().domain([0, nTime - 1]).range([0, w]);
    const yScale = d3.scaleLinear().domain(altExtent).range([h, 0]);
    const colorScale = d3.scaleDiverging(d3.interpolatePuOr).domain([-absMax, 0, absMax]);

    const cellW = w / nTime;
    const cellH = h / data.length;
    const focusedLevel = levelFocus ? nearestLevel(data, levelFocus.altitudeKm) : null;

    const cells: Cell[] = [];
    data.forEach((lev, li) => {
      for (let t = 0; t < nTime; t++) {
        const variation = Math.sin((t / nTime) * Math.PI * 2 + li * 0.5) * 0.4;
        const val = lev.avgW + variation;
        cells.push({ month: t, label: months[t] ?? `M${t + 1}`, level: lev, value: val, x: xScale(t), y: yScale(lev.altitudeKm) });
      }
    });

    g.selectAll("rect.vvh-cell")
      .data(cells)
      .enter()
      .append("rect")
      .attr("class", "vvh-cell")
      .attr("x", (d) => d.x)
      .attr("y", (d) => d.y - cellH / 2)
      .attr("width", cellW + 0.5)
      .attr("height", cellH + 0.5)
      .attr("fill", (d) => colorScale(d.value))
      .attr("opacity", (d) => {
        const levelMatch = focusedLevel && focusedLevel.level === d.level.level;
        const timeMatch = timeFocus && timeFocus.month === d.month;
        return levelMatch || timeMatch ? 1 : 0.78;
      })
      .attr("stroke", (d) => {
        const levelMatch = focusedLevel && focusedLevel.level === d.level.level;
        const timeMatch = timeFocus && timeFocus.month === d.month;
        return levelMatch || timeMatch ? "hsl(196,80%,72%)" : "transparent";
      })
      .attr("stroke-width", (d) => {
        const levelMatch = focusedLevel && focusedLevel.level === d.level.level;
        const timeMatch = timeFocus && timeFocus.month === d.month;
        return levelMatch || timeMatch ? 1.1 : 0;
      })
      .style("cursor", "crosshair")
      .on("mouseenter", (_event, d) => {
        setActiveVariable("w");
        setLevelFocus({ level: d.level.level, altitudeKm: d.level.altitudeKm, speed: d.level.avgSpeed, temperature: d.level.avgTemp, u: d.level.avgU, v: d.level.avgV, w: d.value, source: "Mapa ω" });
        setTimeFocus({ month: d.month, label: d.label, value: d.value, level: d.level.level, source: "Mapa ω" });
        setTooltip({ x: d.x + margin.left, y: d.y + margin.top, month: d.month, label: d.label, level: d.level.level, altitudeKm: d.level.altitudeKm, value: d.value, avgSpeed: d.level.avgSpeed, avgTemp: d.level.avgTemp });
      })
      .on("mousemove", (_event, d) => setTooltip({ x: d.x + margin.left, y: d.y + margin.top, month: d.month, label: d.label, level: d.level.level, altitudeKm: d.level.altitudeKm, value: d.value, avgSpeed: d.level.avgSpeed, avgTemp: d.level.avgTemp }))
      .on("mouseleave", () => {
        setTooltip(null);
        setLevelFocus(null);
        setTimeFocus(null);
      });

    g.append("g").attr("class", "d3-axis").attr("transform", `translate(0,${h})`)
      .call(d3.axisBottom(xScale).ticks(nTime).tickFormat((d) => months[Math.round(+d)] ?? ""));
    g.append("g").attr("class", "d3-axis")
      .call(d3.axisLeft(yScale).ticks(5).tickFormat((d) => `${d} km`));

    if (focusedLevel) {
      const fy = yScale(focusedLevel.altitudeKm);
      g.append("line")
        .attr("x1", 0).attr("x2", w).attr("y1", fy).attr("y2", fy)
        .attr("stroke", "hsl(196,80%,72%)").attr("stroke-width", 1)
        .attr("stroke-dasharray", "5,4");
    }
    if (timeFocus) {
      const fx = xScale(timeFocus.month) + cellW / 2;
      g.append("line")
        .attr("x1", fx).attr("x2", fx).attr("y1", 0).attr("y2", h)
        .attr("stroke", "hsl(270,70%,72%)").attr("stroke-width", 1)
        .attr("stroke-dasharray", "5,4");
    }

    const defs = svg.append("defs");
    const vGrad = defs.append("linearGradient").attr("id", "omegaVGrad").attr("x1", 0).attr("x2", 0).attr("y1", 0).attr("y2", 1);
    vGrad.append("stop").attr("offset", "0%").attr("stop-color", d3.interpolatePuOr(0));
    vGrad.append("stop").attr("offset", "50%").attr("stop-color", d3.interpolatePuOr(0.5));
    vGrad.append("stop").attr("offset", "100%").attr("stop-color", d3.interpolatePuOr(1));
    const lg = g.append("g").attr("transform", `translate(${w + 6},8)`);
    lg.append("rect").attr("width", 10).attr("height", h - 16).attr("rx", 2).attr("fill", "url(#omegaVGrad)").attr("opacity", 0.9);
    lg.append("text").attr("x", 14).attr("y", 8).attr("fill", "hsl(220,20%,55%)").attr("font-size", 8).text(`-${absMax.toFixed(1)}`);
    lg.append("text").attr("x", 14).attr("y", (h - 16) / 2).attr("fill", "hsl(220,20%,55%)").attr("font-size", 8).attr("dominant-baseline", "middle").text("0");
    lg.append("text").attr("x", 14).attr("y", h - 20).attr("fill", "hsl(220,20%,55%)").attr("font-size", 8).text(`+${absMax.toFixed(1)}`);
    lg.append("text").attr("x", 5).attr("y", -4).attr("text-anchor", "middle").attr("fill", "hsl(220,20%,45%)").attr("font-size", 8).text("ω");
  }, [data, levelFocus, timeFocus, setActiveVariable, setLevelFocus, setTimeFocus]);

  return (
    <div onMouseLeave={() => { setTooltip(null); setLevelFocus(null); setTimeFocus(null); }} className="w-full relative" style={{ height: 180 }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-[hsl(220,20%,45%)] animate-pulse">
          Loading heatmap...
        </div>
      )}
      <svg ref={svgRef} className="w-full" />
      {tooltip && (
        <div
          className="absolute z-10 pointer-events-none rounded-md border border-[hsl(196,80%,45%,0.45)] bg-[hsl(222,45%,7%,0.94)] px-2.5 py-2 text-[10px] shadow-lg backdrop-blur-sm"
          style={{ left: Math.min(tooltip.x + 10, 310), top: Math.max(8, tooltip.y - 62) }}
        >
          <div className="font-semibold text-[hsl(196,80%,68%)] mb-1">ω conectado · {tooltip.label}</div>
          <div className="font-mono text-[hsl(210,40%,86%)] leading-4">
            L{tooltip.level} · {tooltip.altitudeKm.toFixed(1)} km<br />
            ω {tooltip.value.toFixed(2)} m/s<br />
            Vel. {tooltip.avgSpeed.toFixed(2)} m/s<br />
            Temp. {tooltip.avgTemp.toFixed(1)} K
          </div>
        </div>
      )}
    </div>
  );
}
