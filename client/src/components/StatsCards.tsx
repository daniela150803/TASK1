import type { WindStats } from "../types/api";

interface Props {
  stats: WindStats | null;
  loading: boolean;
}

function Card({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit?: string;
  color?: string;
}) {
  return (
    <div className="bg-surface rounded-xl border border-border p-4 flex flex-col gap-1">
      <span className="text-xs text-muted uppercase tracking-wider font-medium">
        {label}
      </span>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-2xl font-bold ${color ?? "text-white"}`}>
          {value}
        </span>
        {unit && <span className="text-xs text-muted">{unit}</span>}
      </div>
    </div>
  );
}

export function StatsCards({ stats, loading }: Props) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-surface rounded-xl border border-border p-4 h-20 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card
        label="Max Wind Speed"
        value={stats.maxSpeed.toFixed(1)}
        unit="m/s"
        color="text-accent"
      />
      <Card
        label="Avg Wind Speed"
        value={stats.avgSpeed.toFixed(1)}
        unit="m/s"
        color="text-accent-2"
      />
      <Card
        label="Avg Temperature"
        value={stats.avgTemp.toFixed(1)}
        unit="K"
      />
      <Card
        label="Jet Stream Alt"
        value={stats.jetStreamAlt.toFixed(1)}
        unit="km"
        color="text-yellow-400"
      />
      <Card
        label="Max Vert. Velocity"
        value={stats.maxW.toFixed(1)}
        unit="m/s"
      />
      <Card
        label="Dominant Direction"
        value={stats.dominantDirection}
        color="text-purple-400"
      />
      <Card
        label="Total Grid Points"
        value={stats.totalPoints.toLocaleString()}
      />
      <Card
        label="Data Source"
        value={stats.dataSource}
        color={stats.dataSource === "openvisus" ? "text-accent-2" : "text-muted"}
      />
    </div>
  );
}
