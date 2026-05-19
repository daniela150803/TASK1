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
import type { LevelData } from "../types/api";

interface Props {
  data: LevelData[];
  loading: boolean;
}

export function LevelsChart({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-border p-4 h-72 animate-pulse" />
    );
  }

  const chartData = data.map((d) => ({
    alt: d.altitudeKm,
    speed: d.avgSpeed,
    maxSpeed: d.maxSpeed,
    temp: d.avgTemp,
    w: d.avgW,
  }));

  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <h3 className="text-sm font-semibold text-white mb-3">
        Vertical Profile — Avg Speed by Altitude
      </h3>
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
            domain={[0, "auto"]}
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            label={{
              value: "Speed (m/s)",
              position: "insideBottom",
              fill: "#94a3b8",
              fontSize: 11,
            }}
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
            formatter={(val: number, name: string) => [
              `${val.toFixed(1)} m/s`,
              name,
            ]}
            labelFormatter={(v) => `Alt: ${v} km`}
          />
          <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
          <Line
            dataKey="speed"
            stroke="#0ea5e9"
            dot={false}
            strokeWidth={2}
            name="Avg Speed"
          />
          <Line
            dataKey="maxSpeed"
            stroke="#f59e0b"
            dot={false}
            strokeWidth={1.5}
            strokeDasharray="4 2"
            name="Max Speed"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
