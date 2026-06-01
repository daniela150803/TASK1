import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { LevelData } from "@workspace/api-client-react";
import { useChartInteraction } from "../ChartInteractionContext";

interface Props {
  data: LevelData[] | undefined;
  loading: boolean;
}

type Cell = {
  index: number;
  level: LevelData;
  value: number;
  cx: number; // pixel center x
  cy: number; // pixel center y
};

type Tooltip = {
  x: number;
  y: number;
  level: number;
  altitudeKm: number;
  value: number;
  avgSpeed: number;
  avgTemp: number;
  avgU: number;
  avgV: number;
} | null;

function nearestLevel(data: LevelData[], altitudeKm: number) {
  let best = data[0];
  let bestDist = Infinity;
  data.forEach((lev) => {
    const dist = Math.abs(lev.altitudeKm - altitudeKm);
    if (dist < bestDist) {
      bestDist = dist;
      best = lev;
    }
  });
  return best;
}

// Atmospheric layer boundaries and colors for annotations
const ATM_LAYERS = [
  { name: "Tropo.", maxKm: 12, color: "hsl(196,60%,55%)" },
  { name: "Strato.", maxKm: 50, color: "hsl(270,60%,65%)" },
  { name: "Meso.", maxKm: 80, color: "hsl(155,60%,55%)" },
];

export default function VerticalVelocityHeatmap({ data, loading }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<Tooltip>(null);
  const { levelFocus, setLevelFocus, setActiveVariable } = useChartInteraction();

  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const W = svgRef.current.clientWidth || 900;
    const H = 360;
    const margin = { top: 18, right: 80, bottom: 36, left: 52 };
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 ${W} ${H}`).attr("height", H);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // ── Scales ──────────────────────────────────────────────────────────────
    // X: level index (0 … N-1), evenly spaced
    const xScale = d3.scaleLinear().domain([0, data.length - 1]).range([0, w]);
    // Y: altitude in km, continuous
    const altExtent = d3.extent(data, (d) => d.altitudeKm) as [number, number];
    const yScale = d3.scaleLinear().domain(altExtent).range([h, 0]);

    // Color: diverging PuOr centered on 0
    const wVals = data.map((d) => d.avgW);
    const absMax = Math.max(Math.abs(d3.min(wVals) ?? 0), Math.abs(d3.max(wVals) ?? 0), 0.01);
    const colorScale = d3.scaleDiverging(d3.interpolatePuOr).domain([-absMax, 0, absMax]);

    // Cell dimensions in pixels
    const cellW = w / data.length + 0.8;
    // Height per cell = distance between adjacent altitude values projected to pixels
    // We use the average spacing so every cell is the same height
    const altStep = (altExtent[1] - altExtent[0]) / Math.max(data.length - 1, 1);
    const cellH = Math.abs(yScale(0) - yScale(altStep)) + 0.8;

    // ── Background ──────────────────────────────────────────────────────────
    g.append("rect").attr("width", w).attr("height", h)
      .attr("rx", 3).attr("fill", "hsl(215,42%,7%)");

    // ── Grid lines (horizontal, every ~10 km) ───────────────────────────────
    g.append("g").attr("class", "d3-grid")
      .call(d3.axisLeft(yScale).tickSize(-w).tickFormat(() => "").ticks(6));

    // ── Atmospheric layer dividers ───────────────────────────────────────────
    ATM_LAYERS.forEach((l) => {
      if (l.maxKm < altExtent[0] || l.maxKm > altExtent[1]) return;
      const ly = yScale(l.maxKm);
      g.append("line")
        .attr("x1", 0).attr("x2", w).attr("y1", ly).attr("y2", ly)
        .attr("stroke", l.color).attr("stroke-width", 0.9)
        .attr("stroke-dasharray", "4,5").attr("opacity", 0.55);
      g.append("text")
        .attr("x", 3).attr("y", ly - 3)
        .attr("fill", l.color).attr("font-size", 8).attr("opacity", 0.75)
        .text(l.name);
    });

    // ── Build cells ─────────────────────────────────────────────────────────
    const focusedLevel = levelFocus ? nearestLevel(data, levelFocus.altitudeKm) : null;
    const hasFocus = focusedLevel !== null;

    const cells: Cell[] = data.map((lev, i) => ({
      index: i,
      level: lev,
      value: lev.avgW,
      cx: xScale(i),
      cy: yScale(lev.altitudeKm),
    }));

    // ── Draw cells ──────────────────────────────────────────────────────────
    g.selectAll<SVGRectElement, Cell>("rect.vvh2-cell")
      .data(cells)
      .enter()
      .append("rect")
      .attr("class", "vvh2-cell")
      .attr("x", (d) => d.cx - cellW / 2)
      .attr("y", (d) => d.cy - cellH / 2)
      .attr("width", cellW)
      .attr("height", cellH)
      .attr("fill", (d) => colorScale(d.value))
      .attr("opacity", (d) => {
        if (!hasFocus) return 0.88;
        return focusedLevel!.level === d.level.level ? 1 : 0.18;
      })
      .attr("stroke", (d) =>
        hasFocus && focusedLevel!.level === d.level.level
          ? "hsl(196,80%,75%)"
          : "transparent"
      )
      .attr("stroke-width", (d) =>
        hasFocus && focusedLevel!.level === d.level.level ? 1.3 : 0
      )
      .style("cursor", "crosshair")
      .on("mouseenter", (_event, d) => {
        setActiveVariable("w");
        setLevelFocus({
          level: d.level.level,
          altitudeKm: d.level.altitudeKm,
          speed: d.level.avgSpeed,
          temperature: d.level.avgTemp,
          u: d.level.avgU,
          v: d.level.avgV,
          w: d.value,
          source: "Mapa ω",
        });
        setTooltip({
          x: d.cx + margin.left,
          y: d.cy + margin.top,
          level: d.level.level,
          altitudeKm: d.level.altitudeKm,
          value: d.value,
          avgSpeed: d.level.avgSpeed,
          avgTemp: d.level.avgTemp,
          avgU: d.level.avgU,
          avgV: d.level.avgV,
        });
      })
      .on("mousemove", (_event, d) =>
        setTooltip({
          x: d.cx + margin.left,
          y: d.cy + margin.top,
          level: d.level.level,
          altitudeKm: d.level.altitudeKm,
          value: d.value,
          avgSpeed: d.level.avgSpeed,
          avgTemp: d.level.avgTemp,
          avgU: d.level.avgU,
          avgV: d.level.avgV,
        })
      )
      .on("mouseleave", () => {
        setTooltip(null);
        setLevelFocus(null);
      });

    // ── Focus crosshair line ─────────────────────────────────────────────────
    if (focusedLevel) {
      const fy = yScale(focusedLevel.altitudeKm);
      g.append("line")
        .attr("x1", 0).attr("x2", w).attr("y1", fy).attr("y2", fy)
        .attr("stroke", "hsl(196,80%,72%)").attr("stroke-width", 1.2)
        .attr("stroke-dasharray", "5,4").attr("pointer-events", "none");
      g.append("text")
        .attr("x", w - 3).attr("y", fy - 4).attr("text-anchor", "end")
        .attr("fill", "hsl(196,80%,72%)").attr("font-size", 9).attr("pointer-events", "none")
        .text(`L${focusedLevel.level} · ${focusedLevel.altitudeKm.toFixed(1)} km`);
    }

    // ── Axes ─────────────────────────────────────────────────────────────────
    // X: show level labels (L0, L10, L20 …)
    const xTickCount = Math.min(12, Math.floor(data.length / 4));
    g.append("g").attr("class", "d3-axis").attr("transform", `translate(0,${h})`)
      .call(
        d3.axisBottom(xScale)
          .ticks(xTickCount)
          .tickFormat((d) => `L${Math.round(+d)}`)
      );
    // Y: altitude
    g.append("g").attr("class", "d3-axis")
      .call(d3.axisLeft(yScale).ticks(6).tickFormat((d) => `${d} km`));

    // Axis labels
    g.append("text")
      .attr("transform", "rotate(-90)").attr("x", -h / 2).attr("y", -42)
      .attr("text-anchor", "middle").attr("fill", "hsl(220,20%,45%)").attr("font-size", 10)
      .text("Altitud (km)");
    g.append("text")
      .attr("x", w / 2).attr("y", h + 26).attr("text-anchor", "middle")
      .attr("fill", "hsl(220,20%,45%)").attr("font-size", 10)
      .text("Nivel atmosférico");

    // ── Color legend (vertical bar, right margin) ────────────────────────────
    const defs = svg.append("defs");
    const vGrad = defs.append("linearGradient")
      .attr("id", "vvh2-grad").attr("x1", 0).attr("x2", 0).attr("y1", 0).attr("y2", 1);
    // PuOr: positive = orange side (top), negative = purple side (bottom)
    vGrad.append("stop").attr("offset", "0%").attr("stop-color", colorScale(absMax));
    vGrad.append("stop").attr("offset", "50%").attr("stop-color", colorScale(0));
    vGrad.append("stop").attr("offset", "100%").attr("stop-color", colorScale(-absMax));

    const lgH = h - 20;
    const lg = g.append("g").attr("transform", `translate(${w + 8}, 10)`);
    lg.append("rect")
      .attr("width", 10).attr("height", lgH).attr("rx", 2)
      .attr("fill", "url(#vvh2-grad)").attr("opacity", 0.92);

    // Tick marks: +max, 0, -max
    [
      { t: 0, label: `+${absMax.toFixed(2)}` },
      { t: 0.5, label: "0" },
      { t: 1, label: `−${absMax.toFixed(2)}` },
    ].forEach(({ t, label }) => {
      const ty = lgH * t;
      lg.append("line")
        .attr("x1", 10).attr("x2", 15).attr("y1", ty).attr("y2", ty)
        .attr("stroke", "hsl(220,20%,50%)").attr("stroke-width", 0.7);
      lg.append("text")
        .attr("x", 17).attr("y", ty + 3).attr("fill", "hsl(220,20%,55%)").attr("font-size", 8)
        .text(label);
    });
    lg.append("text")
      .attr("x", 5).attr("y", -5).attr("text-anchor", "middle")
      .attr("fill", "hsl(220,20%,50%)").attr("font-size", 9)
      .text("ω");
    lg.append("text")
      .attr("x", 5).attr("y", lgH + 12).attr("text-anchor", "middle")
      .attr("fill", "hsl(220,20%,40%)").attr("font-size", 7.5)
      .text("m/s");
  }, [data, levelFocus, setActiveVariable, setLevelFocus]);

  return (
    <div
      onMouseLeave={() => { setTooltip(null); setLevelFocus(null); }}
      className="w-full relative"
      style={{ height: 360 }}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-[hsl(220,20%,45%)] animate-pulse">
          Loading heatmap...
        </div>
      )}
      <svg ref={svgRef} className="w-full" />
      {tooltip && (
        <div
          className="absolute z-10 pointer-events-none rounded-md border border-[hsl(196,80%,45%,0.45)] bg-[hsl(222,45%,7%,0.94)] px-2.5 py-2 text-[10px] shadow-lg backdrop-blur-sm"
          style={{ left: Math.min(tooltip.x + 10, 340), top: Math.max(8, tooltip.y - 72) }}
        >
          <div className="font-semibold text-[hsl(196,80%,68%)] mb-1">ω conectado</div>
          <div className="font-mono text-[hsl(210,40%,86%)] leading-[1.55]">
            L{tooltip.level} · {tooltip.altitudeKm.toFixed(1)} km<br />
            ω &nbsp;&nbsp;{tooltip.value.toFixed(3)} m/s<br />
            Vel. {tooltip.avgSpeed.toFixed(2)} m/s<br />
            Temp. {tooltip.avgTemp.toFixed(1)} K<br />
            U {tooltip.avgU.toFixed(2)} · V {tooltip.avgV.toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
}
