import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type AtmosVariable = "speed" | "temperature" | "u" | "v" | "w" | "vorticity";

export type GeoFocus = {
  lat: number;
  lon: number;
  speed?: number;
  u?: number;
  v?: number;
  value?: number;
  variable?: AtmosVariable;
  source: string;
} | null;

export type LevelFocus = {
  level: number;
  altitudeKm: number;
  speed?: number;
  temperature?: number;
  u?: number;
  v?: number;
  w?: number;
  source: string;
} | null;

export type TimeFocus = {
  month: number;
  label: string;
  value?: number;
  level?: number;
  source: string;
} | null;

interface ChartInteractionState {
  activeVariable: AtmosVariable;
  setActiveVariable: (variable: AtmosVariable) => void;
  geoFocus: GeoFocus;
  setGeoFocus: (focus: GeoFocus) => void;
  levelFocus: LevelFocus;
  setLevelFocus: (focus: LevelFocus) => void;
  timeFocus: TimeFocus;
  setTimeFocus: (focus: TimeFocus) => void;
  clearFocus: () => void;
}

const ChartInteractionContext = createContext<ChartInteractionState | null>(null);

export function ChartInteractionProvider({ children }: { children: ReactNode }) {
  const [activeVariable, setActiveVariable] = useState<AtmosVariable>("speed");
  const [geoFocus, setGeoFocus] = useState<GeoFocus>(null);
  const [levelFocus, setLevelFocus] = useState<LevelFocus>(null);
  const [timeFocus, setTimeFocus] = useState<TimeFocus>(null);

  const value = useMemo<ChartInteractionState>(() => ({
    activeVariable,
    setActiveVariable,
    geoFocus,
    setGeoFocus,
    levelFocus,
    setLevelFocus,
    timeFocus,
    setTimeFocus,
    clearFocus: () => {
      setGeoFocus(null);
      setLevelFocus(null);
      setTimeFocus(null);
    },
  }), [activeVariable, geoFocus, levelFocus, timeFocus]);

  return (
    <ChartInteractionContext.Provider value={value}>
      {children}
    </ChartInteractionContext.Provider>
  );
}

export function useChartInteraction() {
  const context = useContext(ChartInteractionContext);
  if (!context) {
    throw new Error("useChartInteraction must be used inside ChartInteractionProvider");
  }
  return context;
}

export function formatVariableLabel(variable: AtmosVariable) {
  const labels: Record<AtmosVariable, string> = {
    speed: "Velocidad",
    temperature: "Temperatura",
    u: "U horizontal",
    v: "V horizontal",
    w: "ω vertical",
    vorticity: "Vorticidad",
  };
  return labels[variable];
}
