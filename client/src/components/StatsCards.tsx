import type { WindStats } from "../types/api";

interface Props {
  stats: WindStats | null;
  loading: boolean;
}

function fmt(v: number | undefined, dec = 1) {
  if (v == null) return "—";
  return v.toFixed(dec);
}

function Card({
  title,
  value,
  unit,
  sub,
  color,
}: {
  title: string;
  value: string;
  unit: string;
  sub: string;
  color: string;
}) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-1"
      style={{ background: "#080f1e", border: "1px solid #1e3a5f" }}
    >
      <span className="text-xs" style={{ color: "#8ba3c4" }}>{title}</span>
      <div className="flex items-end gap-1.5 mt-1">
        <span className={`text-3xl font-bold leading-none ${color}`}>{value}</span>
        <span className="text-sm pb-0.5" style={{ color: "#8ba3c4" }}>{unit}</span>
      </div>
      <span className="text-xs mt-1" style={{ color: "#4a6380" }}>{sub}</span>
    </div>
  );
}

export function StatsCards({ stats, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl p-4 animate-pulse"
            style={{ background: "#080f1e", border: "1px solid #1e3a5f", height: 100 }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Card
        title="Vel. Máx. del Viento"
        value={fmt(stats?.maxSpeed)}
        unit="m/s"
        sub={`Prom: ${fmt(stats?.avgSpeed)} m/s`}
        color="text-cyan-300"
      />
      <Card
        title="Altitud de la Corriente en Chorro"
        value={fmt(stats?.jetAltitude)}
        unit="km"
        sub={`Dirección: ${stats?.jetDirection ?? "—"}`}
        color="text-yellow-300"
      />
      <Card
        title="Rango de Temperatura"
        value={fmt(stats?.tempRange)}
        unit="K"
        sub={`Máx: ${fmt(stats?.maxTemp)} K · Prom: ${fmt(stats?.avgTemp)} K`}
        color="text-purple-300"
      />
      <Card
        title="Velocidad Vertical (ω)"
        value={fmt(stats?.maxOmega)}
        unit="m/s"
        sub={`Min: ${fmt(stats?.minOmega)} · Puntos: ${stats?.omegaCount ?? "—"}`}
        color="text-green-300"
      />
    </div>
  );
}
