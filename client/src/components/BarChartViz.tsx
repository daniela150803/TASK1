import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { BarEntry } from "../types/api";

interface Props {
  data: BarEntry[];
  loading: boolean;
}

const REGION_COLORS: Record<string, string> = {
  "Tropics (0-30°)": "#0ea5e9",
  "Subtropics (30-50°)": "#22c55e",
  "Mid-Lat (50-70°)": "#f59e0b",
  "Polar (70-90°)": "#a78bfa",
};

export function BarChartViz({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-border p-4 h-72 animate-pulse" />
    );
  }

  const grouped: Record<string, Record<string, number>> = {};
  const regions = new Set<string>();
  for (const entry of data) {
    regions.add(entry.region);
    const altKey = `${entry.altitudeKm}km`;
    if (!grouped[altKey]) grouped[altKey] = { alt: entry.altitudeKm };
    grouped[altKey][entry.region] = entry.avgSpeed;
  }

  const chartData = Object.values(grouped).sort(
    (a, b) => (a.alt as number) - (b.alt as number)
  );

  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <h3 className="text-sm font-semibold text-white mb-3">
        Avg Wind Speed by Region &amp; Altitude
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.08)"
            vertical={false}
          />
          <XAxis
            dataKey="alt"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            tickFormatter={(v) => `${v}km`}
            label={{
              value: "Altitude",
              position: "insideBottom",
              offset: -3,
              fill: "#94a3b8",
              fontSize: 11,
            }}
          />
          <YAxis
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            label={{
              value: "Speed (m/s)",
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
            formatter={(val: number, name: string) => [
              `${val.toFixed(1)} m/s`,
              name,
            ]}
          />
          <Legend
            wrapperStyle={{ color: "#94a3b8", fontSize: 11 }}
            formatter={(value) =>
              value.replace(" (0-30°)", "").replace(" (30-50°)", "").replace(" (50-70°)", "").replace(" (70-90°)", "")
            }
          />
          {Array.from(regions).map((region) => (
            <Bar
              key={region}
              dataKey={region}
              fill={REGION_COLORS[region] ?? "#64748b"}
              radius={[3, 3, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
