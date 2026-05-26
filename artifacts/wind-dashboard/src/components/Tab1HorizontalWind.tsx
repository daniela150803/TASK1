import { useGetWindParticles, useGetWindVectors, useGetWindHeatmap } from "@workspace/api-client-react";
import ChartCard from "./ChartCard";
import ParticleFlowCanvas from "./charts/ParticleFlowCanvas";
import WindVectorChart from "./charts/WindVectorChart";
import WindHeatmapChart from "./charts/WindHeatmapChart";
import VorticityChart from "./charts/VorticityChart";

interface Props { face: number; level: number; year?: number; }

export default function Tab1HorizontalWind({ face, level, year = 2016 }: Props) {
  const { data: particles, isLoading: pLoading } = useGetWindParticles({ face, level, year });
  const { data: vectors,   isLoading: vLoading } = useGetWindVectors({ face, level, resolution: 20, year });
  const { data: heatmap,   isLoading: hLoading } = useGetWindHeatmap({ face, level, year });

  return (
    <div className="flex flex-col gap-4">
      <ChartCard
        title="Visualización Integrada del Viento Horizontal"
        subtitle="Globo ortográfico interactivo · partículas + campo vectorial + mapa de calor como capas conectadas"
      >
        <ParticleFlowCanvas data={particles} vectorData={vectors} heatmapData={heatmap} loading={pLoading || vLoading || hLoading} />
      </ChartCard>

      <div className="grid grid-cols-2 gap-4">
        <ChartCard title="Campo Vectorial del Viento" subtitle="Flechas compactas sobre mapa mundial — hover para velocidad, U/V y ubicación">
          <WindVectorChart data={vectors} loading={vLoading} />
        </ChartCard>

        <ChartCard title="Mapa de Calor de Velocidad" subtitle="Capa de intensidad por velocidad — hover por celda y lectura lat/lon">
          <WindHeatmapChart data={heatmap} loading={hLoading} />
        </ChartCard>
      </div>

      <ChartCard
        title="Visualización de Vorticidad"
        subtitle="Gráfico de contorno D3 — curl(U,V) campo de vorticidad relativa"
      >
        <VorticityChart data={heatmap} loading={hLoading} />
      </ChartCard>
    </div>
  );
}
