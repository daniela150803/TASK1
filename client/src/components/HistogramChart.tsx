import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { HistogramBin } from "../types/api";

interface Props {
  data: HistogramBin[];
  loading: boolean;
  variable: string;
  onVariableChange: (v: string) => void;
}

export function HistogramChart({
  data,
  loading,
  variable,
  onVariableChange,
}: Props) {
  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-border p-4 h-72 animate-pulse" />
    );
  }

  const colorMap: Record<string, string> = {
    speed: "#0ea5e9",
    temperature: "#f59e0b",
    w: "#a78bfa",
  };

  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">
          Distribution Histogram
        </h3>
        <div className="flex gap-2">
          {["speed", "temperature", "w"].map((v) => (
            <button
              key={v}
              onClick={() => onVariableChange(v)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                variable === v
                  ? "bg-accent text-white"
                  : "bg-surface-2 text-muted hover:text-white"
              }`}
            >
              {v === "w" ? "Vert. Vel." : v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={data}
          margin={{ top: 5, right: 10, left: 0, bottom: 30 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.08)"
            vertical={false}
          />
          <XAxis
            dataKey="binLabel"
            tick={{ fill: "#94a3b8", fontSize: 10 }}
            angle={-45}
            textAnchor="end"
            interval={1}
          />
          <YAxis
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            label={{
              value: "Frequency (%)",
              angle: -90,
              position: "insideLeft",
              fill: "#94a3b8",
              fontSize: 11,
            }}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(222,47%,14%)",
              border: "1px solid hsl(222,30%,22%)",
              borderRadius: 8,
              color: "#e2e8f0",
              fontSize: 12,
            }}
            formatter={(val: number) => [`${val.toFixed(1)}%`, "Frequency"]}
          />
          <Bar
            dataKey="frequency"
            fill={colorMap[variable] ?? "#0ea5e9"}
            radius={[3, 3, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
