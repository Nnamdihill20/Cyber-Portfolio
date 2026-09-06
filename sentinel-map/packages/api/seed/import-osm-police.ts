/**
 * Bulk-import police & sheriff stations from OpenStreetMap via the Overpass
 * API, for a given bounding box.
 *
 * Usage:
 *   ts-node seed/import-osm-police.ts <minLat> <minLon> <maxLat> <maxLon>
 *
 * Example (roughly the Chicago area):
 *   ts-node seed/import-osm-police.ts 41.6 -87.9 42.1 -87.5
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

async function main() {
  const [minLat, minLon, maxLat, maxLon] = process.argv.slice(2).map(Number);
  if ([minLat, minLon, maxLat, maxLon].some((n) => Number.isNaN(n))) {
    console.error(
      "Usage: ts-node seed/import-osm-police.ts <minLat> <minLon> <maxLat> <maxLon>"
    );
    process.exit(1);
  }

  const query = `
    [out:json][timeout:60];
    (
      node["amenity"="police"](${minLat},${minLon},${maxLat},${maxLon});
      way["amenity"="police"](${minLat},${minLon},${maxLat},${maxLon});
    );
    out center tags;
  `;

  console.log("Querying Overpass API...");
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: query,
  });

  if (!res.ok) {
    throw new Error(`Overpass request failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { elements: OverpassElement[] };
  console.log(`Got ${data.elements.length} elements from OSM.`);

  let imported = 0;
  for (const el of data.elements) {
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat === undefined || lon === undefined) continue;

    const name = el.tags?.name ?? "Unnamed police station";
    const isSheriff = /sheriff/i.test(name);

    await prisma.facility.create({
      data: {
        latitude: lat,
        longitude: lon,
        name,
        type: isSheriff ? "SHERIFF_OFFICE" : "POLICE_STATION",
        jurisdiction: isSheriff ? "COUNTY" : "MUNICIPAL",
        address: el.tags?.["addr:full"] ?? el.tags?.["addr:street"],
        phone: el.tags?.phone,
        source: "osm_overpass",
        lastVerifiedAt: new Date(),
      },
    });
    imported++;
  }

  console.log(`Imported ${imported} facilities.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
