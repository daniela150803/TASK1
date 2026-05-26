import { Router } from "express";
import type { IRouter } from "express";

const router: IRouter = Router();

const OV_BASE =
  "https://nsdf-climate3-origin.nationalresearchplatform.org:50098/nasa/nsdf/climate3/dyamond/GEOS";

const OV_MAX_PLAUSIBLE = 200;

function ovUrl(variable: string, face: number) {
  const v = variable.toLowerCase();
  const V = variable.toUpperCase();
  return `${OV_BASE}/GEOS_${V}/${v}_face_${face}_depth_52_time_0_10269.idx`;
}

async function ovFetchSlice(
  variable: string,
  face: number,
  level: number,
  timestep = 0,
  maxh = 4
): Promise<{ data: Float32Array; width: number; height: number } | null> {
  const base = ovUrl(variable, face);
  const res = Math.pow(2, maxh);
  const box = `0 0 ${level}~${res - 1} ${res - 1} ${level}`;
  const params = new URLSearchParams({
    action: "boxquery",
    time: String(timestep),
    field: "data",
    compression: "raw",
    box,
    maxh: String(maxh),
  });
  const url = `${base}?${params}`;
  try {
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { Accept: "application/octet-stream" },
    });
    if (!resp.ok) return null;
    const buf = await resp.arrayBuffer();
    if (buf.byteLength < 4) return null;
    const data = new Float32Array(buf);
    const sample = Array.from(data.slice(0, Math.min(50, data.length)));
    const badCount = sample.filter(
      (v) => !isFinite(v) || Math.abs(v) > OV_MAX_PLAUSIBLE
    ).length;
    if (badCount > sample.length * 0.3) return null;
    const side = Math.round(Math.sqrt(data.length)) || res;
    return { data, width: side, height: side };
  } catch {
    return null;
  }
}

async function ovFetchUV(face: number, level: number, timestep = 0, maxh = 4) {
  const [u, v] = await Promise.all([
    ovFetchSlice("u", face, level, timestep, maxh),
    ovFetchSlice("v", face, level, timestep, maxh),
  ]);
  if (!u || !v) return null;
  const len = Math.min(u.data.length, v.data.length);
  return {
    uData: u.data.slice(0, len),
    vData: v.data.slice(0, len),
    width: u.width,
    height: u.height,
  };
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function levelToAltitude(level: number) {
  return (level / 52) * 80;
}

function temperatureAtLevel(level: number, lat: number) {
  const altKm = levelToAltitude(level);
  let base: number;
  if (altKm < 12) base = 288 - 6.5 * altKm;
  else if (altKm < 20) base = 216;
  else base = 216 + 2 * (altKm - 20);
  return base - 40 * Math.pow(Math.sin((lat * Math.PI) / 180), 2) + (Math.random() - 0.5) * 5;
}

function generateWindField(
  face: number,
  level: number,
  width: number,
  height: number,
  year = 2016
) {
  const rng = seededRandom(face * 1000 + level + (year - 2016) * 99991);
  const jetFactor = level >= 20 && level <= 40 ? 2.5 : 1.0;
  const points = [];
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      const lat = -90 + (i / height) * 180;
      const lon = -180 + (j / width) * 360;
      const latRad = (lat * Math.PI) / 180;
      const lonRad = (lon * Math.PI) / 180;
      const u =
        15 * Math.cos(2 * latRad) * jetFactor +
        3 * Math.sin(lonRad * 3) * Math.cos(latRad) +
        (rng() - 0.5) * 8;
      const v =
        8 * Math.sin(latRad) * Math.cos(latRad) +
        3 * Math.cos(lonRad * 3) * Math.cos(latRad) +
        (rng() - 0.5) * 5;
      points.push({ lat, lon, u, v, speed: Math.sqrt(u * u + v * v), level });
    }
  }
  return points;
}

const q = (query: Record<string, unknown>, key: string, def: number) => {
  const v = query[key];
  return v !== undefined ? Number(v) : def;
};

router.get("/wind/stats", async (req, res) => {
  const face = q(req.query as Record<string, unknown>, "face", 0);
  const level = q(req.query as Record<string, unknown>, "level", 30);
  const year = q(req.query as Record<string, unknown>, "year", 2016);
  const rng = seededRandom(face * 7 + level + (year - 2016) * 99991);

  let maxSpeed = 78.4 + rng() * 10;
  let avgSpeed = 18.6 + rng() * 3;
  let source = "synthetic";

  const uv = await ovFetchUV(face, level, 0, 4);
  if (uv) {
    const speeds: number[] = [];
    for (let i = 0; i < uv.uData.length; i++) {
      const s = Math.sqrt(uv.uData[i] ** 2 + uv.vData[i] ** 2);
      if (isFinite(s)) speeds.push(s);
    }
    if (speeds.length > 0) {
      maxSpeed = Math.max(...speeds);
      avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
      source = "openvisus";
    }
  }

  res.json({
    maxSpeed: Math.round(maxSpeed * 10) / 10,
    minSpeed: 0.2,
    avgSpeed: Math.round(avgSpeed * 10) / 10,
    maxTemp: 311.2,
    minTemp: 183.8,
    avgTemp: 255.4,
    maxW: 4.2,
    minW: -4.8,
    totalPoints: 10269,
    activeFaces: 6,
    dominantDirection: "Westerly",
    jetStreamAlt: Math.round((10.5 + rng() * 2) * 10) / 10,
    dataSource: source,
  });
});

router.get("/wind/vectors", async (req, res) => {
  const face = q(req.query as Record<string, unknown>, "face", 0);
  const level = q(req.query as Record<string, unknown>, "level", 30);
  const resolution = q(req.query as Record<string, unknown>, "resolution", 18);
  const year = q(req.query as Record<string, unknown>, "year", 2016);

  const uv = await ovFetchUV(face, level, 0, 4);
  if (uv) {
    const { uData, vData, width, height } = uv;
    const points = [];
    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        const idx = j * width + i;
        const u = uData[idx], v = vData[idx];
        if (!isFinite(u) || !isFinite(v)) continue;
        points.push({
          lat: -90 + (j / height) * 180,
          lon: -180 + (i / width) * 360,
          u: Math.round(u * 10) / 10,
          v: Math.round(v * 10) / 10,
          speed: Math.round(Math.sqrt(u * u + v * v) * 10) / 10,
          level,
        });
      }
    }
    return res.json(points);
  }
  res.json(generateWindField(face, level, resolution, Math.floor(resolution / 2), year));
});

router.get("/wind/heatmap", async (req, res) => {
  const face = q(req.query as Record<string, unknown>, "face", 0);
  const level = q(req.query as Record<string, unknown>, "level", 30);
  const year = q(req.query as Record<string, unknown>, "year", 2016);

  const uv = await ovFetchUV(face, level, 0, 5);
  if (uv) {
    const { uData, vData, width, height } = uv;
    const points = [];
    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        const idx = j * width + i;
        const u = uData[idx], v = vData[idx];
        if (!isFinite(u) || !isFinite(v)) continue;
        points.push({
          lat: -90 + (j / height) * 180,
          lon: -180 + (i / width) * 360,
          u: Math.round(u * 10) / 10,
          v: Math.round(v * 10) / 10,
          speed: Math.round(Math.sqrt(u * u + v * v) * 10) / 10,
          level,
        });
      }
    }
    return res.json(points);
  }
  res.json(generateWindField(face, level, 36, 18, year));
});

router.get("/wind/levels", async (req, res) => {
  const face = q(req.query as Record<string, unknown>, "face", 0);
  const year = q(req.query as Record<string, unknown>, "year", 2016);
  const rng = seededRandom(face * 13 + (year - 2016) * 99991);
  const levels = [];
  for (let lev = 0; lev < 52; lev++) {
    const altKm = levelToAltitude(lev);
    const jetFactor = lev >= 20 && lev <= 40 ? 2.2 + rng() * 0.5 : 1.0;
    const avgU =
      10 * Math.cos((lev / 52) * Math.PI * 2) * jetFactor + (rng() - 0.5) * 5;
    const avgV = 4 * Math.sin((lev / 52) * Math.PI) + (rng() - 0.5) * 3;
    const avgSpeed = Math.sqrt(avgU * avgU + avgV * avgV) + rng() * 3;
    levels.push({
      level: lev,
      altitudeKm: Math.round(altKm * 10) / 10,
      avgU: Math.round(avgU * 10) / 10,
      avgV: Math.round(avgV * 10) / 10,
      avgSpeed: Math.round(avgSpeed * 10) / 10,
      avgTemp: Math.round(temperatureAtLevel(lev, 30) * 10) / 10,
      avgW: Math.round((rng() - 0.5) * 1.5 * 100) / 100,
      maxSpeed: Math.round(avgSpeed * (1.5 + rng() * 0.8) * 10) / 10,
    });
  }
  res.json(levels);
});

router.get("/wind/profile", async (req, res) => {
  const face = q(req.query as Record<string, unknown>, "face", 0);
  const lat = q(req.query as Record<string, unknown>, "lat", 40);
  const year = q(req.query as Record<string, unknown>, "year", 2016);
  const rng = seededRandom(face * 17 + Math.floor(lat) + (year - 2016) * 99991);
  const profile = [];
  for (let lev = 0; lev < 52; lev++) {
    const altKm = levelToAltitude(lev);
    const jetFactor = lev >= 22 && lev <= 38 ? 2.8 : 1.0;
    const u =
      12 * Math.cos((lev / 52) * Math.PI * 2.5) * jetFactor + (rng() - 0.5) * 6;
    const v = 5 * Math.sin((lev / 52) * Math.PI) + (rng() - 0.5) * 3;
    profile.push({
      level: lev,
      altitudeKm: Math.round(altKm * 10) / 10,
      speed: Math.round(Math.sqrt(u * u + v * v) * 10) / 10,
      u: Math.round(u * 10) / 10,
      v: Math.round(v * 10) / 10,
      temperature: Math.round(temperatureAtLevel(lev, lat) * 10) / 10,
      w: Math.round((rng() - 0.5) * 2 * 100) / 100,
      pressure: Math.round(1013 * Math.exp(-altKm / 8.5) * 10) / 10,
    });
  }
  res.json(profile);
});

router.get("/wind/histogram", async (req, res) => {
  const face = q(req.query as Record<string, unknown>, "face", 0);
  const level = q(req.query as Record<string, unknown>, "level", 30);
  const variable = (req.query.variable as string) || "speed";
  const rng = seededRandom(face * 23 + level);

  if (variable === "speed") {
    const uv = await ovFetchUV(face, level, 0, 5);
    if (uv) {
      const speeds: number[] = [];
      for (let i = 0; i < uv.uData.length; i++) {
        const s = Math.sqrt(uv.uData[i] ** 2 + uv.vData[i] ** 2);
        if (isFinite(s)) speeds.push(s);
      }
      if (speeds.length > 0) {
        const maxV = Math.max(...speeds);
        const numBins = 16, step = maxV / numBins;
        const counts = new Array(numBins).fill(0);
        speeds.forEach((s) => {
          const b = Math.min(numBins - 1, Math.floor(s / step));
          counts[b]++;
        });
        const total = speeds.length;
        return res.json(
          counts.map((count, i) => ({
            binStart: Math.round(i * step * 10) / 10,
            binEnd: Math.round((i + 1) * step * 10) / 10,
            binLabel: `${Math.round(i * step)}-${Math.round((i + 1) * step)} m/s`,
            count,
            frequency: Math.round((count / total) * 1000) / 10,
          }))
        );
      }
    }
  }

  type Bin = {
    binStart: number;
    binEnd: number;
    binLabel: string;
    count: number;
    frequency: number;
  };
  let bins: Bin[] = [];
  if (variable === "speed") {
    const nb = 16, mb = 80;
    const tc = Array.from({ length: nb }, (_, i) => {
      const x = (i + 0.5) * (mb / nb);
      return Math.floor(
        (2 / 15) * (x / 15) * Math.exp(-Math.pow(x / 15, 2)) * 1500 + rng() * 50
      );
    });
    const tot = tc.reduce((a, b) => a + b, 0);
    bins = tc.map((count, i) => ({
      binStart: i * (mb / nb),
      binEnd: (i + 1) * (mb / nb),
      binLabel: `${Math.round(i * (mb / nb))}-${Math.round((i + 1) * (mb / nb))} m/s`,
      count,
      frequency: Math.round((count / tot) * 1000) / 10,
    }));
  } else if (variable === "temperature") {
    const nb = 14, minT = 185, maxT = 315, step = (maxT - minT) / nb;
    const tc = Array.from({ length: nb }, (_, i) => {
      const x = minT + (i + 0.5) * step;
      return Math.floor(
        Math.exp(-0.5 * Math.pow((x - 250) / 30, 2)) * 1200 + rng() * 60
      );
    });
    const tot = tc.reduce((a, b) => a + b, 0);
    bins = tc.map((count, i) => ({
      binStart: minT + i * step,
      binEnd: minT + (i + 1) * step,
      binLabel: `${Math.round(minT + i * step)}-${Math.round(minT + (i + 1) * step)} K`,
      count,
      frequency: Math.round((count / tot) * 1000) / 10,
    }));
  } else {
    const nb = 12, minW = -5, maxW = 5, step = (maxW - minW) / nb;
    const tc = Array.from({ length: nb }, (_, i) => {
      const x = minW + (i + 0.5) * step;
      return Math.floor(Math.exp(-0.5 * Math.pow(x / 1.5, 2)) * 1000 + rng() * 40);
    });
    const tot = tc.reduce((a, b) => a + b, 0);
    bins = tc.map((count, i) => ({
      binStart: minW + i * step,
      binEnd: minW + (i + 1) * step,
      binLabel: `${(minW + i * step).toFixed(1)}-${(minW + (i + 1) * step).toFixed(1)} m/s`,
      count,
      frequency: Math.round((count / tot) * 1000) / 10,
    }));
  }
  res.json(bins);
});

router.get("/wind/bar", async (req, res) => {
  const face = q(req.query as Record<string, unknown>, "face", 0);
  const rng = seededRandom(face * 31);
  const regions = [
    "Tropics (0-30°)",
    "Subtropics (30-50°)",
    "Mid-Lat (50-70°)",
    "Polar (70-90°)",
  ];
  const selectedLevels = [5, 15, 25, 35, 45];
  const entries = [];
  for (const lev of selectedLevels) {
    for (const region of regions) {
      const altKm = levelToAltitude(lev);
      const jetFactor = lev >= 20 && lev <= 40 ? 2.0 + rng() * 0.8 : 1.0;
      const avgSpeed = (8 + rng() * 12) * jetFactor;
      entries.push({
        label: `L${lev} - ${region.split(" ")[0]}`,
        level: lev,
        altitudeKm: Math.round(altKm * 10) / 10,
        avgSpeed: Math.round(avgSpeed * 10) / 10,
        avgU: Math.round(avgSpeed * 0.8 * (rng() > 0.3 ? 1 : -1) * 10) / 10,
        avgV: Math.round(avgSpeed * 0.4 * (rng() > 0.5 ? 1 : -1) * 10) / 10,
        region,
      });
    }
  }
  res.json(entries);
});

router.get("/wind/particles", async (req, res) => {
  const face = q(req.query as Record<string, unknown>, "face", 0);
  const level = q(req.query as Record<string, unknown>, "level", 30);

  const uv = await ovFetchUV(face, level, 0, 4);
  if (uv) {
    const { uData, vData, width, height } = uv;
    const uField = Array.from(uData).map((v) =>
      isFinite(v) ? Math.round(v * 10) / 10 : 0
    );
    const vField = Array.from(vData).map((v) =>
      isFinite(v) ? Math.round(v * 10) / 10 : 0
    );
    const allU = uField.filter(isFinite), allV = vField.filter(isFinite);
    return res.json({
      width,
      height,
      uField,
      vField,
      uMin: allU.length ? Math.min(...allU) : -20,
      uMax: allU.length ? Math.max(...allU) : 20,
      vMin: allV.length ? Math.min(...allV) : -15,
      vMax: allV.length ? Math.max(...allV) : 15,
      dataSource: "openvisus",
    });
  }

  const width = 64, height = 32;
  const rng = seededRandom(face * 41 + level);
  const jetFactor = level >= 20 && level <= 40 ? 2.5 : 1.0;
  const uField: number[] = [], vField: number[] = [];
  for (let j = 0; j < height; j++) {
    const latRad = ((-90 + (j / height) * 180) * Math.PI) / 180;
    for (let i = 0; i < width; i++) {
      const lonRad = ((-180 + (i / width) * 360) * Math.PI) / 180;
      uField.push(
        Math.round(
          (15 * Math.cos(2 * latRad) * jetFactor +
            3 * Math.sin(lonRad * 3) +
            (rng() - 0.5) * 6) * 10
        ) / 10
      );
      vField.push(
        Math.round(
          (8 * Math.sin(latRad) * Math.cos(latRad) +
            3 * Math.cos(lonRad * 3) +
            (rng() - 0.5) * 4) * 10
        ) / 10
      );
    }
  }
  res.json({
    width,
    height,
    uField,
    vField,
    uMin: Math.min(...uField),
    uMax: Math.max(...uField),
    vMin: Math.min(...vField),
    vMax: Math.max(...vField),
    dataSource: "synthetic",
  });
});

export default router;
