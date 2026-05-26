import { useState } from "react";
import { useGetWindProfile, useGetWindLevels } from "@workspace/api-client-react";
import ChartCard from "./ChartCard";
import MultiVariableProfile from "./charts/MultiVariableProfile";
import TemporalEvolutionChart from "./charts/TemporalEvolutionChart";
import { useChartInteraction } from "./ChartInteractionContext";

interface Props { face: number; level: number; year?: number; }

type Variable = "temperature" | "u" | "v" | "w";

const VARIABLE_CONFIG: Record<Variable, { label: string; color: string }> = {
  temperature: { label: "Temp (K)", color: "hsl(270,70%,65%)" },
  u:           { label: "U (m/s)",  color: "hsl(196,80%,55%)" },
  v:           { label: "V (m/s)",  color: "hsl(155,70%,50%)" },
  w:           { label: "ω (m/s)",  color: "hsl(38,90%,60%)"  },
};

export default function Tab3AtmosphericRelations({ face, level: _level, year = 2016 }: Props) {
  const [activeVars, setActiveVars] = useState<Variable[]>(["temperature", "u", "v", "w"]);
  const [colorVar, setColorVar] = useState<Variable>("temperature");
  const { setActiveVariable } = useChartInteraction();

  const { data: profile, isLoading: pLoading } = useGetWindProfile({ face, lat: 40, year });
  const { data: levels, isLoading: lLoading } = useGetWindLevels({ face, year });

  function toggleVar(v: Variable) {
    setActiveVars((prev) =>
      prev.includes(v) ? (prev.length > 1 ? prev.filter((x) => x !== v) : prev) : [...prev, v]
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4 px-1">
        <span className="text-xs text-[hsl(220,20%,50%)]">Variables:</span>

        {(Object.entries(VARIABLE_CONFIG) as [Variable, { label: string; color: string }][]).map(([k, cfg]) => (
          <button
            key={k}
            onClick={() => { toggleVar(k); setActiveVariable(k); }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-all border ${
              activeVars.includes(k)
                ? "border-[hsl(220,30%,28%)] bg-[hsl(222,40%,14%)] text-[hsl(210,40%,88%)]"
                : "border-[hsl(220,30%,16%)] text-[hsl(220,20%,45%)]"
            }`}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: activeVars.includes(k) ? cfg.color : "hsl(220,20%,30%)" }}
            />
            {cfg.label}
          </button>
        ))}
        <span className="ml-4 text-xs text-[hsl(220,20%,50%)]">Color por:</span>
        {(Object.keys(VARIABLE_CONFIG) as Variable[]).map((k) => (
          <button
            key={k}
            onClick={() => { setColorVar(k); setActiveVariable(k); }}
            className={`px-2 py-1 rounded text-xs transition-all ${
              colorVar === k
                ? "bg-[hsl(196,80%,45%,0.15)] text-[hsl(196,80%,65%)] ring-1 ring-[hsl(196,80%,45%)]"
                : "text-[hsl(220,20%,45%)] hover:text-[hsl(210,40%,70%)]"
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      <ChartCard
        title="Perfil Atmosférico Multivariable"
        subtitle="Perfil atmosférico multicapa · bandas, gradientes, perfil comparativo"
      >
        <MultiVariableProfile
          data={profile}
          loading={pLoading}
          activeVars={activeVars}
          colorVar={colorVar}
          varConfig={VARIABLE_CONFIG}
        />
      </ChartCard>

      <ChartCard
        title="Evolución Temporal"
        subtitle="Distribución de la velocidad del viento por niveles atmosféricos a lo largo del tiempo"
      >
        <TemporalEvolutionChart data={levels} loading={lLoading} face={face} />
      </ChartCard>
    </div>
  );
}
