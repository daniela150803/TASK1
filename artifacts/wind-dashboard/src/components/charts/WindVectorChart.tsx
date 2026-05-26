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

type Tooltip = {
  x: number;
  y: number;
  lat: number;
  lon: number;
  speed: number;
  u: number;
  v: number;
  source?: string;
} | null;

function nearestVector(data: WindVector[], lat: number, lon: number) {
  let best: WindVector | null = null;
  let bestDist = Infinity;
  data.forEach((pt) => {
    const dist = Math.hypot(pt.lat - lat, pt.lon - lon);
    if (dist < bestDist) {
      bestDist = dist;
      best = pt;
    }
  });
  return best;
}

export default function WindVectorChart({ data, loading }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<Tooltip>(null);
  const { geoFocus, setGeoFocus, setActiveVariable } = useChartInteraction();

  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current) return;

    const W = svgRef.current.clientWidth || 580;
    const H = 280;
    const margin = { top: 10, right: 12, bottom: 28, left: 38 };
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${W} ${H}`).attr("height", H);

    const defs = svg.append("defs");
    defs.append("clipPath").attr("id", "wvc-clip")
      .append("rect")
      .attr("x", margin.left).attr("y", margin.top)
      .attr("width", w).attr("height", h);

    defs.append("marker")
      .attr("id", "wvc-arrow")
      .attr("markerWidth", 3.2).attr("markerHeight", 3.2)
      .attr("refX", 3).attr("refY", 1.6)
      .attr("orient", "auto")
      .append("path").attr("d", "M0,0 L0,3.2 L3.2,1.6 z")
      .attr("fill", "currentColor");

    const lGrad = defs.append("linearGradient").attr("id", "wvc-speed-grad")
      .attr("x1", 0).attr("x2", 1);
    [0, 0.25, 0.5, 0.75, 1].forEach((t) =>
      lGrad.append("stop").attr("offset", `${t * 100}%`)
        .attr("stop-color", d3.interpolatePlasma(t))
    );

    const projection = d3.geoEquirectangular().fitSize([w, h], { type: "Sphere" });
    const pathGen = d3.geoPath().projection(projection);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    g.append("rect").attr("width", w).attr("height", h)
      .attr("fill", "hsl(215,42%,8%)").attr("rx", 4);

    const mapG = g.append("g").attr("clip-path", "url(#wvc-clip)");
    const graticule = d3.geoGraticule().step([30, 30]);
    mapG.append("path").datum(graticule())
      .attr("fill", "none")
      .attr("stroke", "rgba(80,130,200,0.18)")
      .attr("stroke-width", 0.5)
      .attr("d", pathGen);

    try {
      const land = feature(
        worldData as Parameters<typeof feature>[0],
        (worldData as { objects: { land: Parameters<typeof feature>[1] } }).objects.land
      );
      mapG.append("path")
        .datum(land as d3.GeoPermissibleObjects)
        .attr("fill", "hsl(215,18%,18%)")
        .attr("stroke", "hsl(215,22%,30%)")
        .attr("stroke-width", 0.5)
        .attr("d", pathGen);

      const countries = feature(
        worldData as Parameters<typeof feature>[0],
        (worldData as { objects: { countries: Parameters<typeof feature>[1] } }).objects.countries
      );
      mapG.append("path")
        .datum(countries as d3.GeoPermissibleObjects)
        .attr("fill", "none")
        .attr("stroke", "hsl(215,18%,26%)")
        .attr("stroke-width", 0.25)
        .attr("d", pathGen);
    } catch {
      // ignore
    }

    const maxSpeed = d3.max(data, (d) => d.speed) || 1;
    const colorScale = d3.scaleSequential(d3.interpolatePlasma).domain([0, maxSpeed]);
    const vecG = g.append("g").attr("clip-path", "url(#wvc-clip)");
    const externalFocus = geoFocus ? nearestVector(data, geoFocus.lat, geoFocus.lon) : null;

    data.forEach((pt) => {
      const projected = projection([pt.lon, pt.lat]);
      if (!projected) return;
      const [px, py] = projected;
      if (px < 0 || px > w || py < 0 || py > h) return;

      const angle = Math.atan2(-pt.v, pt.u);
      const len = (pt.speed / maxSpeed) * 8 + 3;
      const ex = px + Math.cos(angle) * len;
      const ey = py + Math.sin(angle) * len;
      const col = colorScale(pt.speed);
      const focused = externalFocus && externalFocus.lat === pt.lat && externalFocus.lon === pt.lon;

      const item = vecG.append("g")
        .style("cursor", "crosshair")
        .on("mouseenter", () => {
          setActiveVariable("speed");
          setGeoFocus({ lat: pt.lat, lon: pt.lon, speed: pt.speed, u: pt.u, v: pt.v, variable: "speed", source: "Campo vectorial" });
          setTooltip({ x: px + margin.left, y: py + margin.top, ...pt, source: "Campo vectorial" });
        })
        .on("mousemove", () => setTooltip({ x: px + margin.left, y: py + margin.top, ...pt, source: "Campo vectorial" }))
        .on("mouseleave", () => {
          setTooltip(null);
          setGeoFocus(null);
        });

      item.append("line")
        .attr("x1", px).attr("y1", py)
        .attr("x2", ex).attr("y2", ey)
        .attr("stroke", col)
        .attr("stroke-width", focused ? 1.45 : 0.85)
        .attr("opacity", focused ? 1 : 0.84)
        .attr("marker-end", "url(#wvc-arrow)")
        .style("color", col);

      item.append("circle")
        .attr("cx", px).attr("cy", py).attr("r", 5)
        .attr("fill", "transparent");
    });

    if (externalFocus) {
      const projected = projection([externalFocus.lon, externalFocus.lat]);
      if (projected) {
        const [px, py] = projected;
        vecG.append("circle")
          .attr("cx", px).attr("cy", py).attr("r", 8)
          .attr("fill", "none")
          .attr("stroke", "hsl(196,80%,72%)")
          .attr("stroke-width", 1.7)
          .attr("opacity", 0.95);
        vecG.append("circle")
          .attr("cx", px).attr("cy", py).attr("r", 3)
          .attr("fill", "hsl(196,80%,72%)")
          .attr("opacity", 0.95);
      }
    }

    const xScale = d3.scaleLinear().domain([-180, 180]).range([0, w]);
    const yScale = d3.scaleLinear().domain([-90, 90]).range([h, 0]);

    g.append("g").attr("class", "d3-axis").attr("transform", `translate(0,${h})`)
      .call(d3.axisBottom(xScale).ticks(6).tickFormat((d) => `${d}°`));
    g.append("g").attr("class", "d3-axis")
      .call(d3.axisLeft(yScale).ticks(5).tickFormat((d) => `${d}°`));

    const lgW = 100, lgH = 7;
    const lgG = g.append("g").attr("transform", `translate(${w - lgW - 4},4)`);
    lgG.append("rect").attr("width", lgW).attr("height", lgH).attr("rx", 2)
      .attr("fill", "url(#wvc-speed-grad)").attr("opacity", 0.9);
    lgG.append("text").attr("x", 0).attr("y", lgH + 10)
      .attr("fill", "hsl(220,20%,55%)").attr("font-size", 9).text("0");
    lgG.append("text").attr("x", lgW).attr("y", lgH + 10).attr("text-anchor", "end")
      .attr("fill", "hsl(220,20%,55%)").attr("font-size", 9)
      .text(`${maxSpeed.toFixed(0)} m/s`);
  }, [data, geoFocus, setActiveVariable, setGeoFocus]);

  return (
    <div onMouseLeave={() => { setTooltip(null); setGeoFocus(null); }} className="w-full relative" style={{ height: 280 }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-[hsl(220,20%,45%)] animate-pulse">
          Loading vectors…
        </div>
      )}
      <svg ref={svgRef} className="w-full" />
      {tooltip && (
        <div
          className="absolute z-10 pointer-events-none rounded-md border border-[hsl(196,80%,45%,0.45)] bg-[hsl(222,45%,7%,0.94)] px-2.5 py-2 text-[10px] shadow-lg backdrop-blur-sm"
          style={{ left: Math.min(tooltip.x + 10, 410), top: Math.max(8, tooltip.y - 48) }}
        >
          <div className="font-semibold text-[hsl(196,80%,68%)] mb-1">{tooltip.source ?? "Vector U/V"}</div>
          <div className="font-mono text-[hsl(210,40%,86%)] leading-4">
            Vel. {tooltip.speed.toFixed(2)} m/s<br />
            U {tooltip.u.toFixed(2)} · V {tooltip.v.toFixed(2)}<br />
            {tooltip.lat.toFixed(1)}°, {tooltip.lon.toFixed(1)}°
          </div>
        </div>
      )}
    </div>
  );
}
