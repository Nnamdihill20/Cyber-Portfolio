import { useCallback, useEffect, useState } from "react";
import {
  fetchCamerasNearby,
  fetchFacilitiesNearby,
  fetchReportsNearby,
  submitReport,
  type AlprCamera,
  type ActivityReport,
  type Facility,
} from "./api";
import { ReportForm } from "./components/ReportForm";
import { Sidebar } from "./components/Sidebar";
import { MapView } from "./map/MapView";

// Default center is a placeholder (Chicago, roughly) - swap for
// navigator.geolocation once you're ready to use the visitor's real location.
const DEFAULT_CENTER: [number, number] = [-87.6298, 41.8781];

export default function App() {
  const [center] = useState<[number, number]>(DEFAULT_CENTER);
  const [radiusKm, setRadiusKm] = useState(5);
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

  const handleReportSubmit = async (activityType: string, description: string) => {
    if (!pendingReportAt) return;
    try {
      await submitReport({
        latitude: pendingReportAt.lat,
        longitude: pendingReportAt.lon,
        activityType,
        description: description || undefined,
      });
      setPendingReportAt(null);
      refresh();
    } catch (err) {
      console.error(err);
      alert("Failed to submit report - see console.");
    }
  };

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <MapView
        center={center}
        cameras={cameras}
        facilities={facilities}
        reports={reports}
        visibleLayers={visibleLayers}
        onMapClick={(lat, lon) => setPendingReportAt({ lat, lon })}
      />
      <Sidebar
        visibleLayers={visibleLayers}
        onToggle={handleToggle}
        radiusKm={radiusKm}
        onRadiusChange={setRadiusKm}
        counts={{ cameras: cameras.length, facilities: facilities.length, reports: reports.length }}
      />
      {pendingReportAt && (
        <ReportForm
          lat={pendingReportAt.lat}
          lon={pendingReportAt.lon}
          onSubmit={handleReportSubmit}
          onCancel={() => setPendingReportAt(null)}
        />
      )}
    </div>
  );
}
