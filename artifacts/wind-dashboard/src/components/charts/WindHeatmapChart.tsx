import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { WindVector } from "@workspace/api-client-react";
import { useChartInteraction } from "../ChartInteractionContext";

interface Props {
  data: WindVector[] | undefined;
  loading: boolean;
}

type HeatCell = { ri: number; ci: number; avg: number; count: number; lat: number; lon: number; u: number; v: number };

type Tooltip = {
  x: number;
  y: number;
  lat: number;
  lon: number;
  speed: number;
  count: number;
  u: number;
  v: number;
} | null;

function nearestCell(cells: HeatCell[], lat: number, lon: number) {
  let best: HeatCell | null = null;
  let bestDist = Infinity;
  cells.forEach((cell) => {
    const dist = Math.hypot(cell.lat - lat, cell.lon - lon);
    if (dist < bestDist) {
      bestDist = dist;
      best = cell;
    }
  });
  return best;
}

export default function WindHeatmapChart({ data, loading }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<Tooltip>(null);
  const { geoFocus, setGeoFocus, setActiveVariable } = useChartInteraction();

  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const W = svgRef.current.clientWidth || 420;
    const H = 210;
    const margin = { top: 10, right: 12, bottom: 26, left: 36 };
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 ${W} ${H}`).attr("height", H);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    g.append("rect").attr("width", w).attr("height", h).attr("rx", 4).attr("fill", "hsl(215,42%,8%)");

    const latBins = 20;
    const lonBins = 40;
    const latExtent = d3.extent(data, (d) => d.lat) as [number, number];
    const lonExtent = d3.extent(data, (d) => d.lon) as [number, number];
    if (latExtent[0] === undefined || lonExtent[0] === undefined) return;

    const xScale = d3.scaleLinear().domain(lonExtent).range([0, w]);
    const yScale = d3.scaleLinear().domain(latExtent).range([h, 0]);
    const cellW = w / lonBins;
    const cellH = h / latBins;

    const grid: number[][] = Array.from({ length: latBins }, () => new Array(lonBins).fill(0));
    const uGrid: number[][] = Array.from({ length: latBins }, () => new Array(lonBins).fill(0));
    const vGrid: number[][] = Array.from({ length: latBins }, () => new Array(lonBins).fill(0));
    const count: number[][] = Array.from({ length: latBins }, () => new Array(lonBins).fill(0));
    data.forEach((pt) => {
      const latDen = latExtent[1] - latExtent[0] || 1;
      const lonDen = lonExtent[1] - lonExtent[0] || 1;
      const li = Math.floor(((pt.lat - latExtent[0]) / latDen) * latBins);
      const lo = Math.floor(((pt.lon - lonExtent[0]) / lonDen) * lonBins);
      const r = Math.max(0, Math.min(latBins - 1, li));
      const c = Math.max(0, Math.min(lonBins - 1, lo));
      grid[r][c] += pt.speed;
      uGrid[r][c] += pt.u;
      vGrid[r][c] += pt.v;
      count[r][c]++;
    });

    const cells: HeatCell[] = [];
    for (let ri = 0; ri < latBins; ri++) {
      for (let ci = 0; ci < lonBins; ci++) {
        const avg = count[ri][ci] > 0 ? grid[ri][ci] / count[ri][ci] : 0;
        const u = count[ri][ci] > 0 ? uGrid[ri][ci] / count[ri][ci] : 0;
        const v = count[ri][ci] > 0 ? vGrid[ri][ci] / count[ri][ci] : 0;
        const lat = latExtent[0] + ((ri + 0.5) / latBins) * (latExtent[1] - latExtent[0]);
        const lon = lonExtent[0] + ((ci + 0.5) / lonBins) * (lonExtent[1] - lonExtent[0]);
        cells.push({ ri, ci, avg, count: count[ri][ci], lat, lon, u, v });
      }
    }

    const focusedCell = geoFocus ? nearestCell(cells, geoFocus.lat, geoFocus.lon) : null;
    const maxVal = d3.max(cells, (d) => d.avg) || 1;
    const colorScale = d3.scaleSequential(d3.interpolateInferno).domain([0, maxVal]);

    g.selectAll("rect.heat-cell")
      .data(cells)
      .enter()
      .append("rect")
      .attr("class", "heat-cell")
      .attr("x", (d) => xScale(d.lon) - cellW / 2)
      .attr("y", (d) => yScale(d.lat) - cellH / 2)
      .attr("width", cellW + 0.6)
      .attr("height", cellH + 0.6)
      .attr("fill", (d) => colorScale(d.avg))
      .attr("opacity", (d) => {
        const isFocused = focusedCell && focusedCell.ri === d.ri && focusedCell.ci === d.ci;
        return isFocused ? 1 : d.count > 0 ? 0.78 : 0.18;
      })
      .attr("stroke", (d) => focusedCell && focusedCell.ri === d.ri && focusedCell.ci === d.ci ? "hsl(196,80%,72%)" : "transparent")
      .attr("stroke-width", (d) => focusedCell && focusedCell.ri === d.ri && focusedCell.ci === d.ci ? 1.4 : 0)
      .style("cursor", "crosshair")
      .on("mouseenter", (_event, d) => {
        setActiveVariable("speed");
        setGeoFocus({ lat: d.lat, lon: d.lon, speed: d.avg, u: d.u, v: d.v, variable: "speed", source: "Mapa de calor" });
        setTooltip({ x: xScale(d.lon) + margin.left, y: yScale(d.lat) + margin.top, lat: d.lat, lon: d.lon, speed: d.avg, count: d.count, u: d.u, v: d.v });
      })
      .on("mousemove", (_event, d) => setTooltip({ x: xScale(d.lon) + margin.left, y: yScale(d.lat) + margin.top, lat: d.lat, lon: d.lon, speed: d.avg, count: d.count, u: d.u, v: d.v }))
      .on("mouseleave", () => {
        setTooltip(null);
        setGeoFocus(null);
      });

    g.append("g").attr("class", "d3-axis").attr("transform", `translate(0,${h})`)
      .call(d3.axisBottom(xScale).ticks(5).tickFormat((d) => `${d}°`));
    g.append("g").attr("class", "d3-axis")
      .call(d3.axisLeft(yScale).ticks(4).tickFormat((d) => `${d}°`));

    const defs = svg.append("defs");
    const grad = defs.append("linearGradient").attr("id", "heatGrad").attr("x1", 0).attr("x2", 1);
    [0, 0.25, 0.5, 0.75, 1].forEach((t) =>
      grad.append("stop").attr("offset", `${t * 100}%`).attr("stop-color", d3.interpolateInferno(t))
    );
    const lg = g.append("g").attr("transform", `translate(${w - 100},4)`);
    lg.append("rect").attr("width", 98).attr("height", 7).attr("rx", 2).attr("fill", "url(#heatGrad)").attr("opacity", 0.9);
    lg.append("text").attr("x", 0).attr("y", 17).attr("fill", "hsl(220,20%,55%)").attr("font-size", 9).text("0");
    lg.append("text").attr("x", 98).attr("y", 17).attr("text-anchor", "end").attr("fill", "hsl(220,20%,55%)").attr("font-size", 9).text(`${maxVal.toFixed(0)} m/s`);
  }, [data, geoFocus, setActiveVariable, setGeoFocus]);

  return (
    <div onMouseLeave={() => { setTooltip(null); setGeoFocus(null); }} className="w-full relative" style={{ height: 210 }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-[hsl(220,20%,45%)] animate-pulse">
          Loading heatmap...
        </div>
      )}
      <svg ref={svgRef} className="w-full" />
      {tooltip && (
        <div
          className="absolute z-10 pointer-events-none rounded-md border border-[hsl(196,80%,45%,0.45)] bg-[hsl(222,45%,7%,0.94)] px-2.5 py-2 text-[10px] shadow-lg backdrop-blur-sm"
          style={{ left: Math.min(tooltip.x + 10, 360), top: Math.max(8, tooltip.y - 58) }}
        >
          <div className="font-semibold text-[hsl(196,80%,68%)] mb-1">Celda de calor conectada</div>
          <div className="font-mono text-[hsl(210,40%,86%)] leading-4">
            Prom. {tooltip.speed.toFixed(2)} m/s<br />
            U {tooltip.u.toFixed(2)} · V {tooltip.v.toFixed(2)}<br />
            Puntos {tooltip.count}<br />
            {tooltip.lat.toFixed(1)}°, {tooltip.lon.toFixed(1)}°
          </div>
        </div>
      )}
    </div>
  );
}
