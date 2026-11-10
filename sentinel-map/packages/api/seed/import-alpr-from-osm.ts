/**
 * Bulk-import ALPR cameras directly from OpenStreetMap via the Overpass
 * API, for a given bounding box.
 *
 * This is DeFlock's actual data source: DeFlock doesn't host its own
 * database - every camera on its map is an OSM node/way tagged
 * `man_made=surveillance` + `surveillance:type=ALPR` (documented at
 * https://wiki.openstreetmap.org/wiki/Tag:surveillance:type=ALPR), queried
 * live via Overpass, same as DeFlock's own site does. As of early 2026 that
 * registry had over 336,000 tagged cameras worldwide across every major
 * vendor - Flock, Motorola/Vigilant, Genetec, Axon, and others - each
 * (when contributors tagged it) carrying `manufacturer` and `operator`
 * sub-tags this script maps onto AlprVendor/ownerName below.
 *
 * Prefer this over a static CSV snapshot: this data changes constantly as
 * OSM contributors add/correct entries, so a downloaded-once file goes
 * stale immediately - this script gives you whatever's current, for
 * whatever area you ask it about, every time you run it.
 *
 * Usage:
 *   ts-node seed/import-alpr-from-osm.ts <minLat> <minLon> <maxLat> <maxLon>
 *
 * Example (roughly the Chicago area):
 *   ts-node seed/import-alpr-from-osm.ts 41.6 -87.9 42.1 -87.5
 *
 * A bounding box covering an entire state or the whole country works too,
 * but will take longer and return a lot more rows - Overpass's public
 * instance also rate-limits large/frequent queries, so avoid hammering it
 * with repeated huge requests (see https://overpass-api.de/ for their fair
 * use guidance, and consider a regional Overpass mirror or self-hosting
 * Overpass for heavy/repeated use).
 */
import "dotenv/config";
import { PrismaClient, AlprVendor } from "@prisma/client";

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

// Matches free-text `manufacturer` tag values (contributors don't use a
// controlled vocabulary) onto our enum. Order matters where one name could
// be a substring of another's variant spelling - most specific first.
const VENDOR_PATTERNS: Array<[RegExp, AlprVendor]> = [
  [/flock/i, "FLOCK"],
  [/vigilant|motorola/i, "MOTOROLA_VIGILANT"],
  [/genetec/i, "GENETEC"],
  [/rekor/i, "REKOR"],
  [/neology|pips/i, "NEOLOGY"],
  [/elsag|leonardo/i, "ELSAG"],
  [/jenoptik/i, "JENOPTIK"],
  [/coban/i, "COBAN"],
];

function detectVendor(manufacturer: string | undefined): AlprVendor {
  if (!manufacturer) return "UNKNOWN";
  for (const [pattern, vendor] of VENDOR_PATTERNS) {
    if (pattern.test(manufacturer)) return vendor;
  }
  return "OTHER"; // tagged with a manufacturer, just not one of our known enum values
}

async function main() {
  const [minLat, minLon, maxLat, maxLon] = process.argv.slice(2).map(Number);
  if ([minLat, minLon, maxLat, maxLon].some((n) => Number.isNaN(n))) {
    console.error(
      "Usage: ts-node seed/import-alpr-from-osm.ts <minLat> <minLon> <maxLat> <maxLon>"
    );
    process.exit(1);
  }

  const query = `
    [out:json][timeout:120];
    (
      node["man_made"="surveillance"]["surveillance:type"="ALPR"](${minLat},${minLon},${maxLat},${maxLon});
      way["man_made"="surveillance"]["surveillance:type"="ALPR"](${minLat},${minLon},${maxLat},${maxLon});
    );
    out center tags;
  `;

  console.log("Querying Overpass API for ALPR-tagged nodes...");
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: query,
  });

  if (!res.ok) {
    throw new Error(`Overpass request failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { elements: OverpassElement[] };
  console.log(`Got ${data.elements.length} ALPR-tagged elements from OSM.`);

  let imported = 0;
  for (const el of data.elements) {
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat === undefined || lon === undefined) continue;

    const tags = el.tags ?? {};
    const vendor = detectVendor(tags.manufacturer);
    // surveillance:zone (parking/traffic/town/etc.) is a real OSM tag but
    // doesn't map cleanly onto our ownerType enum (POLICE_DEPT/HOA/PRIVATE_
    // BUSINESS/TOLL_AUTHORITY) without guessing - recorded in notes instead
    // of asserting an ownerType we don't actually have evidence for.
    const zone = tags["surveillance:zone"];

    await prisma.alprCamera.create({
      data: {
        latitude: lat,
        longitude: lon,
        vendor,
        ownerName: tags.operator,
        source: "osm_overpass",
        sourceDataset: "openstreetmap_alpr_tags",
        confidence: "VERIFIED", // sourced from a public, independently-checkable dataset - see docs/DATA_SOURCES.md
        notes: zone ? `OSM surveillance:zone=${zone}` : undefined,
        lastVerifiedAt: new Date(),
      },
    });
    imported++;
  }

  console.log(`Imported ${imported} ALPR cameras.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
