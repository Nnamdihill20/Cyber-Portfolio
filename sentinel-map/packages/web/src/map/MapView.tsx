import maplibregl, { Map as MLMap, Popup } from "maplibre-gl";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { AlprCamera, ActivityReport, Facility } from "../api";
import { haversineKm } from "../lib/geo";
import { ACTIVITY_COLORS, FACILITY_COLORS, VENDOR_COLORS } from "./layerStyles";

// Free, no-key-required raster basemaps - no real worldwide detail beyond
// these needs an API key. Both are meant for light/dev use per their
// providers' tile usage policies - swap for a proper provider (self-hosted
// OpenMapTiles, MapTiler, Esri with a licensed key, etc.) before any real
// deployment/traffic. Attribution is required for both and set below -
// MapLibre's built-in AttributionControl renders it automatically.
const STREET_STYLE: maplibregl.StyleSpecification = {
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

const SATELLITE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    satellite: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Esri, Maxar, Earthstar Geographics",
      maxzoom: 19,
    },
  },
  layers: [{ id: "satellite-tiles", type: "raster", source: "satellite" }],
};

// A viewport-derived search radius (see attachDataLayers below) can ask for
// a huge area if someone zooms out to see a whole country - cap it at what
// the API accepts (see lib/validation.ts#nearbyQuerySchema) rather than
// sending a request it'll just reject.
const MAX_RADIUS_KM = 100;
const MIN_RADIUS_KM = 0.5;

interface Props {
  center: [number, number]; // [lon, lat] - initial position only; see flyTo below for moving it afterward
  cameras: AlprCamera[];
  facilities: Facility[];
  reports: ActivityReport[];
  visibleLayers: { cameras: boolean; facilities: boolean; reports: boolean };
  onMapClick: (lat: number, lon: number) => void;
  onFlagReport: (id: string) => void;
  // Fires on load and on every pan/zoom, radius covering the full visible
  // viewport (not an arbitrary fixed default) - see docs on why a fixed
  // radius disconnected from what's on screen made pins seem to vanish.
  onViewportChange: (lat: number, lon: number, radiusKm: number) => void;
}

export interface MapViewHandle {
  /** Moves the map to a new location (e.g. once geolocation resolves) without waiting for user interaction. */
  flyTo: (lat: number, lon: number) => void;
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

// Every popup below is built as real DOM nodes with .textContent, never
// innerHTML/setHTML with interpolated values. facility name and camera
// vendor/confidence come from our own imports today, but report description
// is free text a member of the public typed in - treating all three the
// same way means a future change to what's shown (or to where the data
// comes from) can't quietly reopen a stored-XSS hole by routing untrusted
// text through a template string into HTML.
function line(parent: HTMLElement, text: string, tag: "b" | "div" = "div") {
  const el = document.createElement(tag);
  el.textContent = text;
  parent.appendChild(el);
  return el;
}

export const MapView = forwardRef<MapViewHandle, Props>(function MapView(
  { center, cameras, facilities, reports, visibleLayers, onMapClick, onFlagReport, onViewportChange },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const attachDataLayersRef = useRef<() => void>(() => {});
  const [satellite, setSatellite] = useState(false);

  // Sources/layers get wiped out by map.setStyle() (switching basemaps), so
  // re-attaching them has to read *current* data, not data captured in a
  // closure from whenever the map was first constructed - these refs are
  // what makeAttachDataLayers below actually reads from at call time.
  const camerasRef = useRef(cameras);
  const facilitiesRef = useRef(facilities);
  const reportsRef = useRef(reports);
  const visibleLayersRef = useRef(visibleLayers);
  const onFlagReportRef = useRef(onFlagReport);
  useEffect(() => { camerasRef.current = cameras; }, [cameras]);
  useEffect(() => { facilitiesRef.current = facilities; }, [facilities]);
  useEffect(() => { reportsRef.current = reports; }, [reports]);
  useEffect(() => { visibleLayersRef.current = visibleLayers; }, [visibleLayers]);
  useEffect(() => { onFlagReportRef.current = onFlagReport; }, [onFlagReport]);

  useImperativeHandle(ref, () => ({
    flyTo(lat, lon) {
      mapRef.current?.flyTo({ center: [lon, lat], zoom: 13 });
    },
  }));

  // Init map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STREET_STYLE,
      center,
      zoom: 12,
      maxZoom: 19,
      minZoom: 1, // 0 renders the world tile repeated oddly at this style's tileSize; 1 is the practical floor
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right"); // visible +/- zoom buttons, not just scroll/pinch
    mapRef.current = map;
    // MapLibre reports internal failures (a bad style, a tile request
    // erroring) through this event rather than a thrown exception - without
    // it they fail silently. This is also how the "style.load" typo below
    // got caught during testing: it wasn't reported as an error at all
    // (there wasn't one - the event just never fires), so worth remembering
    // that this listener catches *reported* failures, not silent no-ops.
    map.on("error", (e) => console.error("[maplibre]", e.error?.message ?? e));

    const markerLayers = ["cameras-layer", "facilities-layer", "reports-layer"];

    const reportViewport = () => {
      const c = map.getCenter();
      const bounds = map.getBounds();
      const radiusKm = Math.min(
        MAX_RADIUS_KM,
        Math.max(MIN_RADIUS_KM, haversineKm(c.lat, c.lng, bounds.getNorth(), bounds.getEast()))
      );
      onViewportChange(c.lat, c.lng, radiusKm);
    };

    // "Nearby" is only meaningful relative to what's actually on screen -
    // refetch centered on wherever the user pans/zooms to, with a radius
    // that covers the whole visible area (not an arbitrary fixed default -
    // that's what made cameras/facilities/reports seem to vanish before).
    map.on("moveend", reportViewport);

    map.on("click", (e) => {
      // A click that landed on an existing pin is handled by that layer's own
      // click listener below (opens its popup) - don't also pop the "report
      // new activity" form on top of it. queryRenderedFeatures only finds
      // layers that exist yet, so this is naturally a no-op before "load".
      const hitMarker = map.queryRenderedFeatures(e.point, { layers: markerLayers.filter((id) => map.getLayer(id)) });
      if (hitMarker.length > 0) return;
      onMapClick(e.lngLat.lat, e.lngLat.lng);
    });

    // Adds the three data sources/layers/popups/hover-cursor handlers, and
    // immediately populates them from the latest data (via refs, since this
    // runs both on initial "load" and again after every setStyle() call
    // when switching basemaps, long after the initial render). MapLibre
    // errors if you try to re-add a source/layer id that already exists,
    // so this always starts from a style that has none - true on first
    // "load", and true again after setStyle() replaces the whole style.
    function attachDataLayers() {
      map.addSource("cameras", { type: "geojson", data: toFeatureCollection(camerasRef.current) });
      map.addSource("facilities", { type: "geojson", data: toFeatureCollection(facilitiesRef.current) });
      map.addSource("reports", { type: "geojson", data: toFeatureCollection(reportsRef.current) });

      map.addLayer({
        id: "cameras-layer",
        type: "circle",
        source: "cameras",
        layout: { visibility: visibleLayersRef.current.cameras ? "visible" : "none" },
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
        layout: { visibility: visibleLayersRef.current.facilities ? "visible" : "none" },
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
        layout: { visibility: visibleLayersRef.current.reports ? "visible" : "none" },
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
          onFlagReportRef.current(p.id);
          flagBtn.disabled = true;
          flagBtn.textContent = "Flagged - thank you";
        };
        el.appendChild(flagBtn);

        new Popup().setLngLat((feature.geometry as any).coordinates).setDOMContent(el).addTo(map);
      });

      for (const layerId of markerLayers) {
        map.on("mouseenter", layerId, () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", layerId, () => (map.getCanvas().style.cursor = ""));
      }
    }

    attachDataLayersRef.current = attachDataLayers;

    map.on("load", () => {
      attachDataLayers();
      reportViewport(); // get an initial radius immediately, don't wait for the first pan
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

  const toggleSatellite = () => {
    const map = mapRef.current;
    if (!map) return;
    const next = !satellite;
    setSatellite(next);
    map.setStyle(next ? SATELLITE_STYLE : STREET_STYLE);
    // setStyle tears down every source/layer not part of the new style -
    // re-add ours (with current data, current visibility) once the new
    // style has been committed. "styledata" is the real MapLibre event for
    // this ("style.load" - used in an earlier version of this code - isn't
    // an event MapLibre actually emits, so that callback silently never
    // ran; caught by testing the satellite toggle with a real popup click
    // after switching, not just checking that the toggle button worked).
    map.once("styledata", () => attachDataLayersRef.current());
  };

  return (
    <>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
      <button className="basemap-toggle" onClick={toggleSatellite}>
        {satellite ? "Street map" : "Satellite"}
      </button>
    </>
  );
});
