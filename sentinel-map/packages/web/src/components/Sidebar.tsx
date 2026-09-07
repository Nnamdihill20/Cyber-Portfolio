interface Props {
  visibleLayers: { cameras: boolean; facilities: boolean; reports: boolean };
  onToggle: (layer: "cameras" | "facilities" | "reports") => void;
  radiusKm: number;
  onRadiusChange: (km: number) => void;
  counts: { cameras: number; facilities: number; reports: number };
  onOpenResources: () => void;
}

export function Sidebar({
  visibleLayers,
  onToggle,
  radiusKm,
  onRadiusChange,
  counts,
  onOpenResources,
}: Props) {
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

      {/* Defaults to (and resets to, on every pan/zoom) the radius that
          matches what's actually visible - see MapView.tsx's
          onViewportChange. That auto-follow is what fixed pins seeming to
          vanish (a fixed slider value could badly disagree with what was
          on screen). The slider layers manual narrowing on top of that
          default, for decluttering a busy area - drag it below the
          on-screen value to see less, and it'll snap back to matching the
          view again next time you pan or zoom. */}
      <div className="radius-control">
        <label>Search radius: {radiusKm.toFixed(1)} km</label>
        <input
          type="range"
          min={0.5}
          max={100}
          step={0.5}
          value={radiusKm}
          onChange={(e) => onRadiusChange(Number(e.target.value))}
        />
      </div>

      <p className="hint">Click the map to report activity at that spot.</p>

      <button className="resources-button" onClick={onOpenResources}>
        Know your rights &amp; legal aid
      </button>

      <div className="sidebar-footer-links">
        <a href="/privacy">Privacy</a>
        <span aria-hidden="true">&middot;</span>
        <a href="/terms">Terms</a>
      </div>
    </div>
  );
}
