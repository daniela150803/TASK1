import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { ProfilePoint } from "@workspace/api-client-react";
import { useChartInteraction } from "../ChartInteractionContext";

interface Props {
  data: ProfilePoint[] | undefined;
  loading: boolean;
}

type Tooltip = {
  x: number;
  y: number;
  level: number;
  altitudeKm: number;
  speed: number;
  temperature: number;
  u: number;
  v: number;
  w: number;
} | null;

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

export default function TemperatureProfileChart({ data, loading }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<Tooltip>(null);
  const { activeVariable, levelFocus, setLevelFocus, setActiveVariable } = useChartInteraction();

  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const W = svgRef.current.clientWidth || 420;
    const H = 240;
    const margin = { top: 14, right: 60, bottom: 30, left: 52 };
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 ${W} ${H}`).attr("height", H);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const altExtent = d3.extent(data, (d) => d.altitudeKm) as [number, number];
    const yScale = d3.scaleLinear().domain(altExtent).range([h, 0]);

    const speedExtent = d3.extent(data, (d) => d.speed) as [number, number];
    const xSpeedScale = d3.scaleLinear().domain([0, speedExtent[1]]).range([0, w * 0.5]);

    const tempExtent = d3.extent(data, (d) => d.temperature) as [number, number];
    const xTempScale = d3.scaleLinear().domain(tempExtent).range([w * 0.5, w]);

    g.append("g").attr("class", "d3-grid")
      .call(d3.axisLeft(yScale).tickSize(-w).tickFormat(() => "").ticks(6));

    const layers = [
      { lo: 0, hi: 12, color: "hsl(196,40%,9%)", name: "Troposphere" },
      { lo: 12, hi: 50, color: "hsl(270,40%,9%)", name: "Stratosphere" },
      { lo: 50, hi: 80, color: "hsl(155,40%,9%)", name: "Mesosphere" },
    ];
    layers.forEach((l) => {
      const y1 = yScale(Math.min(l.hi, altExtent[1]));
      const y2 = yScale(Math.max(l.lo, altExtent[0]));
      if (y2 > y1) {
        g.append("rect").attr("x", 0).attr("y", y1).attr("width", w).attr("height", y2 - y1)
          .attr("fill", l.color).attr("opacity", 0.4);
        g.append("text").attr("x", w - 4).attr("y", (y1 + y2) / 2).attr("text-anchor", "end")
          .attr("fill", "hsl(220,20%,35%)").attr("font-size", 8).attr("dominant-baseline", "middle")
          .text(l.name);
      }
    });

    const speedArea = d3.area<ProfilePoint>()
      .x0(0).x1((d) => xSpeedScale(d.speed))
      .y((d) => yScale(d.altitudeKm))
      .curve(d3.curveCatmullRom);
    g.append("path").datum(data).attr("fill", "hsl(196,80%,45%)").attr("opacity", activeVariable === "speed" ? 0.24 : 0.15)
      .attr("d", speedArea);

    const speedLine = d3.line<ProfilePoint>()
      .x((d) => xSpeedScale(d.speed)).y((d) => yScale(d.altitudeKm))
      .curve(d3.curveCatmullRom);
    g.append("path").datum(data).attr("fill", "none")
      .attr("stroke", "hsl(196,80%,55%)").attr("stroke-width", activeVariable === "speed" ? 3 : 2).attr("d", speedLine);

    const tempLine = d3.line<ProfilePoint>()
      .x((d) => xTempScale(d.temperature)).y((d) => yScale(d.altitudeKm))
      .curve(d3.curveCatmullRom);
    g.append("path").datum(data).attr("fill", "none")
      .attr("stroke", "hsl(38,90%,60%)").attr("stroke-width", activeVariable === "temperature" ? 3 : 2)
      .attr("stroke-dasharray", "6,3").attr("d", tempLine);

    const wExtent = d3.extent(data, (d) => d.w) as [number, number];
    const xWScale = d3.scaleLinear().domain([Math.min(wExtent[0], -0.5), Math.max(wExtent[1], 0.5)]).range([0, w]);
    const wLine = d3.line<ProfilePoint>()
      .x((d) => xWScale(d.w)).y((d) => yScale(d.altitudeKm))
      .curve(d3.curveCatmullRom);
    g.append("path").datum(data).attr("fill", "none")
      .attr("stroke", "hsl(155,70%,50%)").attr("stroke-width", activeVariable === "w" ? 2.6 : 1.5)
      .attr("stroke-dasharray", "3,4").attr("d", wLine);

    g.append("line")
      .attr("x1", xWScale(0)).attr("y1", 0).attr("x2", xWScale(0)).attr("y2", h)
      .attr("stroke", "hsl(220,20%,30%)").attr("stroke-width", 0.8).attr("stroke-dasharray", "2,4");

    const focusPoint = levelFocus ? nearestProfile(data, levelFocus.altitudeKm) : null;
    if (focusPoint) {
      const fy = yScale(focusPoint.altitudeKm);
      g.append("line")
        .attr("x1", 0).attr("x2", w).attr("y1", fy).attr("y2", fy)
        .attr("stroke", "hsl(196,80%,72%)").attr("stroke-width", 1.3)
        .attr("stroke-dasharray", "5,4");
      [
        { x: xSpeedScale(focusPoint.speed), col: "hsl(196,80%,65%)" },
        { x: xTempScale(focusPoint.temperature), col: "hsl(38,90%,65%)" },
        { x: xWScale(focusPoint.w), col: "hsl(155,70%,60%)" },
      ].forEach((pt) => {
        g.append("circle").attr("cx", pt.x).attr("cy", fy).attr("r", 4.5).attr("fill", pt.col).attr("stroke", "hsl(222,47%,7%)").attr("stroke-width", 1.2);
      });
    }

    const bisect = d3.bisector<ProfilePoint, number>((d) => d.altitudeKm).center;
    g.append("rect")
      .attr("x", 0).attr("y", 0).attr("width", w).attr("height", h)
      .attr("fill", "transparent")
      .style("cursor", "crosshair")
      .on("mousemove", (event) => {
        const [, my] = d3.pointer(event);
        const altitude = yScale.invert(my);
        const idx = Math.max(0, Math.min(data.length - 1, bisect(data, altitude)));
        const d = data[idx];
        setActiveVariable("temperature");
        setLevelFocus({ level: d.level, altitudeKm: d.altitudeKm, speed: d.speed, temperature: d.temperature, u: d.u, v: d.v, w: d.w, source: "Perfil de temperatura" });
        setTooltip({ x: Math.min(w - 130, Math.max(8, xTempScale(d.temperature))) + margin.left, y: yScale(d.altitudeKm) + margin.top, ...d });
      })
      .on("mouseleave", () => {
        setTooltip(null);
        setLevelFocus(null);
      });

    g.append("g").attr("class", "d3-axis").attr("transform", `translate(0,${h})`)
      .call(d3.axisBottom(xSpeedScale).ticks(4).tickFormat((d) => `${d}`));
    g.append("g").attr("class", "d3-axis")
      .call(d3.axisLeft(yScale).ticks(6).tickFormat((d) => `${d} km`));
    g.append("g").attr("class", "d3-axis").attr("transform", `translate(${w},0)`)
      .call(d3.axisRight(xTempScale.copy().range([h, 0])).ticks(4).tickFormat((d) => `${d}K`));

    const legend = [
      { col: "hsl(196,80%,55%)", label: "Speed (m/s)", dash: "" },
      { col: "hsl(38,90%,60%)", label: "Temp (K)", dash: "6,3" },
      { col: "hsl(155,70%,50%)", label: "ω (m/s)", dash: "3,4" },
    ];
    legend.forEach((l, i) => {
      const lx = 8 + i * 90;
      g.append("line").attr("x1", lx).attr("y1", 6).attr("x2", lx + 18).attr("y2", 6)
        .attr("stroke", l.col).attr("stroke-width", 2).attr("stroke-dasharray", l.dash);
      g.append("text").attr("x", lx + 22).attr("y", 9).attr("fill", "hsl(220,20%,55%)").attr("font-size", 9).text(l.label);
    });
  }, [data, activeVariable, levelFocus, setActiveVariable, setLevelFocus]);

  return (
    <div onMouseLeave={() => { setTooltip(null); setLevelFocus(null); }} className="w-full relative" style={{ height: 240 }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-[hsl(220,20%,45%)] animate-pulse">
          Loading profile...
        </div>
      )}
      <svg ref={svgRef} className="w-full" />
      {tooltip && (
        <div
          className="absolute z-10 pointer-events-none rounded-md border border-[hsl(196,80%,45%,0.45)] bg-[hsl(222,45%,7%,0.94)] px-2.5 py-2 text-[10px] shadow-lg backdrop-blur-sm"
          style={{ left: tooltip.x + 10, top: Math.max(8, tooltip.y - 62) }}
        >
          <div className="font-semibold text-[hsl(196,80%,68%)] mb-1">Perfil conectado</div>
          <div className="font-mono text-[hsl(210,40%,86%)] leading-4">
            L{tooltip.level} · {tooltip.altitudeKm.toFixed(1)} km<br />
            Vel. {tooltip.speed.toFixed(2)} m/s<br />
            Temp. {tooltip.temperature.toFixed(1)} K<br />
            ω {tooltip.w.toFixed(2)} m/s
          </div>
        </div>
      )}
    </div>
  );
}
