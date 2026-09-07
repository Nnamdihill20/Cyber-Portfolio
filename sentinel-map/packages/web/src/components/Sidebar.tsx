interface Props {
  visibleLayers: { cameras: boolean; facilities: boolean; reports: boolean };
  onToggle: (layer: "cameras" | "facilities" | "reports") => void;
  radiusKm: number;
  counts: { cameras: number; facilities: number; reports: number };
  onOpenResources: () => void;
}

export function Sidebar({ visibleLayers, onToggle, radiusKm, counts, onOpenResources }: Props) {
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

      {/* Radius follows the visible map area automatically (pan/zoom to
          change it) - see MapView.tsx's onViewportChange. A manual slider
          used to control this independently of what was on screen, which
          is exactly what made pins seem to vanish: the query radius and
          the visible area could disagree. */}
      <p className="hint">Showing everything within ~{radiusKm.toFixed(1)} km (matches the map view)</p>

      <p className="hint">Click the map to report activity at that spot.</p>

      <button className="resources-button" onClick={onOpenResources}>
        Know your rights &amp; legal aid
      </button>
    </div>
  );
}
