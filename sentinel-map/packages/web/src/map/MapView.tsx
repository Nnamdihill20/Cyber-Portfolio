import maplibregl, { Map as MLMap, Popup } from "maplibre-gl";
import { useEffect, useRef } from "react";
import type { AlprCamera, ActivityReport, Facility } from "../api";
import { ACTIVITY_COLORS, FACILITY_COLORS, VENDOR_COLORS } from "./layerStyles";

// Free, no-key-required demo style/tiles - swap for your own vector tile
// source (e.g. self-hosted OpenMapTiles or MapTiler) before real deployment.
const DEMO_STYLE = "https://demotiles.maplibre.org/style.json";

interface Props {
  center: [number, number]; // [lon, lat]
  cameras: AlprCamera[];
  facilities: Facility[];
  reports: ActivityReport[];
  visibleLayers: { cameras: boolean; facilities: boolean; reports: boolean };
  onMapClick: (lat: number, lon: number) => void;
  onFlagReport: (id: string) => void;
}

// maplibre's TS types model "match" expressions as fixed-length tuples, which
// doesn't fit a color map built from Object.entries at runtime - cast once
// here instead of scattering `as any` through the paint specs below.
function matchExpression(getField: string, colors: Record<string, string>, fallback: string) {
  return ["match", ["get", getField], ...Object.entries(colors).flat(), fallback] as unknown as maplibregl.DataDrivenPropertyValueSpecification<string>;
}

function toFeatureCollection<T extends { latitude: number; longitude: number }>(
  items: T[]
) {
  return {
    type: "FeatureCollection" as const,
    features: items.map((item) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [item.longitude, item.latitude],
      },
      properties: item as unknown as Record<string, unknown>,
    })),
  };
}

export function MapView({
  center,
  cameras,
  facilities,
  reports,
  visibleLayers,
  onMapClick,
  onFlagReport,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);

  // Init map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DEMO_STYLE,
      center,
      zoom: 12,
    });
    mapRef.current = map;

    const markerLayers = ["cameras-layer", "facilities-layer", "reports-layer"];

    map.on("click", (e) => {
      // A click that landed on an existing pin is handled by that layer's own
      // click listener below (opens its popup) - don't also pop the "report
      // new activity" form on top of it. queryRenderedFeatures only finds
      // layers that exist yet, so this is naturally a no-op before "load".
      const hitMarker = map.queryRenderedFeatures(e.point, { layers: markerLayers.filter((id) => map.getLayer(id)) });
      if (hitMarker.length > 0) return;
      onMapClick(e.lngLat.lat, e.lngLat.lng);
    });

    map.on("load", () => {
      map.addSource("cameras", { type: "geojson", data: toFeatureCollection([]) });
      map.addSource("facilities", { type: "geojson", data: toFeatureCollection([]) });
      map.addSource("reports", { type: "geojson", data: toFeatureCollection([]) });

      map.addLayer({
        id: "cameras-layer",
        type: "circle",
        source: "cameras",
        paint: {
          "circle-radius": 6,
          "circle-color": matchExpression("vendor", VENDOR_COLORS, "#666666"),
          "circle-stroke-width": 1,
          "circle-stroke-color": "#ffffff",
        },
      });

      map.addLayer({
        id: "facilities-layer",
        type: "circle",
        source: "facilities",
        paint: {
          "circle-radius": 8,
          "circle-color": matchExpression("type", FACILITY_COLORS, "#4a5568"),
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      map.addLayer({
        id: "reports-layer",
        type: "circle",
        source: "reports",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "corroborations"],
            1,
            7,
            10,
            16,
          ],
          "circle-color": matchExpression("activityType", ACTIVITY_COLORS, "#718096"),
          "circle-opacity": 0.75,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#ffffff",
        },
      });

      for (const [layerId, popupBuilder] of [
        ["cameras-layer", (p: any) => `<b>ALPR camera</b><br/>Vendor: ${p.vendor}<br/>Confidence: ${p.confidence}`],
        ["facilities-layer", (p: any) => `<b>${p.name}</b><br/>${p.type}`],
      ] as const) {
        map.on("click", layerId, (e) => {
          const feature = e.features?.[0];
          if (!feature) return;
          new Popup()
            .setLngLat((feature.geometry as any).coordinates)
            .setHTML(popupBuilder(feature.properties))
            .addTo(map);
        });
        map.on("mouseenter", layerId, () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", layerId, () => (map.getCanvas().style.cursor = ""));
      }

      // Reports get a DOM (not HTML-string) popup so the flag button can
      // carry a real click handler instead of inline JS.
      map.on("click", "reports-layer", (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const p = feature.properties as any;

        const el = document.createElement("div");
        el.className = "report-popup";
        el.innerHTML = `
          <b>${p.activityType}</b><br/>
          Corroborations: ${p.corroborations}<br/>
          ${p.description ?? ""}
        `;
        const flagBtn = document.createElement("button");
        flagBtn.className = "flag-button";
        flagBtn.textContent = "Flag as inaccurate";
        flagBtn.onclick = () => {
          onFlagReport(p.id);
          flagBtn.disabled = true;
          flagBtn.textContent = "Flagged - thank you";
        };
        el.appendChild(flagBtn);

        new Popup().setLngLat((feature.geometry as any).coordinates).setDOMContent(el).addTo(map);
      });
      map.on("mouseenter", "reports-layer", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "reports-layer", () => (map.getCanvas().style.cursor = ""));
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep data sources in sync with fetched data.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource("cameras") as maplibregl.GeoJSONSource | undefined;
    src?.setData(toFeatureCollection(cameras) as any);
  }, [cameras]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource("facilities") as maplibregl.GeoJSONSource | undefined;
    src?.setData(toFeatureCollection(facilities) as any);
  }, [facilities]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource("reports") as maplibregl.GeoJSONSource | undefined;
    src?.setData(toFeatureCollection(reports) as any);
  }, [reports]);

  // Toggle layer visibility.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      map.setLayoutProperty("cameras-layer", "visibility", visibleLayers.cameras ? "visible" : "none");
      map.setLayoutProperty("facilities-layer", "visibility", visibleLayers.facilities ? "visible" : "none");
      map.setLayoutProperty("reports-layer", "visibility", visibleLayers.reports ? "visible" : "none");
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [visibleLayers]);

  return <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />;
}
