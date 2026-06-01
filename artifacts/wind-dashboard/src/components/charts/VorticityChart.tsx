import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { feature } from "topojson-client";
import type { WindVector } from "@workspace/api-client-react";
import { useChartInteraction } from "../ChartInteractionContext";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import worldData from "world-atlas/countries-110m.json";

interface Props {
  data: WindVector[] | undefined;
  loading: boolean;
}

type VortCell = {
  r: number; c: number;
  lat: number; lon: number;
  value: number; u: number; v: number; speed: number;
  px: number; py: number; // projected pixel center
};

type Tooltip = {
  x: number; y: number;
  lat: number; lon: number;
  value: number; u: number; v: number; speed: number;
} | null;

function nearestCell(cells: VortCell[], lat: number, lon: number) {
  let best: VortCell | null = null;
  let bestDist = Infinity;
  cells.forEach((cell) => {
    const dist = Math.hypot(cell.lat - lat, cell.lon - lon);
    if (dist < bestDist) { bestDist = dist; best = cell; }
  });
  return best;
}

export default function VorticityChart({ data, loading }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<Tooltip>(null);
  const [maxVort, setMaxVort] = useState<number>(0);
  const { geoFocus, setGeoFocus, setActiveVariable } = useChartInteraction();

  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const W = svgRef.current.clientWidth || 1000;
    // Taller height so the world map isn't cramped — same ratio as WindVectorChart
    const H = 460;
    const margin = { top: 12, right: 200, bottom: 30, left: 60 };
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 ${W} ${H}`).attr("height", H);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // ── Grid dimensions ───────────────────────────────────────────────────────
    const nLon = 72, nLat = 36;
    const latExtent = d3.extent(data, (d) => d.lat) as [number, number];
    const lonExtent = d3.extent(data, (d) => d.lon) as [number, number];

    const uGrid    = new Array(nLat * nLon).fill(0);
    const vGrid    = new Array(nLat * nLon).fill(0);
    const speedGrid = new Array(nLat * nLon).fill(0);
    const cnt      = new Array(nLat * nLon).fill(0);

    data.forEach((pt) => {
      const latDen = latExtent[1] - latExtent[0] || 1;
      const lonDen = lonExtent[1] - lonExtent[0] || 1;
      const li = Math.floor(((pt.lat - latExtent[0]) / latDen) * nLat);
      const lo = Math.floor(((pt.lon - lonExtent[0]) / lonDen) * nLon);
      const r = Math.max(0, Math.min(nLat - 1, li));
      const c = Math.max(0, Math.min(nLon - 1, lo));
      const idx = r * nLon + c;
      uGrid[idx] += pt.u; vGrid[idx] += pt.v; speedGrid[idx] += pt.speed; cnt[idx]++;
    });
    for (let i = 0; i < uGrid.length; i++) {
      if (cnt[i] > 0) { uGrid[i] /= cnt[i]; vGrid[i] /= cnt[i]; speedGrid[i] /= cnt[i]; }
    }

    const vortGrid = new Array(nLat * nLon).fill(0);
    for (let r = 1; r < nLat - 1; r++) {
      for (let c = 1; c < nLon - 1; c++) {
        const dvdx = (vGrid[r * nLon + c + 1] - vGrid[r * nLon + c - 1]) / 2;
        const dudy = (uGrid[(r + 1) * nLon + c] - uGrid[(r - 1) * nLon + c]) / 2;
        vortGrid[r * nLon + c] = dvdx - dudy;
      }
    }

    const maxVortVal = Math.max(Math.abs(d3.min(vortGrid) ?? 0), Math.abs(d3.max(vortGrid) ?? 0), 0.001);
    setMaxVort(maxVortVal);
    const colorScale = d3.scaleDiverging(d3.interpolateRdBu).domain([maxVortVal, 0, -maxVortVal]);

    // ── Projection — identical strategy to WindVectorChart ────────────────────
    // Fit the full sphere to [w × h] so country shapes are correct and the
    // lon/lat → pixel mapping is a clean equirectangular linear transform.
    const projection = d3.geoEquirectangular().fitSize([w, h], { type: "Sphere" });
    const pathGen    = d3.geoPath().projection(projection);

    // Helper: project [lon, lat] → [px, py] relative to the inner group origin
    const project = (lon: number, lat: number): [number, number] | null =>
      projection([lon, lat]) ?? null;

    // ── Axes derived from the projection (guaranteed alignment) ───────────────
    // Instead of an independent linear scale, we derive axis tick positions
    // directly from the projection so axes always match the map.
    const xAtLon = (lon: number) => (project(lon, 0) ?? [0])[0];
    const yAtLat = (lat: number) => (project(0, lat) ?? [0, 0])[1];

    // ── Defs ──────────────────────────────────────────────────────────────────
    const defs = svg.append("defs");
    defs.append("clipPath").attr("id", "vort-clip")
      .append("rect").attr("x", 0).attr("y", 0).attr("width", w).attr("height", h);

    // ── Map background ────────────────────────────────────────────────────────
    const mapG = g.append("g").attr("clip-path", "url(#vort-clip)");

    mapG.append("rect").attr("width", w).attr("height", h)
      .attr("fill", "hsl(215,42%,8%)").attr("rx", 4);

    const graticule = d3.geoGraticule().step([30, 30]);
    mapG.append("path").datum(graticule())
      .attr("fill", "none")
      .attr("stroke", "rgba(80,130,200,0.15)")
      .attr("stroke-width", 0.5)
      .attr("d", pathGen);

    try {
      const land = feature(
        worldData as Parameters<typeof feature>[0],
        (worldData as { objects: { land: Parameters<typeof feature>[1] } }).objects.land
      );
      mapG.append("path")
        .datum(land as d3.GeoPermissibleObjects)
        .attr("fill", "hsl(215,18%,20%)")
        .attr("stroke", "hsl(215,22%,48%)")
        .attr("stroke-width", 0.5)
        .attr("d", pathGen);

      const countries = feature(
        worldData as Parameters<typeof feature>[0],
        (worldData as { objects: { countries: Parameters<typeof feature>[1] } }).objects.countries
      );
      mapG.append("path")
        .datum(countries as d3.GeoPermissibleObjects)
        .attr("fill", "none")
        .attr("stroke", "hsl(215,18%,28%)")
        .attr("stroke-width", 0.25)
        .attr("d", pathGen);
    } catch {
      // world-atlas unavailable — map layer silently skipped
    }

    // ── Vorticity cell grid ───────────────────────────────────────────────────
    // Use the full globe domain so cells cover ±180° / ±90°, matching the map.
    // Data is still binned from latExtent/lonExtent above; cells outside the
    // data range will have value 0 (neutral white on the RdBu scale).
    const gridLonMin = -180, gridLonMax = 180;
    const gridLatMin =  -90, gridLatMax =  90;

    const lonStep = (gridLonMax - gridLonMin) / nLon;
    const latStep = (gridLatMax - gridLatMin) / nLat;

    // One-cell pixel size via projection (linear, so one sample suffices)
    const [px0] = project(gridLonMin, 0) ?? [0];
    const [px1] = project(gridLonMin + lonStep, 0) ?? [1];
    const [, py0] = project(0, gridLatMin) ?? [0, 0];
    const [, py1] = project(0, gridLatMin + latStep) ?? [0, 1];

    const cellW = Math.abs(px1 - px0) + 0.5;
    const cellH = Math.abs(py1 - py0) + 0.5;

    const cells: VortCell[] = [];
    for (let r = 0; r < nLat; r++) {
      for (let c = 0; c < nLon; c++) {
        // Map this full-globe cell center back to the data grid index
        const lat = gridLatMin + ((r + 0.5) / nLat) * (gridLatMax - gridLatMin);
        const lon = gridLonMin + ((c + 0.5) / nLon) * (gridLonMax - gridLonMin);

        // Find the nearest data-grid cell
        const latDen = latExtent[1] - latExtent[0] || 1;
        const lonDen = lonExtent[1] - lonExtent[0] || 1;
        const dr = Math.round(((lat - latExtent[0]) / latDen) * (nLat - 1));
        const dc = Math.round(((lon - lonExtent[0]) / lonDen) * (nLon - 1));
        const dataR = Math.max(0, Math.min(nLat - 1, dr));
        const dataC = Math.max(0, Math.min(nLon - 1, dc));
        const idx = dataR * nLon + dataC;

        const projected = project(lon, lat);
        if (!projected) continue;
        const [px, py] = projected;
        cells.push({
          r, c, lat, lon,
          value: vortGrid[idx], u: uGrid[idx], v: vGrid[idx], speed: speedGrid[idx],
          px, py,
        });
      }
    }

    const focusedCell = geoFocus ? nearestCell(cells, geoFocus.lat, geoFocus.lon) : null;

    const vortG = g.append("g").attr("clip-path", "url(#vort-clip)");

    vortG.selectAll("rect.vort-cell")
      .data(cells)
      .enter()
      .append("rect")
      .attr("class", "vort-cell")
      .attr("x", (d) => d.px - cellW / 2)
      .attr("y", (d) => d.py - cellH / 2)
      .attr("width", cellW)
      .attr("height", cellH)
      .attr("fill", (d) => colorScale(d.value))
      .attr("opacity", (d) =>
        focusedCell && focusedCell.r === d.r && focusedCell.c === d.c ? 0.92 : 0.38
      )
      .attr("stroke", (d) =>
        focusedCell && focusedCell.r === d.r && focusedCell.c === d.c ? "hsl(196,80%,72%)" : "transparent"
      )
      .attr("stroke-width", (d) =>
        focusedCell && focusedCell.r === d.r && focusedCell.c === d.c ? 1.3 : 0
      )
      .style("cursor", "crosshair")
      // ── Interaction handlers — identical to original ───────────────────────
      .on("mouseenter", (_event, d) => {
        setActiveVariable("vorticity");
        setGeoFocus({ lat: d.lat, lon: d.lon, speed: d.speed, u: d.u, v: d.v, value: d.value, variable: "vorticity", source: "Vorticidad" });
        setTooltip({ x: d.px + margin.left, y: d.py + margin.top, lat: d.lat, lon: d.lon, value: d.value, u: d.u, v: d.v, speed: d.speed });
      })
      .on("mousemove", (_event, d) =>
        setTooltip({ x: d.px + margin.left, y: d.py + margin.top, lat: d.lat, lon: d.lon, value: d.value, u: d.u, v: d.v, speed: d.speed })
      )
      .on("mouseleave", () => {
        setTooltip(null);
        setGeoFocus(null);
      });

    // ── Axes — tick positions derived from projection ─────────────────────────
    const lonTicks = [-150, -100, -50, 0, 50, 100, 150];
    const latTicks = [-50, 0, 50];

    // Bottom axis
    const axisG = g.append("g").attr("transform", `translate(0,${h})`);
    axisG.append("line")
      .attr("x1", 0).attr("x2", w)
      .attr("stroke", "hsl(220,20%,30%)").attr("stroke-width", 0.5);
    lonTicks.forEach((lon) => {
      const x = xAtLon(lon);
      axisG.append("line").attr("x1", x).attr("x2", x).attr("y1", 0).attr("y2", 4)
        .attr("stroke", "hsl(220,20%,40%)").attr("stroke-width", 0.5);
      axisG.append("text").attr("x", x).attr("y", 14).attr("text-anchor", "middle")
        .attr("fill", "hsl(220,20%,55%)").attr("font-size", 9).text(`${lon}°`);
    });

    // Left axis
    const yAxisG = g.append("g");
    yAxisG.append("line")
      .attr("y1", 0).attr("y2", h)
      .attr("stroke", "hsl(220,20%,30%)").attr("stroke-width", 0.5);
    latTicks.forEach((lat) => {
      const y = yAtLat(lat);
      yAxisG.append("line").attr("x1", -4).attr("x2", 0).attr("y1", y).attr("y2", y)
        .attr("stroke", "hsl(220,20%,40%)").attr("stroke-width", 0.5);
      yAxisG.append("text").attr("x", -6).attr("y", y + 3).attr("text-anchor", "end")
        .attr("fill", "hsl(220,20%,55%)").attr("font-size", 9).text(`${lat}°`);
    });

    // Axis labels
    g.append("text").attr("x", w / 2).attr("y", h + 26).attr("text-anchor", "middle")
      .attr("fill", "hsl(220,20%,45%)").attr("font-size", 10).text("Longitud");
    g.append("text").attr("transform", "rotate(-90)").attr("x", -h / 2).attr("y", -36)
      .attr("text-anchor", "middle").attr("fill", "hsl(220,20%,45%)").attr("font-size", 10).text("Latitud");

    // Legend is rendered as a JSX overlay (see return) so it never
    // occupies SVG space and cannot compress the map area.

  }, [data, geoFocus, setActiveVariable, setGeoFocus]);

  return (
    <div onMouseLeave={() => { setTooltip(null); setGeoFocus(null); }} className="w-full relative" style={{ height: 460 }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-[hsl(220,20%,45%)] animate-pulse">
          Computing vorticity...
        </div>
      )}
      <svg ref={svgRef} className="w-full" />

      {/* ── Color-scale legend — vertical bar in the right margin, centered ── */}
      {maxVort > 0 && (
        <div
          className="absolute pointer-events-none flex flex-col items-center gap-1"
          style={{ right: 45, top: "50%", transform: "translateY(-50%)" }}
        >
          {/* title */}
          <span
            className="font-mono text-center leading-tight text-[hsl(220,20%,60%)]"
            style={{ fontSize: 18 }}
          >
            Vorticidad<br />Relativa<br />(s⁻¹)
          </span>

          {/* max label */}
          <span className="font-mono text-[hsl(220,20%,60%)]" style={{ fontSize: 15 }}>
            +{maxVort.toFixed(2)}
          </span>

          {/* gradient bar with centered 0 tick */}
          <div className="relative" style={{ width: 16, height: 250 }}>
            <div
              className="absolute inset-0 rounded-sm"
              style={{
                background: `linear-gradient(to bottom,
                  ${d3.interpolateRdBu(1)},
                  ${d3.interpolateRdBu(0.75)},
                  ${d3.interpolateRdBu(0.5)},
                  ${d3.interpolateRdBu(0.25)},
                  ${d3.interpolateRdBu(0)})`,
                opacity: 0.92,
              }}
            />
            {/* 0 tick mark at the midpoint */}
            <div
              className="absolute"
              style={{ top: "50%", left: "100%", transform: "translateY(-50%)" }}
            >
              <div style={{ width: 5, height: 1, background: "hsl(220,20%,60%)", marginLeft: 1 }} />
              <span
                className="font-mono text-[hsl(220,20%,60%)] absolute"
                style={{ fontSize: 15, top: "50%", left: 8, transform: "translateY(-50%)" }}
              >
                0
              </span>
            </div>
          </div>

          {/* min label */}
          <span className="font-mono text-[hsl(220,20%,60%)]" style={{ fontSize: 15 }}>
            −{maxVort.toFixed(2)}
          </span>
        </div>
      )}

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
