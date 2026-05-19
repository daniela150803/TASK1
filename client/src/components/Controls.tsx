import type { DashboardControls } from "../types/api";

interface Props {
  controls: DashboardControls;
  onChange: (c: DashboardControls) => void;
}

export function Controls({ controls, onChange }: Props) {
  const set = (key: keyof DashboardControls, val: number) =>
    onChange({ ...controls, [key]: val });

  return (
    <div className="flex flex-wrap gap-4 items-center bg-surface rounded-xl px-5 py-3 border border-border">
      <div className="flex items-center gap-2">
        <label className="text-sm text-muted font-medium">Face</label>
        <select
          className="bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-accent"
          value={controls.face}
          onChange={(e) => set("face", Number(e.target.value))}
        >
          {[0, 1, 2, 3, 4, 5].map((f) => (
            <option key={f} value={f}>
              Face {f}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-muted font-medium">
          Level{" "}
          <span className="text-accent font-bold">{controls.level}</span>
          <span className="text-xs text-muted ml-1">
            (~{Math.round((controls.level / 52) * 80)} km)
          </span>
        </label>
        <input
          type="range"
          min={0}
          max={51}
          value={controls.level}
          onChange={(e) => set("level", Number(e.target.value))}
          className="w-32 accent-accent"
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-muted font-medium">Year</label>
        <select
          className="bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-accent"
          value={controls.year}
          onChange={(e) => set("year", Number(e.target.value))}
        >
          {[2016, 2020].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
