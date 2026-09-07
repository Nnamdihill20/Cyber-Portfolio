import maplibregl, { Map as MLMap, Popup } from "maplibre-gl";
import { useEffect, useRef } from "react";
import type { AlprCamera, ActivityReport, Facility } from "../api";
import { ACTIVITY_COLORS, FACILITY_COLORS, VENDOR_COLORS } from "./layerStyles";

// Free, no-key-required raster basemap with real worldwide detail at every
// zoom level. OSM's tile server is meant for light/dev use per their tile
// usage policy (https://operations.osmfoundation.org/policies/tiles/) -
// swap for a proper provider (self-hosted OpenMapTiles, MapTiler, etc.)
// before any real deployment/traffic. Attribution is required and set
// below - MapLibre's built-in AttributionControl renders it automatically.
const OSM_RASTER_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap contributors",
      maxzoom: 19,
    },
  },
  layers: [{ id: "osm-tiles", type: "raster", source: "osm" }],
};

interface Props {
  center: [number, number]; // [lon, lat]
  cameras: AlprCamera[];
  facilities: Facility[];
  reports: ActivityReport[];
  visibleLayers: { cameras: boolean; facilities: boolean; reports: boolean };
  onMapClick: (lat: number, lon: number) => void;
  onFlagReport: (id: string) => void;
  onCenterChange: (lat: number, lon: number) => void;
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
  onCenterChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);

  // Init map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_RASTER_STYLE,
      center,
      zoom: 12,
      maxZoom: 19,
      minZoom: 1, // 0 renders the world tile repeated oddly at this style's tileSize; 1 is the practical floor
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right"); // visible +/- zoom buttons, not just scroll/pinch
    mapRef.current = map;

    // "Nearby" is only meaningful relative to where the user is actually
    // looking - refetch centered on wherever they pan/zoom to, instead of
    // forever querying around the initial default location.
    map.on("moveend", () => {
      const c = map.getCenter();
      onCenterChange(c.lat, c.lng);
    });

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

      // Every popup below is built as real DOM nodes with .textContent, never
      // innerHTML/setHTML with interpolated values. facility name and camera
      // vendor/confidence come from our own imports today, but report
      // description is free text a member of the public typed in - treating
      // all three the same way means a future change to what's shown (or to
      // where the data comes from) can't quietly reopen a stored-XSS hole by
      // routing untrusted text through a template string into HTML.
      function line(parent: HTMLElement, text: string, tag: "b" | "div" = "div") {
        const el = document.createElement(tag);
        el.textContent = text;
        parent.appendChild(el);
        return el;
      }

      map.on("click", "cameras-layer", (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const p = feature.properties as any;
        const el = document.createElement("div");
        line(el, "ALPR camera", "b");
        line(el, `Vendor: ${p.vendor}`);
        line(el, `Confidence: ${p.confidence}`);
        new Popup().setLngLat((feature.geometry as any).coordinates).setDOMContent(el).addTo(map);
      });

      map.on("click", "facilities-layer", (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const p = feature.properties as any;
        const el = document.createElement("div");
        line(el, p.name, "b");
        line(el, p.type);
        new Popup().setLngLat((feature.geometry as any).coordinates).setDOMContent(el).addTo(map);
      });

      map.on("click", "reports-layer", (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const p = feature.properties as any;

        const el = document.createElement("div");
        el.className = "report-popup";
        line(el, p.activityType, "b");
        line(el, `Corroborations: ${p.corroborations}`);
        if (p.description) line(el, p.description);

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

      for (const layerId of ["cameras-layer", "facilities-layer", "reports-layer"]) {
        map.on("mouseenter", layerId, () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", layerId, () => (map.getCanvas().style.cursor = ""));
      }
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
