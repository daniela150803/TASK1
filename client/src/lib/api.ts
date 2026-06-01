import type {
  WindStats,
  WindVector,
  HeatmapPoint,
  ParticlePoint,
  LevelData,
  ProfilePoint,
  HistogramBin,
  BarEntry,
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
    get<WindVector[]>("/wind/vectors", { face, level, year }),

  getHeatmap: (face: number, level: number, year: number) =>
    get<HeatmapPoint[]>("/wind/heatmap", { face, level, year }),

  getParticles: (face: number, level: number, year: number) =>
    get<ParticlePoint[]>("/wind/particles", { face, level, year }),

  getLevels: (face: number, year: number) =>
    get<LevelData[]>("/wind/levels", { face, year }),

  getProfile: (face: number, level: number, year: number) =>
    get<ProfilePoint[]>("/wind/profile", { face, level, year }),

  getHistogram: (face: number, level: number, year: number) =>
    get<HistogramBin[]>("/wind/histogram", { face, level, year }),

  getBar: (face: number, year: number) =>
    get<BarEntry[]>("/wind/bar", { face, year }),
};
