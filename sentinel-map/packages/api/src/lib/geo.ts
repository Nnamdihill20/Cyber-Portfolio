import crypto from "crypto";

const EARTH_RADIUS_KM = 6371;

export function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance between two points, in kilometers. */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/**
 * Cheap bounding box around a point, used to pre-filter rows in SQL before
 * the exact haversine check runs in JS. Not geodesically exact near the
 * poles or the antimeridian - fine for a country-scale MVP; swap for a real
 * PostGIS geography column + ST_DWithin if that ever matters here.
 */
export function boundingBox(lat: number, lon: number, radiusKm: number) {
  const latDelta = radiusKm / 111.32; // ~km per degree latitude
  const lonDelta =
    radiusKm / (111.32 * Math.cos(toRadians(lat)) || 1);
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLon: lon - lonDelta,
    maxLon: lon + lonDelta,
  };
}

/**
 * Salted hash of a reporter's IP+User-Agent. Used only for rate limiting and
 * duplicate-corroboration detection - the raw IP is never stored. See
 * docs/MODERATION.md.
 */
export function reporterHash(ip: string, userAgent: string, salt: string): string {
  return crypto
    .createHash("sha256")
    .update(`${salt}:${ip}:${userAgent}`)
    .digest("hex");
}
