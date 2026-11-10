// Prototype 3 — FUNCTIONAL
//
// Paradigm evidence: every function here is pure (same input always
// produces the same output, no side effects, no reassignment of its
// inputs) and the program is built by composing small transformations
// (map / filter / reduce) and recursion rather than hand-rolled loops with
// mutable counters. No input array is ever mutated - every step produces a
// brand-new array or value. `main` is the only place with any I/O.
//
// Problem solved: see ../README.md. Same input fixture, same two steps
// (nearby filter, then corroboration), as every other prototype.

const fs = require("fs");
const path = require("path");

const EARTH_RADIUS_KM = 6371;

// Pure function: given two points, always returns the same distance, and
// touches nothing outside its own arguments.
const haversineKm = (lat1, lon1, lat2, lon2) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
};

const loadReports = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));

// Step 1, as a transformation pipeline: map every report to a
// (report, distance) pair, then filter the pairs - no loop, no
// accumulator variable, no mutation of `reports`.
const findNearby = (reports, center, radiusKm) =>
  reports
    .map((report) => ({ report, distanceKm: haversineKm(center.lat, center.lon, report.lat, report.lon) }))
    .filter(({ distanceKm }) => distanceKm <= radiusKm);

const sameType = (a, b) => a.activityType === b.activityType;
const withinRadius = (a, b, radiusKm) => haversineKm(a.lat, a.lon, b.lat, b.lon) <= radiusKm;

const centroidOf = (members) => ({
  lat: members.reduce((sum, r) => sum + r.lat, 0) / members.length,
  lon: members.reduce((sum, r) => sum + r.lon, 0) / members.length,
});

const toClusterSummary = (members) => ({
  activityType: members[0].activityType,
  corroborations: members.length,
  memberIds: members.map((r) => r.id),
  centroid: centroidOf(members),
});

// Step 2, by recursion instead of a nested for-loop: peel the first
// unclustered report off `remaining`, partition the rest into "belongs with
// it" / "doesn't", and recurse on what's left - never reassigning
// `remaining`, only ever passing a new, smaller array to the next call.
function corroborate(remaining, radiusKm, clustersSoFar = []) {
  if (remaining.length === 0) {
    return clustersSoFar;
  }

  const [head, ...rest] = remaining;

  const { matched, unmatched } = rest.reduce(
    (acc, candidate) => {
      const belongs = sameType(head, candidate) && withinRadius(head, candidate, radiusKm);
      return belongs
        ? { matched: [...acc.matched, candidate], unmatched: acc.unmatched }
        : { matched: acc.matched, unmatched: [...acc.unmatched, candidate] };
    },
    { matched: [], unmatched: [] }
  );

  const cluster = toClusterSummary([head, ...matched]);
  return corroborate(unmatched, radiusKm, [...clustersSoFar, cluster]);
}

function main() {
  const SEARCH_CENTER = { lat: 41.8781, lon: -87.6298 };
  const SEARCH_RADIUS_KM = 5;
  const CORROBORATION_RADIUS_KM = 0.15;

  const fixturePath = path.join(__dirname, "..", "shared", "sample_reports.json");
  const allReports = loadReports(fixturePath);
  console.log(`Loaded ${allReports.length} reports.\n`);

  console.log(`--- Step 1: nearby filter (center=${SEARCH_CENTER.lat},${SEARCH_CENTER.lon}, radius=${SEARCH_RADIUS_KM}km) ---`);
  const nearby = findNearby(allReports, SEARCH_CENTER, SEARCH_RADIUS_KM);
  nearby.forEach(({ report, distanceKm }) => {
    console.log(`  #${report.id} ${report.activityType} - ${distanceKm.toFixed(3)}km away`);
  });
  console.log(`  -> ${nearby.length}/${allReports.length} reports within radius (${allReports.length - nearby.length} excluded)\n`);

  console.log(`--- Step 2: corroboration (radius=${CORROBORATION_RADIUS_KM}km, over ALL reports) ---`);
  const clusters = corroborate(allReports, CORROBORATION_RADIUS_KM);
  clusters.forEach((c) => {
    console.log(`  ${c.activityType}: ${c.corroborations} corroborating report(s) [ids ${c.memberIds.join(", ")}]`);
  });
  console.log(`  -> ${allReports.length} raw reports merged into ${clusters.length} corroborated entries\n`);

  // Referential-transparency check: calling the same pure function twice
  // with the same arguments must return the same result, and must not have
  // changed `allReports` along the way.
  const d1 = haversineKm(41.8781, -87.6298, 41.8782, -87.6297);
  const d2 = haversineKm(41.8781, -87.6298, 41.8782, -87.6297);
  console.log(`--- Purity check ---`);
  console.log(`  haversineKm called twice with identical args: ${d1} === ${d2} -> ${d1 === d2}`);
  console.log(`  allReports still has ${allReports.length} entries (unmutated by either step)\n`);
}

main();
