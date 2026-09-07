import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchCamerasNearby,
  fetchFacilitiesNearby,
  fetchReportsNearby,
  flagReport,
  submitReport,
  type AlprCamera,
  type ActivityReport,
  type Facility,
} from "./api";
import { ReportForm } from "./components/ReportForm";
import { ResourcesPanel } from "./components/ResourcesPanel";
import { Sidebar } from "./components/Sidebar";
import { MapView, type MapViewHandle } from "./map/MapView";

// Fallback only - used until geolocation resolves (or if it's denied/
// unavailable), never the app's steady-state location. See the geolocation
// effect below.
const DEFAULT_CENTER: [number, number] = [-87.6298, 41.8781];

export default function App() {
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [radiusKm, setRadiusKm] = useState(5); // real value arrives within one frame, from MapView's initial viewport report
  const [visibleLayers, setVisibleLayers] = useState({
    cameras: true,
    facilities: true,
    reports: true,
  });

  const [cameras, setCameras] = useState<AlprCamera[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [reports, setReports] = useState<ActivityReport[]>([]);
  const [pendingReportAt, setPendingReportAt] = useState<{ lat: number; lon: number } | null>(
    null
  );
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const mapViewRef = useRef<MapViewHandle>(null);

  const [toast, setToast] = useState<{ text: string; kind: "success" | "error" } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (text: string, kind: "success" | "error" = "success") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ text, kind });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  // Center the map on the visitor's real location as soon as the browser
  // will give it up. Falls back to DEFAULT_CENTER silently on denial/
  // timeout/unsupported browsers - there's no good UI for "we don't know
  // where you are," so the map just stays where it started.
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        mapViewRef.current?.flyTo(latitude, longitude);
      },
      (err) => console.warn("Geolocation unavailable - staying at the default location:", err.message),
      { timeout: 8000 }
    );
  }, []);

  const refresh = useCallback(() => {
    const [lon, lat] = center;
    fetchCamerasNearby(lat, lon, radiusKm).then(setCameras).catch(console.error);
    fetchFacilitiesNearby(lat, lon, radiusKm).then(setFacilities).catch(console.error);
    fetchReportsNearby(lat, lon, radiusKm).then(setReports).catch(console.error);
  }, [center, radiusKm]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60_000); // reports decay - keep the view fresh
    return () => clearInterval(interval);
  }, [refresh]);

  const handleToggle = (layer: "cameras" | "facilities" | "reports") => {
    setVisibleLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  const handleFlagReport = async (id: string) => {
    try {
      await flagReport(id);
      showToast("Report flagged - thank you");
      refresh();
    } catch (err) {
      console.error(err);
      showToast("Failed to flag report", "error");
    }
  };

  const handleReportSubmit = async (
    activityType: string,
    description: string,
    honeypot: string
  ) => {
    if (!pendingReportAt) return;
    try {
      const result = await submitReport({
        latitude: pendingReportAt.lat,
        longitude: pendingReportAt.lon,
        activityType,
        description: description || undefined,
        honeypot: honeypot || undefined,
      });
      setPendingReportAt(null);
      showToast(
        result.corroborated
          ? "Submitted - matches an existing nearby report"
          : "Report submitted"
      );
      refresh();
    } catch (err) {
      console.error(err);
      showToast("Failed to submit report - see console for details", "error");
    }
  };

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <MapView
        ref={mapViewRef}
        center={center}
        cameras={cameras}
        facilities={facilities}
        reports={reports}
        visibleLayers={visibleLayers}
        onMapClick={(lat, lon) => setPendingReportAt({ lat, lon })}
        onFlagReport={handleFlagReport}
        onViewportChange={(lat, lon, km) => {
          setCenter([lon, lat]);
          setRadiusKm(km);
        }}
      />
      <Sidebar
        visibleLayers={visibleLayers}
        onToggle={handleToggle}
        radiusKm={radiusKm}
        onRadiusChange={setRadiusKm}
        counts={{ cameras: cameras.length, facilities: facilities.length, reports: reports.length }}
        onOpenResources={() => setResourcesOpen(true)}
      />
      {pendingReportAt && (
        <ReportForm
          lat={pendingReportAt.lat}
          lon={pendingReportAt.lon}
          onSubmit={handleReportSubmit}
          onCancel={() => setPendingReportAt(null)}
        />
      )}
      {resourcesOpen && (
        <ResourcesPanel center={center} onClose={() => setResourcesOpen(false)} />
      )}
      {toast && <div className={`toast toast-${toast.kind}`}>{toast.text}</div>}
    </div>
  );
}
