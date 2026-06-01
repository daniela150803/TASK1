interface Props {
  years: number[];
  selected: number;
  onChange: (y: number) => void;
}

export function YearSelector({ years, selected, onChange }: Props) {
  const min = years[0];
  const max = years[years.length - 1];

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 rounded-lg flex-wrap"
      style={{ background: "#080f1e", border: "1px solid #1e3a5f" }}
    >
      <div className="flex items-center gap-2 text-xs" style={{ color: "#8ba3c4" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span className="font-medium">Año</span>
      </div>

      <div className="flex items-center gap-1">
        {years.map((y) => (
          <button
            key={y}
            onClick={() => onChange(y)}
            className="px-3 py-1 rounded text-xs font-medium transition-colors"
            style={
              selected === y
                ? { background: "#22d3ee", color: "#030610" }
                : { color: "#8ba3c4", background: "transparent" }
            }
          >
            {y}
          </button>
        ))}
      </div>

      <div className="flex-1 flex items-center gap-2 min-w-[160px]">
        <span className="text-xs font-mono" style={{ color: "#4a6380" }}>{min}</span>
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={selected}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 accent-cyan-400"
          style={{ height: "4px" }}
        />
        <span className="text-xs font-mono" style={{ color: "#4a6380" }}>{max}</span>
      </div>

      <span className="text-xs font-medium" style={{ color: "#22d3ee" }}>
        {selected} <span style={{ color: "#4a6380" }}>seleccionado</span>
      </span>
    </div>
  );
}
