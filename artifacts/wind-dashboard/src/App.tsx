import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useGetWindStats } from "@workspace/api-client-react";
import Tab1HorizontalWind from "./components/Tab1HorizontalWind";
import Tab2VerticalDynamics from "./components/Tab2VerticalDynamics";
import Tab3AtmosphericRelations from "./components/Tab3AtmosphericRelations";
import KpiCards from "./components/KpiCards";
import { ChartInteractionProvider, formatVariableLabel, useChartInteraction } from "./components/ChartInteractionContext";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

const TABS = [
  { id: 0, label: "Dinámica del Viento Horizontal (U/V)" },
  { id: 1, label: "Dinámica Atmosférica Vertical (ω)" },
  { id: 2, label: "Relaciones Atmosféricas" },
];

const YEAR_MIN = 2016;
const YEAR_MAX = 2020;

function YearSlider({ year, onChange }: { year: number; onChange: (y: number) => void }) {
  const pct = ((year - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * 100;

  return (
    <div className="border-b border-[hsl(220,30%,16%)] bg-[hsl(222,45%,8%)] px-6 py-3 flex items-center gap-5">
      <div className="flex items-center gap-2 shrink-0">
        <svg className="w-3.5 h-3.5 text-[hsl(196,80%,55%)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span className="text-xs font-medium text-[hsl(220,20%,65%)]">Año</span>
      </div>

      <div className="flex gap-1">
        {Array.from({ length: YEAR_MAX - YEAR_MIN + 1 }, (_, i) => YEAR_MIN + i).map((y) => (
          <button
            key={y}
            onClick={() => onChange(y)}
            className={`px-3 py-1 rounded text-xs font-mono transition-all ${
              year === y
                ? "bg-[hsl(196,80%,45%)] text-[hsl(222,47%,7%)] font-bold shadow-[0_0_12px_-2px_hsl(196,80%,45%,0.6)]"
                : "text-[hsl(220,20%,50%)] hover:text-[hsl(210,40%,80%)] hover:bg-[hsl(220,25%,16%)]"
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      <div className="flex-1 flex items-center gap-3">
        <span className="text-[10px] text-[hsl(220,20%,40%)] font-mono shrink-0">{YEAR_MIN}</span>
        <div className="relative flex-1 h-2 flex items-center">
          <div className="absolute inset-0 rounded-full bg-[hsl(220,25%,14%)] border border-[hsl(220,30%,18%)]" />
          <div
            className="absolute left-0 top-0 bottom-0 rounded-full bg-gradient-to-r from-[hsl(196,80%,35%)] to-[hsl(196,80%,55%)]"
            style={{ width: `${pct}%` }}
          />
          {Array.from({ length: YEAR_MAX - YEAR_MIN + 1 }, (_, i) => (
            <div
              key={i}
              className="absolute w-px h-3 rounded-full"
              style={{
                left: `${(i / (YEAR_MAX - YEAR_MIN)) * 100}%`,
                background: "hsl(220,20%,30%)",
                transform: "translateX(-50%)",
              }}
            />
          ))}
          <input
            type="range"
            min={YEAR_MIN}
            max={YEAR_MAX}
            step={1}
            value={year}
            onChange={(e) => onChange(Number(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
            style={{ height: "100%" }}
          />
        </div>
        <span className="text-[10px] text-[hsl(220,20%,40%)] font-mono shrink-0">{YEAR_MAX}</span>
      </div>

      <div className="shrink-0 flex items-center gap-1.5 bg-[hsl(196,80%,45%,0.12)] border border-[hsl(196,80%,45%,0.3)] rounded-lg px-3 py-1.5">
        <span className="text-[hsl(196,80%,65%)] font-bold font-mono text-sm">{year}</span>
        <span className="text-[10px] text-[hsl(196,60%,45%)]">seleccionado</span>
      </div>
    </div>
  );
}


function InteractionStatus() {
  const { activeVariable, setActiveVariable, geoFocus, levelFocus, timeFocus, clearFocus } = useChartInteraction();

  return (
    <div className="mx-6 mt-3 rounded-lg border border-[hsl(220,30%,16%)] bg-[hsl(222,40%,9%)] px-4 py-2 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3 text-xs text-[hsl(220,20%,56%)]">
        <span className="text-[hsl(210,40%,82%)] font-medium">Interacción cruzada activa</span>
        <span>Variable: <strong className="text-[hsl(196,80%,66%)]">{formatVariableLabel(activeVariable)}</strong></span>
        {geoFocus && (
          <span>Geo: <strong className="text-[hsl(155,70%,60%)]">{geoFocus.lat.toFixed(1)}°, {geoFocus.lon.toFixed(1)}°</strong></span>
        )}
        {levelFocus && (
          <span>Altitud: <strong className="text-[hsl(38,90%,64%)]">L{levelFocus.level} · {levelFocus.altitudeKm.toFixed(1)} km</strong></span>
        )}
        {timeFocus && (
          <span>Tiempo: <strong className="text-[hsl(270,70%,70%)]">{timeFocus.label}</strong></span>
        )}
        {!geoFocus && !levelFocus && !timeFocus && (
          <span className="text-[hsl(220,20%,42%)]">Haz hover sobre cualquier gráfica para resaltar datos relacionados en las demás.</span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {(["speed", "temperature", "u", "v", "w", "vorticity"] as const).map((variable) => (
          <button
            key={variable}
            type="button"
            onClick={() => setActiveVariable(variable)}
            className={`rounded-md px-2 py-1 text-[10px] transition-all ${
              activeVariable === variable
                ? "bg-[hsl(196,80%,45%)] text-[hsl(222,47%,7%)]"
                : "border border-[hsl(220,30%,20%)] text-[hsl(220,20%,58%)] hover:text-[hsl(196,80%,70%)]"
            }`}
          >
            {variable}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={clearFocus}
        className="rounded-md border border-[hsl(220,30%,20%)] px-2.5 py-1 text-[10px] text-[hsl(220,20%,60%)] hover:border-[hsl(196,80%,45%,0.6)] hover:text-[hsl(196,80%,70%)] transition-all"
      >
        Limpiar foco
      </button>
    </div>
  );
}

function Dashboard() {
  const [activeTab, setActiveTab] = useState(0);
  const [face, setFace] = useState(0);
  const [level, setLevel] = useState(30);
  const [year, setYear] = useState(2016);
  const { data: stats, isLoading: statsLoading } = useGetWindStats({ face, level, year });

  return (
    <div className="min-h-screen bg-[hsl(222,47%,7%)] text-[hsl(210,40%,92%)] flex flex-col">
      <header className="border-b border-[hsl(220,30%,16%)] px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            DYAMOND GEOS Wind Dashboard
          </h1>
          <p className="text-xs text-[hsl(220,20%,55%)] mt-0.5">
            Análisis Global de Vientos Atmosféricos · Cara {face} · Nivel {level} · {year}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-[hsl(220,20%,55%)]">
            <span className="w-2 h-2 rounded-full bg-[hsl(155,70%,40%)] animate-pulse inline-block" />
            {statsLoading ? "Cargando..." : stats?.dataSource === "openvisus" ? "OpenVisus En Vivo" : "Datos Sintéticos"}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-[hsl(220,20%,55%)]">Cara</label>
            <select
              value={face}
              onChange={(e) => setFace(Number(e.target.value))}
              className="bg-[hsl(222,40%,10%)] border border-[hsl(220,30%,16%)] rounded px-2 py-1 text-xs text-[hsl(210,40%,92%)]"
            >
              {[0, 1, 2, 3, 4, 5].map((f) => (
                <option key={f} value={f}>Cara {f}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-[hsl(220,20%,55%)]">Nivel</label>
            <input
              type="range" min={0} max={51} value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
              className="w-24 accent-[hsl(196,80%,45%)]"
            />
            <span className="text-xs w-6 text-center">{level}</span>
          </div>
        </div>
      </header>

      <YearSlider year={year} onChange={setYear} />

      <KpiCards stats={stats} loading={statsLoading} />

      <InteractionStatus />

      <div className="flex border-b border-[hsl(220,30%,16%)] px-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === t.id
                ? "border-[hsl(196,80%,45%)] text-[hsl(196,80%,65%)] tab-active-glow"
                : "border-transparent text-[hsl(220,20%,55%)] hover:text-[hsl(210,40%,80%)]"
            }`}
          >
            <span className="text-[hsl(220,20%,40%)] mr-2 font-mono text-xs">0{t.id + 1}</span>
            {t.label}
          </button>
        ))}
      </div>

      <main className="flex-1 p-5 overflow-auto">
        {activeTab === 0 && <Tab1HorizontalWind face={face} level={level} year={year} />}
        {activeTab === 1 && <Tab2VerticalDynamics face={face} level={level} year={year} />}
        {activeTab === 2 && <Tab3AtmosphericRelations face={face} level={level} year={year} />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ChartInteractionProvider>
        <Dashboard />
      </ChartInteractionProvider>
    </QueryClientProvider>
  );
}
