// Prototype 1 — IMPERATIVE
//
// Paradigm evidence: explicit mutable state (accumulator arrays/objects
// declared with `let`), sequential steps executed in a fixed order, `for`
// loops walking the data by hand, and `if` conditions controlling what
// happens to each element — the program is a recipe of *how* to compute the
// answer, step by step, rather than a declaration of *what* the answer is.
//
// Problem solved: see ../README.md. Same input fixture, same two steps
// (nearby filter, then corroboration), as every other prototype.

const fs = require("fs");
const path = require("path");

const SEARCH_CENTER = { lat: 41.8781, lon: -87.6298 };
const SEARCH_RADIUS_KM = 5;
const CORROBORATION_RADIUS_KM = 0.15; // 150m - same constant the real API uses

const EARTH_RADIUS_KM = 6371;

// Explicit, step-by-step distance calculation - no library call, the
// control flow (the sequence of arithmetic operations) is written out by
// hand, which is itself part of what makes this Imperative.
function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

function loadReports() {
  const raw = fs.readFileSync(path.join(__dirname, "..", "shared", "sample_reports.json"), "utf8");
  return JSON.parse(raw);
}

// Step 1: nearby filter, written as an explicit loop with a mutable
// accumulator - the sequence (loop, check, push) is the whole point here.
function findNearby(reports, center, radiusKm) {
  const nearby = []; // mutable accumulator - explicit state
  for (let i = 0; i < reports.length; i++) {
    const report = reports[i];
    const distance = haversineKm(center.lat, center.lon, report.lat, report.lon);
    if (distance <= radiusKm) {
      nearby.push({ ...report, distanceKm: distance });
    }
  }
  return nearby;
}

// Step 2: corroboration, written as nested loops with a "visited" flag array
// - explicit control over which reports have already been merged into a
// cluster, updated in place as the loop progresses.
function corroborate(reports, radiusKm) {
  const n = reports.length;
  const merged = []; // mutable accumulator
  const visited = new Array(n).fill(false); // explicit mutable state

  for (let i = 0; i < n; i++) {
    if (visited[i]) continue; // condition controlling flow

    const cluster = [reports[i]];
    visited[i] = true;

    for (let j = i + 1; j < n; j++) {
      if (visited[j]) continue;
      if (reports[j].activityType !== reports[i].activityType) continue;

      const distance = haversineKm(reports[i].lat, reports[i].lon, reports[j].lat, reports[j].lon);
      if (distance <= radiusKm) {
        cluster.push(reports[j]);
        visited[j] = true; // mutate state as we go
      }
    }

    let latSum = 0;
    let lonSum = 0;
    for (let k = 0; k < cluster.length; k++) {
      latSum += cluster[k].lat;
      lonSum += cluster[k].lon;
    }

    merged.push({
      activityType: cluster[0].activityType,
      corroborations: cluster.length,
      lat: latSum / cluster.length,
      lon: lonSum / cluster.length,
      memberIds: cluster.map((r) => r.id),
    });
  }

  return merged;
}

function main() {
  const allReports = loadReports();
  console.log(`Loaded ${allReports.length} reports.\n`);

  console.log(`--- Step 1: nearby filter (center=${SEARCH_CENTER.lat},${SEARCH_CENTER.lon}, radius=${SEARCH_RADIUS_KM}km) ---`);
  const nearby = findNearby(allReports, SEARCH_CENTER, SEARCH_RADIUS_KM);
  for (let i = 0; i < nearby.length; i++) {
    const r = nearby[i];
    console.log(`  #${r.id} ${r.activityType} - ${r.distanceKm.toFixed(3)}km away`);
  }
  const excluded = allReports.length - nearby.length;
  console.log(`  -> ${nearby.length}/${allReports.length} reports within radius (${excluded} excluded)\n`);

  console.log(`--- Step 2: corroboration (radius=${CORROBORATION_RADIUS_KM}km, over ALL reports) ---`);
  const clusters = corroborate(allReports, CORROBORATION_RADIUS_KM);
  for (let i = 0; i < clusters.length; i++) {
    const c = clusters[i];
    console.log(`  ${c.activityType}: ${c.corroborations} corroborating report(s) [ids ${c.memberIds.join(", ")}]`);
  }
  console.log(`  -> ${allReports.length} raw reports merged into ${clusters.length} corroborated entries\n`);
}

main();
