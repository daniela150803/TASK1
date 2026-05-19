import { useState, useEffect, useCallback } from "react";
import { StatsCards } from "./components/StatsCards";
import { YearSelector } from "./components/YearSelector";
import { ParticleGlobe } from "./components/ParticleGlobe";
import { WindVectorField } from "./components/WindVectorField";
import { SpeedHeatmap } from "./components/SpeedHeatmap";
import { VerticalSection } from "./components/VerticalSection";
import { AtmProfile } from "./components/AtmProfile";
import { VorticityViz } from "./components/VorticityViz";
import { api } from "./lib/api";
import type {
  WindStats,
  WindVector,
  HeatmapPoint,
  LevelData,
  ProfilePoint,
  HistogramBin,
  BarEntry,
  ParticlePoint,
} from "./types/api";

type Tab = "horizontal" | "vertical" | "relations";

const YEARS = [2016, 2017, 2018, 2019, 2020];
const FACES = [0, 1, 2, 3, 4, 5];

export default function App() {
  const [tab, setTab] = useState<Tab>("horizontal");
  const [face, setFace] = useState(0);
  const [level, setLevel] = useState(30);
  const [year, setYear] = useState(2016);
  const [isSynthetic, setIsSynthetic] = useState(false);

  const [stats, setStats] = useState<WindStats | null>(null);
  const [particles, setParticles] = useState<ParticlePoint[]>([]);
  const [vectors, setVectors] = useState<WindVector[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapPoint[]>([]);
  const [levels, setLevels] = useState<LevelData[]>([]);
  const [profile, setProfile] = useState<ProfilePoint[]>([]);
  const [histogram, setHistogram] = useState<HistogramBin[]>([]);
  const [bar, setBar] = useState<BarEntry[]>([]);

  const [loadingStats, setLoadingStats] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoadingStats(true);
    try {
      const s = await api.getStats(face, level, year);
      setStats(s);
      if ((s as any)._synthetic) setIsSynthetic(true);
    } catch {
      setIsSynthetic(true);
    } finally {
      setLoadingStats(false);
    }

    if (tab === "horizontal") {
      const [p, v, h] = await Promise.all([
        api.getParticles(face, level, year),
        api.getVectors(face, level, year),
        api.getHeatmap(face, level, year),
      ]);
      setParticles(p);
      setVectors(v);
      setHeatmap(h);
    } else if (tab === "vertical") {
      const [lv, pr] = await Promise.all([
        api.getLevels(face, year),
        api.getProfile(face, level, year),
      ]);
      setLevels(lv);
      setProfile(pr);
    } else {
      const [hi, ba] = await Promise.all([
        api.getHistogram(face, level, year),
        api.getBar(face, year),
      ]);
      setHistogram(hi);
      setBar(ba);
    }
  }, [face, level, year, tab]);

  useEffect(() => {
    fetchAll();
  }, [face, level, year, tab]);

  return (
    <div className="min-h-screen text-white" style={{ background: "#030610" }}>
      <div className="max-w-screen-xl mx-auto px-4 py-4 space-y-3">

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              DYAMOND GEOS Wind Dashboard
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "#8ba3c4" }}>
              Análisis Global de Vientos Atmosféricos · Cara {face} · Nivel {level} · {year}
            </p>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {isSynthetic && (
              <span className="flex items-center gap-1.5 text-xs" style={{ color: "#4ade80" }}>
                <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                Datos Sintéticos
              </span>
            )}

            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: "#8ba3c4" }}>Cara</span>
              <select
                value={face}
                onChange={(e) => setFace(Number(e.target.value))}
                className="text-xs rounded px-2 py-1 border"
                style={{ background: "#0d1829", borderColor: "#1e3a5f", color: "#e2e8f0" }}
              >
                {FACES.map((f) => (
                  <option key={f} value={f}>Cara {f}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: "#8ba3c4" }}>Nivel</span>
              <input
                type="range"
                min={1}
                max={72}
                value={level}
                onChange={(e) => setLevel(Number(e.target.value))}
                className="w-32 accent-cyan-400"
              />
              <span className="text-xs font-mono w-5 text-right text-white">{level}</span>
            </div>
          </div>
        </div>

        <YearSelector years={YEARS} selected={year} onChange={setYear} />

        <StatsCards stats={stats} loading={loadingStats} />

        <div className="border-b" style={{ borderColor: "#1e3a5f" }}>
          <div className="flex gap-0">
            {(
              [
                { id: "horizontal" as Tab, num: "01", label: "Dinámica del Viento Horizontal (U/V)" },
                { id: "vertical" as Tab, num: "02", label: "Dinámica Atmosférica Vertical (ω)" },
                { id: "relations" as Tab, num: "03", label: "Relaciones Atmosféricas" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors relative"
                style={{
                  color: tab === t.id ? "#22d3ee" : "#8ba3c4",
                  borderBottom: tab === t.id ? "2px solid #22d3ee" : "2px solid transparent",
                }}
              >
                <span className="text-xs font-mono" style={{ color: tab === t.id ? "#22d3ee" : "#4a6380" }}>
                  {t.num}
                </span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 pb-8">
          {tab === "horizontal" && (
            <>
              <ParticleGlobe particles={particles} />
              <WindVectorField vectors={vectors} />
              <SpeedHeatmap heatmap={heatmap} />
            </>
          )}

          {tab === "vertical" && (
            <>
              <VerticalSection levels={levels} />
              <AtmProfile profile={profile} />
            </>
          )}

          {tab === "relations" && (
            <VorticityViz histogram={histogram} bar={bar} />
          )}
        </div>
      </div>
    </div>
  );
}
