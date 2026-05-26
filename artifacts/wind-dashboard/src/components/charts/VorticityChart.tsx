import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { WindVector } from "@workspace/api-client-react";
import { useChartInteraction } from "../ChartInteractionContext";

interface Props {
  data: WindVector[] | undefined;
  loading: boolean;
}

type VortCell = { r: number; c: number; lat: number; lon: number; value: number; u: number; v: number; speed: number };

type Tooltip = {
  x: number;
  y: number;
  lat: number;
  lon: number;
  value: number;
  u: number;
  v: number;
  speed: number;
} | null;

function nearestCell(cells: VortCell[], lat: number, lon: number) {
  let best: VortCell | null = null;
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

export default function VorticityChart({ data, loading }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<Tooltip>(null);
  const { geoFocus, setGeoFocus, setActiveVariable } = useChartInteraction();

  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const W = svgRef.current.clientWidth || 1000;
    const H = 220;
    const margin = { top: 12, right: 16, bottom: 30, left: 48 };
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 ${W} ${H}`).attr("height", H);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const nLon = 72, nLat = 36;
    const latExtent = d3.extent(data, (d) => d.lat) as [number, number];
    const lonExtent = d3.extent(data, (d) => d.lon) as [number, number];

    const uGrid = new Array(nLat * nLon).fill(0);
    const vGrid = new Array(nLat * nLon).fill(0);
    const speedGrid = new Array(nLat * nLon).fill(0);
    const cnt = new Array(nLat * nLon).fill(0);
    data.forEach((pt) => {
      const latDen = latExtent[1] - latExtent[0] || 1;
      const lonDen = lonExtent[1] - lonExtent[0] || 1;
      const li = Math.floor(((pt.lat - latExtent[0]) / latDen) * nLat);
      const lo = Math.floor(((pt.lon - lonExtent[0]) / lonDen) * nLon);
      const r = Math.max(0, Math.min(nLat - 1, li));
      const c = Math.max(0, Math.min(nLon - 1, lo));
      const idx = r * nLon + c;
      uGrid[idx] += pt.u;
      vGrid[idx] += pt.v;
      speedGrid[idx] += pt.speed;
      cnt[idx]++;
    });
    for (let i = 0; i < uGrid.length; i++) {
      if (cnt[i] > 0) {
        uGrid[i] /= cnt[i];
        vGrid[i] /= cnt[i];
        speedGrid[i] /= cnt[i];
      }
    }

    const vortGrid = new Array(nLat * nLon).fill(0);
    for (let r = 1; r < nLat - 1; r++) {
      for (let c = 1; c < nLon - 1; c++) {
        const dvdx = (vGrid[r * nLon + c + 1] - vGrid[r * nLon + c - 1]) / 2;
        const dudy = (uGrid[(r + 1) * nLon + c] - uGrid[(r - 1) * nLon + c]) / 2;
        vortGrid[r * nLon + c] = dvdx - dudy;
      }
    }

    const maxVort = Math.max(Math.abs(d3.min(vortGrid) ?? 0), Math.abs(d3.max(vortGrid) ?? 0), 0.001);
    const colorScale = d3.scaleDiverging(d3.interpolateRdBu).domain([maxVort, 0, -maxVort]);

    const xScale = d3.scaleLinear().domain(lonExtent).range([0, w]);
    const yScale = d3.scaleLinear().domain(latExtent).range([h, 0]);
    const cellW = w / nLon;
    const cellH = h / nLat;

    const cells: VortCell[] = [];
    for (let r = 0; r < nLat; r++) {
      for (let c = 0; c < nLon; c++) {
        const idx = r * nLon + c;
        const lat = latExtent[0] + ((r + 0.5) / nLat) * (latExtent[1] - latExtent[0]);
        const lon = lonExtent[0] + ((c + 0.5) / nLon) * (lonExtent[1] - lonExtent[0]);
        cells.push({ r, c, lat, lon, value: vortGrid[idx], u: uGrid[idx], v: vGrid[idx], speed: speedGrid[idx] });
      }
    }

    const focusedCell = geoFocus ? nearestCell(cells, geoFocus.lat, geoFocus.lon) : null;

    g.selectAll("rect.vort-cell")
      .data(cells)
      .enter()
      .append("rect")
      .attr("class", "vort-cell")
      .attr("x", (d) => xScale(d.lon) - cellW / 2)
      .attr("y", (d) => yScale(d.lat) - cellH / 2)
      .attr("width", cellW + 0.5)
      .attr("height", cellH + 0.5)
      .attr("fill", (d) => colorScale(d.value))
      .attr("opacity", (d) => focusedCell && focusedCell.r === d.r && focusedCell.c === d.c ? 1 : 0.78)
      .attr("stroke", (d) => focusedCell && focusedCell.r === d.r && focusedCell.c === d.c ? "hsl(196,80%,72%)" : "transparent")
      .attr("stroke-width", (d) => focusedCell && focusedCell.r === d.r && focusedCell.c === d.c ? 1.3 : 0)
      .style("cursor", "crosshair")
      .on("mouseenter", (_event, d) => {
        setActiveVariable("vorticity");
        setGeoFocus({ lat: d.lat, lon: d.lon, speed: d.speed, u: d.u, v: d.v, value: d.value, variable: "vorticity", source: "Vorticidad" });
        setTooltip({ x: xScale(d.lon) + margin.left, y: yScale(d.lat) + margin.top, lat: d.lat, lon: d.lon, value: d.value, u: d.u, v: d.v, speed: d.speed });
      })
      .on("mousemove", (_event, d) => setTooltip({ x: xScale(d.lon) + margin.left, y: yScale(d.lat) + margin.top, lat: d.lat, lon: d.lon, value: d.value, u: d.u, v: d.v, speed: d.speed }))
      .on("mouseleave", () => {
        setTooltip(null);
        setGeoFocus(null);
      });

    g.append("g").attr("class", "d3-axis").attr("transform", `translate(0,${h})`)
      .call(d3.axisBottom(xScale).ticks(8).tickFormat((d) => `${d}°`));
    g.append("g").attr("class", "d3-axis")
      .call(d3.axisLeft(yScale).ticks(5).tickFormat((d) => `${d}°`));

    g.append("text").attr("x", w / 2).attr("y", h + 26).attr("text-anchor", "middle")
      .attr("fill", "hsl(220,20%,45%)").attr("font-size", 10).text("Longitude");
    g.append("text").attr("transform", "rotate(-90)").attr("x", -h / 2).attr("y", -36)
      .attr("text-anchor", "middle").attr("fill", "hsl(220,20%,45%)").attr("font-size", 10).text("Latitude");

    const defs = svg.append("defs");
    const grad = defs.append("linearGradient").attr("id", "vortGrad").attr("x1", 0).attr("x2", 1);
    grad.append("stop").attr("offset", "0%").attr("stop-color", d3.interpolateRdBu(0));
    grad.append("stop").attr("offset", "50%").attr("stop-color", d3.interpolateRdBu(0.5));
    grad.append("stop").attr("offset", "100%").attr("stop-color", d3.interpolateRdBu(1));
    const lg = g.append("g").attr("transform", `translate(${w / 2 - 60},2)`);
    lg.append("rect").attr("width", 120).attr("height", 8).attr("rx", 2).attr("fill", "url(#vortGrad)").attr("opacity", 0.85);
    lg.append("text").attr("x", 0).attr("y", 18).attr("fill", "hsl(220,20%,55%)").attr("font-size", 9).text(`−${maxVort.toFixed(2)}`);
    lg.append("text").attr("x", 60).attr("y", 18).attr("text-anchor", "middle").attr("fill", "hsl(220,20%,55%)").attr("font-size", 9).text("0");
    lg.append("text").attr("x", 120).attr("y", 18).attr("text-anchor", "end").attr("fill", "hsl(220,20%,55%)").attr("font-size", 9).text(`+${maxVort.toFixed(2)}`);
    lg.append("text").attr("x", 60).attr("y", -3).attr("text-anchor", "middle").attr("fill", "hsl(220,20%,45%)").attr("font-size", 9).text("Relative Vorticity (s⁻¹)");
  }, [data, geoFocus, setActiveVariable, setGeoFocus]);

  return (
    <div onMouseLeave={() => { setTooltip(null); setGeoFocus(null); }} className="w-full relative" style={{ height: 220 }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-[hsl(220,20%,45%)] animate-pulse">
          Computing vorticity...
        </div>
      )}
      <svg ref={svgRef} className="w-full" />
      {tooltip && (
        <div
          className="absolute z-10 pointer-events-none rounded-md border border-[hsl(196,80%,45%,0.45)] bg-[hsl(222,45%,7%,0.94)] px-2.5 py-2 text-[10px] shadow-lg backdrop-blur-sm"
          style={{ left: Math.min(tooltip.x + 10, 720), top: Math.max(8, tooltip.y - 56) }}
        >
          <div className="font-semibold text-[hsl(196,80%,68%)] mb-1">Vorticidad conectada</div>
          <div className="font-mono text-[hsl(210,40%,86%)] leading-4">
            ζ {tooltip.value.toFixed(3)} s⁻¹<br />
            Vel. {tooltip.speed.toFixed(2)} m/s<br />
            U {tooltip.u.toFixed(2)} · V {tooltip.v.toFixed(2)}<br />
            {tooltip.lat.toFixed(1)}°, {tooltip.lon.toFixed(1)}°
          </div>
        </div>
      )}
    </div>
  );
}
