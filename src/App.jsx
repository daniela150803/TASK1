import ChartPanel from './components/ChartPanel'
import WindVectorFieldChart from './components/WindVectorFieldChart'
import SpeedHeatmapChart from './components/SpeedHeatmapChart'
import VorticityChart from './components/VorticityChart'
import VerticalFlowSectionChart from './components/VerticalFlowSectionChart'
import AtmosphericProfileChart from './components/AtmosphericProfileChart'
import VerticalSpeedHeatmapChart from './components/VerticalSpeedHeatmapChart'
import VariableProfileChart from './components/VariableProfileChart'

export default function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">DYAMOND GEOS</p>
          <h1>Wind Dashboard</h1>
          <p className="subtitle">
            Estructura de frontend organizada para añadir y modificar gráficos con mayor facilidad.
          </p>
        </div>
      </header>

      <main className="dashboard-layout">
        <div className="dashboard-column">
          <ChartPanel title="Campo Vectorial del Viento" subtitle="Flechas D3 sobre mapa mundial">
            <WindVectorFieldChart />
          </ChartPanel>
          <ChartPanel title="Mapa de Calor de Velocidad" subtitle="Velocidad codificada por color en lat/lon">
            <SpeedHeatmapChart />
          </ChartPanel>
          <ChartPanel title="Visualización de Vorticidad" subtitle="Curl(U,V) en contorno o escala de color">
            <VorticityChart />
          </ChartPanel>
        </div>

        <div className="dashboard-column">
          <ChartPanel title="Sección Transversal de Flujo Vertical" subtitle="Campo de velocidad vertical ω">
            <VerticalFlowSectionChart />
          </ChartPanel>
          <ChartPanel title="Perfil de Temperatura Atmosférica" subtitle="Temperatura y velocidad vs altitud">
            <AtmosphericProfileChart />
          </ChartPanel>
          <ChartPanel title="Mapa de Calor Vertical" subtitle="ω (m/s) por nivel de altitud">
            <VerticalSpeedHeatmapChart />
          </ChartPanel>
          <ChartPanel title="Perfil de Variables" subtitle="Gráfico de líneas múltiple para varias variables">
            <VariableProfileChart />
          </ChartPanel>
        </div>
      </main>
    </div>
  )
}
