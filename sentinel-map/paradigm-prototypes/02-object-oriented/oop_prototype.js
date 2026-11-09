// Prototype 2 — OBJECT-ORIENTED
//
// Paradigm evidence: two collaborating classes with encapsulated state
// (private fields, `#`), each owning its own responsibility - a Report
// knows how to measure its own distance to another point; a ReportBook
// knows how to manage a collection of Reports and expose a clean public API
// (findNearby / corroborate) without exposing its internal array. Callers
// never touch a report's or the book's private data directly.
//
// Problem solved: see ../README.md. Same input fixture, same two steps
// (nearby filter, then corroboration), as every other prototype.

const fs = require("fs");
const path = require("path");

const EARTH_RADIUS_KM = 6371;

class Report {
  #id;
  #activityType;
  #lat;
  #lon;
  #reportedAt;

  constructor({ id, activityType, lat, lon, reportedAt }) {
    this.#id = id;
    this.#activityType = activityType;
    this.#lat = lat;
    this.#lon = lon;
    this.#reportedAt = reportedAt;
  }

  // Public accessors - the private fields above can't be reassigned from
  // outside the class, only read through these.
  get id() { return this.#id; }
  get activityType() { return this.#activityType; }
  get lat() { return this.#lat; }
  get lon() { return this.#lon; }
  get reportedAt() { return this.#reportedAt; }

  // A Report is responsible for knowing how far away it is from a point -
  // that responsibility belongs on the object that owns the coordinates,
  // not on some free-floating utility function.
  distanceKmTo(lat, lon) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat - this.#lat);
    const dLon = toRad(lon - this.#lon);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(this.#lat)) * Math.cos(toRad(lat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_KM * c;
  }

  sameTypeAs(other) {
    return this.#activityType === other.activityType;
  }
}

// A CorroboratedCluster is its own small object, not just a plain literal -
// it owns the logic for how a new member changes its aggregate state.
class CorroboratedCluster {
  #activityType;
  #members;

  constructor(firstReport) {
    this.#activityType = firstReport.activityType;
    this.#members = [firstReport];
  }

  add(report) {
    this.#members.push(report);
  }

  get corroborations() {
    return this.#members.length;
  }

  get memberIds() {
    return this.#members.map((r) => r.id);
  }

  get centroid() {
    const latSum = this.#members.reduce((sum, r) => sum + r.lat, 0);
    const lonSum = this.#members.reduce((sum, r) => sum + r.lon, 0);
    return { lat: latSum / this.#members.length, lon: lonSum / this.#members.length };
  }

  toString() {
    return `${this.#activityType}: ${this.corroborations} corroborating report(s) [ids ${this.memberIds.join(", ")}]`;
  }
}

// ReportBook owns the collection and exposes only the two operations
// callers actually need - its internal array is never handed out directly.
class ReportBook {
  #reports;

  constructor() {
    this.#reports = [];
  }

  static fromFixture(filePath) {
    const raw = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(raw);
    const book = new ReportBook();
    for (const entry of data) {
      book.#reports.push(new Report(entry));
    }
    return book;
  }

  get size() {
    return this.#reports.length;
  }

  findNearby(centerLat, centerLon, radiusKm) {
    return this.#reports
      .map((report) => ({ report, distanceKm: report.distanceKmTo(centerLat, centerLon) }))
      .filter((entry) => entry.distanceKm <= radiusKm);
  }

  corroborate(radiusKm) {
    const clusters = [];
    const claimed = new Set();

    for (const report of this.#reports) {
      if (claimed.has(report.id)) continue;

      const cluster = new CorroboratedCluster(report);
      claimed.add(report.id);

      for (const candidate of this.#reports) {
        if (claimed.has(candidate.id)) continue;
        if (!report.sameTypeAs(candidate)) continue;
        if (report.distanceKmTo(candidate.lat, candidate.lon) <= radiusKm) {
          cluster.add(candidate);
          claimed.add(candidate.id);
        }
      }

      clusters.push(cluster);
    }

    return clusters;
  }
}

function main() {
  const SEARCH_CENTER = { lat: 41.8781, lon: -87.6298 };
  const SEARCH_RADIUS_KM = 5;
  const CORROBORATION_RADIUS_KM = 0.15;

  const fixturePath = path.join(__dirname, "..", "shared", "sample_reports.json");
  const book = ReportBook.fromFixture(fixturePath);
  console.log(`Loaded ${book.size} reports.\n`);

  console.log(`--- Step 1: nearby filter (center=${SEARCH_CENTER.lat},${SEARCH_CENTER.lon}, radius=${SEARCH_RADIUS_KM}km) ---`);
  const nearby = book.findNearby(SEARCH_CENTER.lat, SEARCH_CENTER.lon, SEARCH_RADIUS_KM);
  for (const { report, distanceKm } of nearby) {
    console.log(`  #${report.id} ${report.activityType} - ${distanceKm.toFixed(3)}km away`);
  }
  console.log(`  -> ${nearby.length}/${book.size} reports within radius (${book.size - nearby.length} excluded)\n`);

  console.log(`--- Step 2: corroboration (radius=${CORROBORATION_RADIUS_KM}km, over ALL reports) ---`);
  const clusters = book.corroborate(CORROBORATION_RADIUS_KM);
  for (const cluster of clusters) {
    console.log(`  ${cluster.toString()}`);
  }
  console.log(`  -> ${book.size} raw reports merged into ${clusters.length} corroborated entries\n`);
}

main();
