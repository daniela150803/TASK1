import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { LevelData } from "@workspace/api-client-react";
import { useChartInteraction } from "../ChartInteractionContext";

interface Props {
  data: LevelData[] | undefined;
  loading: boolean;
}

type Tooltip = {
  x: number;
  y: number;
  level: number;
  altitudeKm: number;
  avgSpeed: number;
  avgTemp: number;
  avgW: number;
  avgU: number;
  avgV: number;
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

export default function VerticalCrossSection({ data, loading }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<Tooltip>(null);
  const { levelFocus, setLevelFocus, setActiveVariable } = useChartInteraction();

  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const W = svgRef.current.clientWidth || 480;
    const H = 360;
    const margin = { top: 14, right: 16, bottom: 36, left: 56 };
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 ${W} ${H}`).attr("height", H);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLinear().domain([0, data.length - 1]).range([0, w]);
    const altExtent = d3.extent(data, (d) => d.altitudeKm) as [number, number];
    const yScale = d3.scaleLinear().domain(altExtent).range([h, 0]);
    const tempExtent = d3.extent(data, (d) => d.avgTemp) as [number, number];
    const colorScale = d3.scaleSequential(d3.interpolateRdYlBu).domain([tempExtent[1], tempExtent[0]]);

    const focusedLevel = levelFocus ? nearestLevel(data, levelFocus.altitudeKm) : null;
    const cellW = w / data.length;

    data.forEach((d, i) => {
      const latitudes = [-75, -60, -45, -30, -15, 0, 15, 30, 45, 60, 75];
      latitudes.forEach((lat, li) => {
        const tempMod = d.avgTemp + (lat / 90) * 20 + Math.sin(li) * 10;
        g.append("rect")
          .attr("x", xScale(i))
          .attr("y", yScale(d.altitudeKm + 3))
          .attr("width", cellW + 0.5)
          .attr("height", Math.max(2, Math.abs(yScale(d.altitudeKm) - yScale(d.altitudeKm + 3))))
          .attr("fill", colorScale(tempMod))
          .attr("opacity", focusedLevel && focusedLevel.level === d.level ? 1 : 0.72);
      });

      const vy = d.avgW * 8;
      const cx = xScale(i) + cellW / 2;
      const cy = yScale(d.altitudeKm);
      if (Math.abs(d.avgW) > 0.1) {
        g.append("line")
          .attr("x1", cx).attr("y1", cy)
          .attr("x2", cx).attr("y2", cy - vy)
          .attr("stroke", d.avgW > 0 ? "hsl(196,80%,65%)" : "hsl(0,70%,60%)")
          .attr("stroke-width", focusedLevel && focusedLevel.level === d.level ? 2.3 : 1.5)
          .attr("opacity", focusedLevel && focusedLevel.level === d.level ? 1 : 0.8);
      }

      g.append("rect")
        .attr("x", xScale(i))
        .attr("y", 0)
        .attr("width", Math.max(4, cellW))
        .attr("height", h)
        .attr("fill", "transparent")
        .style("cursor", "crosshair")
        .on("mouseenter", () => {
          setActiveVariable("w");
          setLevelFocus({ level: d.level, altitudeKm: d.altitudeKm, speed: d.avgSpeed, temperature: d.avgTemp, u: d.avgU, v: d.avgV, w: d.avgW, source: "Sección vertical" });
          setTooltip({ x: cx + margin.left, y: cy + margin.top, ...d });
        })
        .on("mousemove", () => setTooltip({ x: cx + margin.left, y: cy + margin.top, ...d }))
        .on("mouseleave", () => {
          setTooltip(null);
          setLevelFocus(null);
        });
    });

    const speedLine = d3.line<LevelData>()
      .x((d, i) => xScale(i) + cellW / 2)
      .y((d) => yScale(d.altitudeKm))
      .curve(d3.curveCatmullRom);
    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "hsl(38,90%,70%)")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,3")
      .attr("opacity", 0.9)
      .attr("d", speedLine);

    if (focusedLevel) {
      const fy = yScale(focusedLevel.altitudeKm);
      g.append("line")
        .attr("x1", 0).attr("x2", w).attr("y1", fy).attr("y2", fy)
        .attr("stroke", "hsl(196,80%,72%)")
        .attr("stroke-width", 1.4)
        .attr("stroke-dasharray", "5,4");
      g.append("text")
        .attr("x", w - 4).attr("y", fy - 5).attr("text-anchor", "end")
        .attr("fill", "hsl(196,80%,72%)").attr("font-size", 10)
        .text(`L${focusedLevel.level} · ${focusedLevel.altitudeKm.toFixed(1)} km`);
    }

    const layers = [
      { name: "Troposphere", maxKm: 12, color: "hsl(196,40%,40%)" },
      { name: "Stratosphere", maxKm: 50, color: "hsl(270,40%,40%)" },
      { name: "Mesosphere", maxKm: 80, color: "hsl(155,40%,40%)" },
    ];
    layers.forEach((l) => {
      g.append("line")
        .attr("x1", 0).attr("y1", yScale(l.maxKm))
        .attr("x2", w).attr("y2", yScale(l.maxKm))
        .attr("stroke", l.color).attr("stroke-width", 0.8)
        .attr("stroke-dasharray", "4,6").attr("opacity", 0.6);
      g.append("text")
        .attr("x", 4).attr("y", yScale(l.maxKm) - 3)
        .attr("fill", l.color).attr("font-size", 9).attr("opacity", 0.7)
        .text(l.name);
    });

    g.append("g").attr("class", "d3-axis").attr("transform", `translate(0,${h})`)
      .call(d3.axisBottom(xScale).ticks(6).tickFormat((d) => `L${Math.round(+d)}`));
    g.append("g").attr("class", "d3-axis")
      .call(d3.axisLeft(yScale).ticks(6).tickFormat((d) => `${d} km`));

    g.append("text").attr("transform", "rotate(-90)").attr("x", -h / 2).attr("y", -44)
      .attr("text-anchor", "middle").attr("fill", "hsl(220,20%,45%)").attr("font-size", 10).text("Altitude (km)");
    g.append("text").attr("x", w / 2).attr("y", h + 30).attr("text-anchor", "middle")
      .attr("fill", "hsl(220,20%,45%)").attr("font-size", 10).text("Atmospheric Level");

    const defs = svg.append("defs");
    const grad = defs.append("linearGradient").attr("id", "tempGrad2").attr("x1", 0).attr("x2", 1);
    [0, 0.25, 0.5, 0.75, 1].forEach((t) =>
      grad.append("stop").attr("offset", `${t * 100}%`).attr("stop-color", d3.interpolateRdYlBu(t))
    );
    const lg = g.append("g").attr("transform", `translate(${w - 100},2)`);
    lg.append("rect").attr("width", 96).attr("height", 7).attr("rx", 2).attr("fill", "url(#tempGrad2)").attr("opacity", 0.85);
    lg.append("text").attr("x", 0).attr("y", 17).attr("fill", "hsl(220,20%,55%)").attr("font-size", 9)
      .text(`${tempExtent[1].toFixed(0)} K`);
    lg.append("text").attr("x", 96).attr("y", 17).attr("text-anchor", "end").attr("fill", "hsl(220,20%,55%)").attr("font-size", 9)
      .text(`${tempExtent[0].toFixed(0)} K`);
  }, [data, levelFocus, setActiveVariable, setLevelFocus]);

  return (
    <div onMouseLeave={() => { setTooltip(null); setLevelFocus(null); }} className="w-full relative" style={{ height: 360 }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-[hsl(220,20%,45%)] animate-pulse">
          Loading cross-section...
        </div>
      )}
      <svg ref={svgRef} className="w-full" />
      {tooltip && (
        <div
          className="absolute z-10 pointer-events-none rounded-md border border-[hsl(196,80%,45%,0.45)] bg-[hsl(222,45%,7%,0.94)] px-2.5 py-2 text-[10px] shadow-lg backdrop-blur-sm"
          style={{ left: Math.min(tooltip.x + 10, 330), top: Math.max(8, tooltip.y - 66) }}
        >
          <div className="font-semibold text-[hsl(196,80%,68%)] mb-1">Nivel conectado</div>
          <div className="font-mono text-[hsl(210,40%,86%)] leading-4">
            L{tooltip.level} · {tooltip.altitudeKm.toFixed(1)} km<br />
            Vel. {tooltip.avgSpeed.toFixed(2)} m/s<br />
            Temp. {tooltip.avgTemp.toFixed(1)} K<br />
            ω {tooltip.avgW.toFixed(2)} m/s
          </div>
        </div>
      )}
    </div>
  );
}
