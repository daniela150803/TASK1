import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { ProfilePoint } from "../types/api";

interface Props {
  data: ProfilePoint[];
  loading: boolean;
  lat: number;
  onLatChange: (lat: number) => void;
}

export function ProfileChart({ data, loading, lat, onLatChange }: Props) {
  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-border p-4 h-72 animate-pulse" />
    );
  }

  const chartData = data.map((d) => ({
    alt: d.altitudeKm,
    speed: d.speed,
    temp: d.temperature,
    pressure: d.pressure,
    w: d.w,
  }));

  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">
          Vertical Profile at Latitude {lat}°
        </h3>
        <div className="flex items-center gap-2 text-sm">
          <label className="text-muted">Lat:</label>
          <input
            type="range"
            min={-80}
            max={80}
            value={lat}
            onChange={(e) => onLatChange(Number(e.target.value))}
            className="w-24 accent-accent"
          />
          <span className="text-accent font-bold w-10 text-right">{lat}°</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.08)"
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
          />
          <YAxis
            dataKey="alt"
            type="number"
            domain={[0, 80]}
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            tickFormatter={(v) => `${v}km`}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(222,47%,14%)",
              border: "1px solid hsl(222,30%,22%)",
              borderRadius: 8,
              color: "#e2e8f0",
              fontSize: 12,
            }}
            labelFormatter={(v) => `Alt: ${v} km`}
          />
          <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
          <Line
            dataKey="speed"
            stroke="#0ea5e9"
            dot={false}
            strokeWidth={2}
            name="Speed (m/s)"
          />
          <Line
            dataKey="w"
            stroke="#a78bfa"
            dot={false}
            strokeWidth={1.5}
            name="Vert. Vel. (m/s)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
