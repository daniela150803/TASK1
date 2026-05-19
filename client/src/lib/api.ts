import type {
  WindStats,
  WindPoint,
  LevelData,
  ProfilePoint,
  HistogramBin,
  BarEntry,
  ParticleField,
} from "../types/api";

const BASE = "/api";

async function get<T>(path: string, params: Record<string, number | string> = {}): Promise<T> {
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)])
  ).toString();
  const url = qs ? `${BASE}${path}?${qs}` : `${BASE}${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  getStats: (face: number, level: number, year: number) =>
    get<WindStats>("/wind/stats", { face, level, year }),

  getVectors: (face: number, level: number, year: number) =>
    get<WindPoint[]>("/wind/vectors", { face, level, year }),

  getHeatmap: (face: number, level: number, year: number) =>
    get<WindPoint[]>("/wind/heatmap", { face, level, year }),

  getLevels: (face: number, year: number) =>
    get<LevelData[]>("/wind/levels", { face, year }),

  getProfile: (face: number, lat: number, year: number) =>
    get<ProfilePoint[]>("/wind/profile", { face, lat, year }),

  getHistogram: (face: number, level: number, variable: string) =>
    get<HistogramBin[]>("/wind/histogram", { face, level, variable }),

  getBar: (face: number) =>
    get<BarEntry[]>("/wind/bar", { face }),

  getParticles: (face: number, level: number) =>
    get<ParticleField>("/wind/particles", { face, level }),
};
