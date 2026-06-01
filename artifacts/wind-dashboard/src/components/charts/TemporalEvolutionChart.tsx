import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { LevelData } from "@workspace/api-client-react";
import { useChartInteraction } from "../ChartInteractionContext";

interface Props {
  data: LevelData[] | undefined;
  loading: boolean;
  face: number;
}

type SeriesPoint = {
  month: number;
  label: string;
  speed: number;
  level: number;
  altitudeKm: number;
  avgTemp: number;
  avgW: number;
  avgU: number;
  avgV: number;
  idx: number;
};

type Tooltip = {
  x: number;
  y: number;
  point: SeriesPoint;
} | null;

function nearestLevel(levels: LevelData[], altitudeKm: number) {
  let best = levels[0];
  let bestDist = Infinity;
  levels.forEach((level) => {
    const dist = Math.abs(level.altitudeKm - altitudeKm);
    if (dist < bestDist) {
      bestDist = dist;
      best = level;
    }
  });
  return best;
}

export default function TemporalEvolutionChart({ data, loading, face }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<Tooltip>(null);
  const { levelFocus, timeFocus, setLevelFocus, setTimeFocus, setActiveVariable } = useChartInteraction();

  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const W = svgRef.current.clientWidth || 900;
    const H = 270;
    const margin = { top: 16, right: 16, bottom: 58, left: 52 };
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 ${W} ${H}`).attr("height", H);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const nMonths = 24;
    const months = Array.from({ length: nMonths }, (_, i) => i);
    const monthLabels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

    const levSelect = [5, 15, 25, 35, 45].map((li, i) => data[li] ?? data[Math.min(data.length - 1, Math.floor((i + 1) * data.length / 6))]);
    const focusedLevel = levelFocus ? nearestLevel(levSelect, levelFocus.altitudeKm) : null;

    const allSpeeds: SeriesPoint[] = levSelect.flatMap((lev, si) =>
      months.map((m) => ({
        month: m,
        label: monthLabels[m] ?? `M${m + 1}`,
        speed:
          lev.avgSpeed *
          (1 + 0.3 * Math.sin(((m + si * 2) / nMonths) * Math.PI * 2)) +
          (face * 0.5 + si) * Math.sin(m * 0.8),
        level: lev.level,
        altitudeKm: lev.altitudeKm,
        avgTemp: lev.avgTemp,
        avgW: lev.avgW,
        avgU: lev.avgU,
        avgV: lev.avgV,
        idx: si,
      }))
    );

    const speedExtent = d3.extent(allSpeeds, (d) => d.speed) as [number, number];
    const xScale = d3.scaleLinear().domain([0, nMonths - 1]).range([0, w]);
    const yScale = d3.scaleLinear().domain([Math.max(0, speedExtent[0] - 5), speedExtent[1] + 5]).range([h, 0]);

    g.append("g").attr("class", "d3-grid")
      .call(d3.axisLeft(yScale).tickSize(-w).tickFormat(() => "").ticks(5));
    g.append("g").attr("class", "d3-grid").attr("transform", `translate(0,${h})`)
      .call(d3.axisBottom(xScale).tickSize(-h).tickFormat(() => "").ticks(nMonths / 2));

    const palette = [
      "hsl(196,80%,55%)",
      "hsl(155,70%,55%)",
      "hsl(38,90%,60%)",
      "hsl(270,70%,65%)",
      "hsl(0,70%,60%)",
    ];

    levSelect.forEach((lev, si) => {
      const pts = allSpeeds.filter((point) => point.level === lev.level);
      const isFocused = focusedLevel && focusedLevel.level === lev.level;

      const area = d3.area<SeriesPoint>()
        .x((d) => xScale(d.month))
        .y0((d) => yScale(d.speed - lev.avgSpeed * 0.08))
        .y1((d) => yScale(d.speed + lev.avgSpeed * 0.08))
        .curve(d3.curveCatmullRom);
      g.append("path").datum(pts).attr("fill", palette[si]).attr("opacity", isFocused ? 0.16 : 0.08).attr("d", area);

      const line = d3.line<SeriesPoint>()
        .x((d) => xScale(d.month)).y((d) => yScale(d.speed))
        .curve(d3.curveCatmullRom);
      g.append("path").datum(pts).attr("fill", "none")
        .attr("stroke", palette[si]).attr("stroke-width", isFocused ? 3.2 : 1.8).attr("opacity", isFocused ? 1 : 0.88).attr("d", line);
    });

    const maxByMonth = months.map((m) => ({
      month: m,
      speed: d3.max(levSelect, (lev, si) =>
        lev.avgSpeed * (1 + 0.3 * Math.sin(((m + si * 2) / nMonths) * Math.PI * 2)) +
        (face * 0.5 + si) * Math.sin(m * 0.8)
      )!,
    }));
    const envLine = d3.line<{ month: number; speed: number }>()
      .x((d) => xScale(d.month)).y((d) => yScale(d.speed)).curve(d3.curveCatmullRom);
    g.append("path").datum(maxByMonth).attr("fill", "none")
      .attr("stroke", "hsl(220,20%,35%)").attr("stroke-width", 1)
      .attr("stroke-dasharray", "4,4").attr("d", envLine);

    const seasonals = [
      { m: 0, label: "Jan" }, { m: 3, label: "Apr" }, { m: 6, label: "Jul" },
      { m: 9, label: "Oct" }, { m: 12, label: "Jan" }, { m: 15, label: "Apr" },
      { m: 18, label: "Jul" }, { m: 21, label: "Oct" },
    ];
    seasonals.forEach((s) => {
      g.append("line")
        .attr("x1", xScale(s.m)).attr("y1", 0)
        .attr("x2", xScale(s.m)).attr("y2", h)
        .attr("stroke", "hsl(220,20%,22%)").attr("stroke-width", 0.8);
    });

    if (timeFocus) {
      const fx = xScale(timeFocus.month);
      g.append("line")
        .attr("x1", fx).attr("x2", fx).attr("y1", 0).attr("y2", h)
        .attr("stroke", "hsl(270,70%,72%)").attr("stroke-width", 1.3)
        .attr("stroke-dasharray", "5,4");
    }

    const hitG = g.append("g");
    allSpeeds.forEach((point) => {
      const focused = (focusedLevel && focusedLevel.level === point.level) || (timeFocus && timeFocus.month === point.month);
      if (focused) {
        hitG.append("circle")
          .attr("cx", xScale(point.month)).attr("cy", yScale(point.speed))
          .attr("r", 4.4).attr("fill", palette[point.idx]).attr("stroke", "hsl(222,47%,7%)").attr("stroke-width", 1.2);
      }
      hitG.append("circle")
        .attr("cx", xScale(point.month)).attr("cy", yScale(point.speed))
        .attr("r", 7)
        .attr("fill", "transparent")
        .style("cursor", "crosshair")
        .on("mouseenter", () => {
          setActiveVariable("speed");
          setLevelFocus({ level: point.level, altitudeKm: point.altitudeKm, speed: point.speed, temperature: point.avgTemp, u: point.avgU, v: point.avgV, w: point.avgW, source: "Evolución temporal" });
          setTimeFocus({ month: point.month, label: point.label, value: point.speed, level: point.level, source: "Evolución temporal" });
          setTooltip({ x: xScale(point.month) + margin.left, y: yScale(point.speed) + margin.top, point });
        })
        .on("mousemove", () => setTooltip({ x: xScale(point.month) + margin.left, y: yScale(point.speed) + margin.top, point }))
        .on("mouseleave", () => {
          setTooltip(null);
          setLevelFocus(null);
          setTimeFocus(null);
        });
    });

    g.append("g").attr("class", "d3-axis").attr("transform", `translate(0,${h})`)
      .call(d3.axisBottom(xScale).ticks(12).tickFormat((d) => monthLabels[Math.round(+d)] ?? ""));
    g.append("g").attr("class", "d3-axis")
      .call(d3.axisLeft(yScale).ticks(5).tickFormat((d) => `${d.toFixed(0)}`));

    g.append("text").attr("transform", "rotate(-90)").attr("x", -h / 2).attr("y", -40)
      .attr("text-anchor", "middle").attr("fill", "hsl(220,20%,45%)").attr("font-size", 10).text("Avg Speed (m/s)");
    g.append("text").attr("x", w / 2).attr("y", h + 30).attr("text-anchor", "middle")
      .attr("fill", "hsl(220,20%,45%)").attr("font-size", 10).text("Month (2-year cycle)");

    levSelect.forEach((lev, si) => {
      const lx = si * 145;
      g.append("line").attr("x1", lx).attr("y1", h + 45).attr("x2", lx + 18).attr("y2", h + 45)
        .attr("stroke", palette[si]).attr("stroke-width", focusedLevel && focusedLevel.level === lev.level ? 3 : 2);
      g.append("text").attr("x", lx + 22).attr("y", h + 48)
        .attr("fill", focusedLevel && focusedLevel.level === lev.level ? "hsl(210,40%,88%)" : "hsl(220,20%,55%)").attr("font-size", 9)
        .text(`L${lev.level} ~${lev.altitudeKm} km`);
    });
  }, [data, face, levelFocus, timeFocus, setActiveVariable, setLevelFocus, setTimeFocus]);

  return (
    <div onMouseLeave={() => { setTooltip(null); setLevelFocus(null); setTimeFocus(null); }} className="w-full relative" style={{ height: 270 }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-[hsl(220,20%,45%)] animate-pulse">
          Loading temporal data...
        </div>
      )}
      <svg ref={svgRef} className="w-full" />
      {tooltip && (
        <div
          className="absolute z-10 pointer-events-none rounded-md border border-[hsl(196,80%,45%,0.45)] bg-[hsl(222,45%,7%,0.94)] px-2.5 py-2 text-[10px] shadow-lg backdrop-blur-sm"
          style={{ left: Math.min(tooltip.x + 10, 720), top: Math.max(8, tooltip.y - 58) }}
        >
          <div className="font-semibold text-[hsl(196,80%,68%)] mb-1">Evolución conectada · {tooltip.point.label}</div>
          <div className="font-mono text-[hsl(210,40%,86%)] leading-4">
            L{tooltip.point.level} · {tooltip.point.altitudeKm.toFixed(1)} km<br />
            Vel. {tooltip.point.speed.toFixed(2)} m/s<br />
            Temp. {tooltip.point.avgTemp.toFixed(1)} K<br />
            ω {tooltip.point.avgW.toFixed(2)} m/s
          </div>
        </div>
      )}
    </div>
  );
}
