"""Prototype 4 - DECLARATIVE - runner.

This file is deliberately thin: it loads the fixture, registers the one
scalar function SQL has no native equivalent for (haversine distance), and
prints whatever the two declared queries in queries.sql return. It contains
no business logic of its own - no loop that decides which reports are
"nearby", no loop that decides which reports corroborate each other. All of
that is declared in queries.sql; this script only plumbs data in and prints
results out.
"""

import json
import math
import sqlite3
from pathlib import Path

HERE = Path(__file__).resolve().parent
SHARED_DIR = HERE.parent / "shared"

SEARCH_CENTER = {"lat": 41.8781, "lon": -87.6298}
SEARCH_RADIUS_KM = 5
CORROBORATION_RADIUS_KM = 0.15  # 150m - same constant the real API uses

EARTH_RADIUS_KM = 6371


def haversine_km(lat1, lon1, lat2, lon2):
    """The one necessarily procedural ingredient - registered as a SQL
    scalar function below, then used declaratively like any other SQL
    function. See the note at the top of queries.sql."""
    p1, p2 = math.radians(lat1), math.radians(lat2)
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = math.sin(d_lat / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(d_lon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return EARTH_RADIUS_KM * c


def load_queries():
    text = (HERE / "queries.sql").read_text()
    # Split on the "-- query: <name>" markers so each named query can be
    # run independently with its own parameters.
    parts = {}
    current_name = None
    current_lines = []
    for line in text.splitlines():
        if line.strip().startswith("-- query:"):
            if current_name:
                parts[current_name] = "\n".join(current_lines).strip()
            current_name = line.split(":", 1)[1].strip()
            current_lines = []
        else:
            current_lines.append(line)
    if current_name:
        parts[current_name] = "\n".join(current_lines).strip()
    return parts


def main():
    con = sqlite3.connect(":memory:")
    con.row_factory = sqlite3.Row
    con.create_function("haversine_km", 4, haversine_km)

    schema_sql = (HERE / "schema.sql").read_text()
    con.executescript(schema_sql)

    reports = json.loads((SHARED_DIR / "sample_reports.json").read_text())
    con.executemany(
        "INSERT INTO reports (id, activity_type, lat, lon, reported_at) VALUES (:id, :activityType, :lat, :lon, :reportedAt)",
        reports,
    )
    con.commit()

    total = con.execute("SELECT COUNT(*) FROM reports").fetchone()[0]
    print(f"Loaded {total} reports.\n")

    queries = load_queries()

    print(
        f"--- Step 1: nearby filter (center={SEARCH_CENTER['lat']},{SEARCH_CENTER['lon']}, radius={SEARCH_RADIUS_KM}km) ---"
    )
    nearby_rows = con.execute(
        queries["nearby"],
        {"center_lat": SEARCH_CENTER["lat"], "center_lon": SEARCH_CENTER["lon"], "radius_km": SEARCH_RADIUS_KM},
    ).fetchall()
    for row in nearby_rows:
        print(f"  #{row['id']} {row['activity_type']} - {row['distance_km']:.3f}km away")
    print(f"  -> {len(nearby_rows)}/{total} reports within radius ({total - len(nearby_rows)} excluded)\n")

    print(f"--- Step 2: corroboration (radius={CORROBORATION_RADIUS_KM}km, over ALL reports) ---")
    cluster_rows = con.execute(
        queries["corroboration"], {"corroboration_radius_km": CORROBORATION_RADIUS_KM}
    ).fetchall()
    for row in cluster_rows:
        print(f"  {row['activity_type']}: {row['corroborations']} corroborating report(s) [ids {row['member_ids']}]")
    print(f"  -> {total} raw reports merged into {len(cluster_rows)} corroborated entries\n")

    con.close()


if __name__ == "__main__":
    main()
