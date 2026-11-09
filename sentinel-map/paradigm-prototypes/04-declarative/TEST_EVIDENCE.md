# Prototype 4 — Declarative — Test Evidence

## How the paradigm is represented

- **States what, not how**: `queries.sql`'s two queries each describe the *shape of the desired result* (rows within a radius, ordered nearest-first; clusters of same-type reports mutually within a radius, summarized) with no loop, no accumulator variable, and no explicit iteration order written anywhere.
- **The engine decides execution**: SQLite's query planner — not this project's code — decides how to scan `reports`, how to perform the self-join in `corroboration`, and how to execute the `GROUP BY`. Changing the database engine would change *how* these queries run without changing *what* they declare.
- **Relationships over procedures**: the corroboration query declares a *relationship* ("same activity_type AND within radius") via a `JOIN ... ON`, and a *grouping* via `GROUP BY` — compare this to Prototype 1's explicit nested nested `for` loops and hand-maintained `visited` array doing the identical job procedurally.
- **The one necessary procedural piece is isolated and named as an exception**: SQL has no built-in trigonometry, so `haversine_km` is registered once as a scalar function (`run_declarative_prototype.py`) and then used exactly like a built-in SQL function (`ABS`, `ROUND`) inside otherwise fully declarative queries.

## How to run it

```bash
python3 04-declarative/run_declarative_prototype.py
```

## Captured output (actual run, unedited)

```
Loaded 10 reports.

--- Step 1: nearby filter (center=41.8781,-87.6298, radius=5km) ---
  #1 CHECKPOINT - 0.000km away
  #10 CHECKPOINT - 0.007km away
  #2 CHECKPOINT - 0.014km away
  #3 CHECKPOINT - 0.014km away
  #9 PATROL_PRESENCE - 0.051km away
  #4 PATROL_PRESENCE - 0.611km away
  #5 RAID_REPORTED - 0.625km away
  #6 OTHER - 2.954km away
  #7 OTHER - 2.956km away
  -> 9/10 reports within radius (1 excluded)

--- Step 2: corroboration (radius=0.15km, over ALL reports) ---
  CHECKPOINT: 4 corroborating report(s) [ids 1,2,3,10]
  OTHER: 2 corroborating report(s) [ids 6,7]
  PATROL_PRESENCE: 1 corroborating report(s) [ids 4]
  RAID_REPORTED: 1 corroborating report(s) [ids 5]
  CHECKPOINT: 1 corroborating report(s) [ids 8]
  PATROL_PRESENCE: 1 corroborating report(s) [ids 9]
  -> 10 raw reports merged into 6 corroborated entries
```

**Correctness check**: the same clusters and the same excluded report (#8) as Prototypes 1–3 — four independent implementations across three languages/paradigms agreeing on the same fixture. Row order differs (SQL's own `ORDER BY corroborations DESC` vs. the other prototypes' insertion order), which is expected and not a discrepancy.

## Advantage

The *what* (nearby, corroborating-cluster) is expressed in roughly a third the lines of Prototype 1's procedural version, and the corroboration query in particular has no hand-maintained `visited`/`claimed` state for a bug to hide in.

## Limitation

The corroboration query assigns each report to the cluster led by the smallest-id report within *its own* neighborhood — correct for this fixture's clusters, which are cliques by design (see the note in `queries.sql`), but not a full transitive connected-component clustering for a chained case (A–B in range, B–C in range, A–C not). Note that this is not unique to SQL: Prototypes 1 and 2's loop-based clustering has the same limitation — both only compare each candidate against the cluster's first-visited representative, not against every existing member — so a chained case would need a genuinely different algorithm (e.g. Union-Find, or a recursive CTE here) in any of the four paradigms, not just this one.
