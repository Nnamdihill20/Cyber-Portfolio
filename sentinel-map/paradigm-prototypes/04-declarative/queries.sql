-- Prototype 4 - DECLARATIVE - queries
--
-- Each query below states WHAT result is wanted (which rows, grouped and
-- aggregated how) and leaves HOW to produce it - which rows to scan, which
-- order to join in, how to execute the GROUP BY - entirely to SQLite's
-- query planner. There is no loop, no accumulator variable, and no
-- "visited" flag anywhere in this file: compare that to 01-imperative's
-- explicit `visited` array doing the same job by hand.
--
-- `haversine_km(lat1, lon1, lat2, lon2)` is the one necessarily procedural
-- ingredient (SQL has no built-in trigonometry) - it is registered as a
-- scalar function by run_declarative_prototype.py and then used here
-- exactly like any built-in SQL function (ABS, ROUND, ...). Its presence
-- does not make the queries themselves imperative: nothing here says *when*
-- or *how often* to call it, or in what order to visit rows - that is still
-- entirely up to the planner.

-- query: nearby
-- States: "every report whose distance from the given center is within
-- the given radius, nearest first." Nothing here describes the scan order,
-- an index, or a loop - SQLite decides how to satisfy the WHERE and
-- ORDER BY clauses.
SELECT
  id,
  activity_type,
  lat,
  lon,
  haversine_km(lat, lon, :center_lat, :center_lon) AS distance_km
FROM reports
WHERE haversine_km(lat, lon, :center_lat, :center_lon) <= :radius_km
ORDER BY distance_km ASC;

-- query: corroboration
-- States: "cluster reports of the same activity_type that are mutually
-- within the corroboration radius of each other, and summarize each
-- cluster." The self-join declares the *relationship* a cluster is built
-- from (same type, within radius); GROUP BY and the aggregate functions
-- declare the summary wanted. No code here walks the rows in a particular
-- order to build the clusters by hand.
--
-- Limitation (see COMPARISON.md): a report's cluster "representative" is
-- the smallest id among everything mutually within radius of it. That is
-- correct whenever a true cluster is a clique (every member within radius
-- of every other member, true of this fixture's clusters) but does not
-- perform full transitive connected-component clustering for a chained
-- case (A-B in range, B-C in range, A-C not) without a recursive CTE.
WITH pairs AS (
  SELECT
    a.id AS report_id,
    b.id AS neighbor_id
  FROM reports a
  JOIN reports b
    ON a.activity_type = b.activity_type
   AND haversine_km(a.lat, a.lon, b.lat, b.lon) <= :corroboration_radius_km
),
clusters AS (
  SELECT report_id, MIN(neighbor_id) AS cluster_id
  FROM pairs
  GROUP BY report_id
)
SELECT
  r.activity_type,
  COUNT(*) AS corroborations,
  GROUP_CONCAT(r.id) AS member_ids,
  AVG(r.lat) AS centroid_lat,
  AVG(r.lon) AS centroid_lon,
  MIN(r.reported_at) AS first_reported_at
FROM clusters c
JOIN reports r ON r.id = c.report_id
GROUP BY c.cluster_id, r.activity_type
ORDER BY corroborations DESC, c.cluster_id ASC;
