interface Props {
  visibleLayers: { cameras: boolean; facilities: boolean; reports: boolean };
  onToggle: (layer: "cameras" | "facilities" | "reports") => void;
  radiusKm: number;
  onRadiusChange: (km: number) => void;
  counts: { cameras: number; facilities: number; reports: number };
}

export function Sidebar({ visibleLayers, onToggle, radiusKm, onRadiusChange, counts }: Props) {
  return (
    <div className="sidebar">
      <h1>Sentinel Map</h1>
      <p className="subtitle">Public infrastructure &amp; anonymous activity reports</p>

      <label className="layer-row">
        <input
          type="checkbox"
          checked={visibleLayers.cameras}
          onChange={() => onToggle("cameras")}
        />
        ALPR cameras ({counts.cameras})
      </label>
      <label className="layer-row">
        <input
          type="checkbox"
          checked={visibleLayers.facilities}
          onChange={() => onToggle("facilities")}
        />
        Facilities ({counts.facilities})
      </label>
      <label className="layer-row">
        <input
          type="checkbox"
          checked={visibleLayers.reports}
          onChange={() => onToggle("reports")}
        />
        Activity reports ({counts.reports})
      </label>

      <div className="radius-control">
        <label>Search radius: {radiusKm} km</label>
        <input
          type="range"
          min={1}
          max={25}
          value={radiusKm}
          onChange={(e) => onRadiusChange(Number(e.target.value))}
        />
      </div>

      <p className="hint">Click the map to report activity at that spot.</p>
    </div>
  );
}
