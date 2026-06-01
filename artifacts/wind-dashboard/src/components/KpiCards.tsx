import type { WindStats } from "@workspace/api-client-react";

interface Props {
  stats: WindStats | undefined;
  loading: boolean;
}

function KpiCard({
  label,
  value,
  unit,
  sub,
  glowClass,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  sub: string;
  glowClass: string;
  color: string;
}) {
  return (
    <div className={`bg-[hsl(222,40%,10%)] border border-[hsl(220,30%,16%)] rounded-lg p-4 ${glowClass}`}>
      <p className="text-xs text-[hsl(220,20%,55%)] mb-1">{label}</p>
      <div className="flex items-end gap-1">
        <span className={`text-2xl font-bold ${color}`}>{value}</span>
        <span className="text-xs text-[hsl(220,20%,45%)] mb-1">{unit}</span>
      </div>
      <p className="text-xs text-[hsl(220,20%,45%)] mt-1">{sub}</p>
    </div>
  );
}

export default function KpiCards({ stats, loading }: Props) {
  const v = (n: number | undefined, d = "—") =>
    loading ? "..." : n !== undefined ? String(n) : d;

  return (
    <div className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-[hsl(220,30%,16%)]">
      <KpiCard
        label="Vel. Máx. del Viento"
        value={v(stats?.maxSpeed)}
        unit="m/s"
        sub={`Prom: ${v(stats?.avgSpeed)} m/s`}
        glowClass="kpi-glow-cyan"
        color="text-[hsl(196,80%,60%)]"
      />
      <KpiCard
        label="Altitud de la Corriente en Chorro"
        value={v(stats?.jetStreamAlt)}
        unit="km"
        sub={`Dirección: ${loading ? "..." : stats?.dominantDirection ?? "—"}`}
        glowClass="kpi-glow-amber"
        color="text-[hsl(38,90%,65%)]"
      />
      <KpiCard
        label="Rango de Temperatura"
        value={v(stats?.minTemp)}
        unit="K"
        sub={`Máx: ${v(stats?.maxTemp)} K · Prom: ${v(stats?.avgTemp)} K`}
        glowClass="kpi-glow-violet"
        color="text-[hsl(270,70%,70%)]"
      />
      <KpiCard
        label="Velocidad Vertical (ω)"
        value={v(stats?.maxW)}
        unit="m/s"
        sub={`Mín: ${v(stats?.minW)} · Puntos: ${v(stats?.totalPoints)}`}
        glowClass="kpi-glow-green"
        color="text-[hsl(155,70%,55%)]"
      />
    </div>
  );
}
