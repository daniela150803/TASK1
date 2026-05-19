import { useState, useEffect, useCallback } from "react";
import { Controls } from "./components/Controls";
import { StatsCards } from "./components/StatsCards";
import { WindMap } from "./components/WindMap";
import { LevelsChart } from "./components/LevelsChart";
import { ProfileChart } from "./components/ProfileChart";
import { HistogramChart } from "./components/HistogramChart";
import { BarChartViz } from "./components/BarChartViz";
import { ParticleField } from "./components/ParticleField";
import { api } from "./lib/api";
import type {
  DashboardControls,
  WindStats,
  WindPoint,
  LevelData,
  ProfilePoint,
  HistogramBin,
  BarEntry,
  ParticleField as ParticleFieldData,
} from "./types/api";

type Tab = "horizontal" | "vertical" | "relations";

const TABS: { id: Tab; label: string }[] = [
  { id: "horizontal", label: "Horizontal Wind (U/V)" },
  { id: "vertical", label: "Vertical Dynamics (ω)" },
  { id: "relations", label: "Atmospheric Relations" },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("horizontal");
  const [controls, setControls] = useState<DashboardControls>({
    face: 0,
    level: 30,
    year: 2016,
  });
  const [profileLat, setProfileLat] = useState(40);
  const [histVariable, setHistVariable] = useState("speed");

  const [stats, setStats] = useState<WindStats | null>(null);
  const [heatmap, setHeatmap] = useState<WindPoint[]>([]);
  const [vectors, setVectors] = useState<WindPoint[]>([]);
  const [levels, setLevels] = useState<LevelData[]>([]);
  const [profile, setProfile] = useState<ProfilePoint[]>([]);
  const [histogram, setHistogram] = useState<HistogramBin[]>([]);
  const [bar, setBar] = useState<BarEntry[]>([]);
  const [particles, setParticles] = useState<ParticleFieldData | null>(null);

  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingMap, setLoadingMap] = useState(false);
  const [loadingLevels, setLoadingLevels] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingHist, setLoadingHist] = useState(false);
  const [loadingBar, setLoadingBar] = useState(false);
  const [loadingParticles, setLoadingParticles] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      setStats(await api.getStats(controls.face, controls.level, controls.year));
    } finally {
      setLoadingStats(false);
    }
  }, [controls]);

  const fetchMap = useCallback(async () => {
    setLoadingMap(true);
    try {
      const [h, v] = await Promise.all([
        api.getHeatmap(controls.face, controls.level, controls.year),
        api.getVectors(controls.face, controls.level, controls.year),
      ]);
      setHeatmap(h);
      setVectors(v);
    } finally {
      setLoadingMap(false);
    }
  }, [controls]);

  const fetchLevels = useCallback(async () => {
    setLoadingLevels(true);
    try {
      setLevels(await api.getLevels(controls.face, controls.year));
    } finally {
      setLoadingLevels(false);
    }
  }, [controls]);

  const fetchProfile = useCallback(async () => {
    setLoadingProfile(true);
    try {
      setProfile(
        await api.getProfile(controls.face, profileLat, controls.year)
      );
    } finally {
      setLoadingProfile(false);
    }
  }, [controls, profileLat]);

  const fetchHistogram = useCallback(async () => {
    setLoadingHist(true);
    try {
      setHistogram(
        await api.getHistogram(controls.face, controls.level, histVariable)
      );
    } finally {
      setLoadingHist(false);
    }
  }, [controls, histVariable]);

  const fetchBar = useCallback(async () => {
    setLoadingBar(true);
    try {
      setBar(await api.getBar(controls.face));
    } finally {
      setLoadingBar(false);
    }
  }, [controls]);

  const fetchParticles = useCallback(async () => {
    setLoadingParticles(true);
    try {
      setParticles(await api.getParticles(controls.face, controls.level));
    } finally {
      setLoadingParticles(false);
    }
  }, [controls]);

  useEffect(() => {
    fetchStats();
    if (tab === "horizontal") {
      fetchMap();
      fetchParticles();
    } else if (tab === "vertical") {
      fetchLevels();
      fetchProfile();
    } else {
      fetchHistogram();
      fetchBar();
    }
  }, [tab, controls]);

  useEffect(() => {
    if (tab === "vertical") fetchProfile();
  }, [profileLat]);

  useEffect(() => {
    if (tab === "relations") fetchHistogram();
  }, [histVariable]);

  return (
    <div className="min-h-screen" style={{ background: "hsl(222,47%,7%)" }}>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            DYAMOND GEOS Wind Dashboard
          </h1>
          <p className="text-sm text-muted mt-1">
            Global atmospheric wind dynamics — NASA GEOS / DYAMOND simulation
          </p>
        </div>

        <Controls controls={controls} onChange={setControls} />

        <StatsCards stats={stats} loading={loadingStats} />

        <div className="flex gap-1 border-b border-border">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                tab === t.id
                  ? "bg-surface border border-b-surface border-border text-white"
                  : "text-muted hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {tab === "horizontal" && (
            <>
              <WindMap
                heatmapData={heatmap}
                vectorData={vectors}
                loading={loadingMap}
              />
              <ParticleField data={particles} loading={loadingParticles} />
            </>
          )}

          {tab === "vertical" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <LevelsChart data={levels} loading={loadingLevels} />
              <ProfileChart
                data={profile}
                loading={loadingProfile}
                lat={profileLat}
                onLatChange={setProfileLat}
              />
            </div>
          )}

          {tab === "relations" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <HistogramChart
                data={histogram}
                loading={loadingHist}
                variable={histVariable}
                onVariableChange={setHistVariable}
              />
              <BarChartViz data={bar} loading={loadingBar} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
