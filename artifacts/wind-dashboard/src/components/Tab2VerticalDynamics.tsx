import {
  useGetWindLevels,
  useGetWindProfile,
} from "@workspace/api-client-react";
import ChartCard from "./ChartCard";
import VerticalCrossSection from "./charts/VerticalCrossSection";
import TemperatureProfileChart from "./charts/TemperatureProfileChart";
import VerticalVelocityHeatmap from "./charts/VerticalVelocityHeatmap";

interface Props { face: number; level: number; year?: number; }

export default function Tab2VerticalDynamics({ face, level: _level, year = 2016 }: Props) {
  const { data: levels, isLoading: lLoading } = useGetWindLevels({ face, year });
  const { data: profile, isLoading: pLoading } = useGetWindProfile({ face, lat: 40, year });

  return (
    <div className="flex flex-col gap-4">
      {/* Fila superior: Sección transversal + Perfil de temperatura */}
      <div className="grid grid-cols-2 gap-4">
        <ChartCard
          title="Sección Transversal del Flujo Vertical"
          subtitle="Contorno D3 — campo de velocidad vertical ω · color = temperatura"
        >
          <VerticalCrossSection data={levels} loading={lLoading} />
        </ChartCard>

        <ChartCard
          title="Perfil de Temperatura Atmosférica"
          subtitle="Velocidad y Temperatura vs Altitud · capas atmosféricas"
        >
          <TemperatureProfileChart data={profile} loading={pLoading} />
        </ChartCard>
      </div>

      {/* Fila inferior: Heatmap ancho completo */}
      <ChartCard
        title="Mapa de Calor de Velocidad Vertical"
        subtitle="ω (m/s) por nivel atmosférico y altitud · escala de color divergente · hover para detalle"
      >
        <VerticalVelocityHeatmap data={levels} loading={lLoading} />
      </ChartCard>
    </div>
  );
}
