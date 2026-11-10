# Prototype 2 — Object-Oriented — Test Evidence

## How the paradigm is represented

- **Classes with encapsulated state**: `Report`'s fields (`#id`, `#lat`, `#lon`, ...) and `ReportBook`'s `#reports` array are private (`#`) — nothing outside the class can read or mutate them directly, only through the methods/getters the class chooses to expose.
- **Responsibility placed on the object that owns the data**: a `Report` knows how to compute its own distance to a point (`distanceKmTo`) and compare its own type (`sameTypeAs`) — that logic lives with the coordinates it operates on, not in a separate free function.
- **Collaborating objects**: `ReportBook` doesn't duplicate distance math — it *delegates* to `Report.distanceKmTo` and `CorroboratedCluster` for the pieces each class already owns. This has-a/delegates-to relationship is the core OOP structure here.
- **Abstraction**: callers of `ReportBook` call `findNearby(...)` and `corroborate(...)` without knowing or caring that the data is stored in a private array — the public API is the entire contract.

## How to run it

```bash
node 02-object-oriented/oop_prototype.js
```

## Captured output (actual run, unedited)

```
Loaded 10 reports.

--- Step 1: nearby filter (center=41.8781,-87.6298, radius=5km) ---
  #1 CHECKPOINT - 0.000km away
  #2 CHECKPOINT - 0.014km away
  #3 CHECKPOINT - 0.014km away
  #10 CHECKPOINT - 0.007km away
  #4 PATROL_PRESENCE - 0.611km away
  #5 RAID_REPORTED - 0.625km away
  #9 PATROL_PRESENCE - 0.051km away
  #6 OTHER - 2.954km away
  #7 OTHER - 2.956km away
  -> 9/10 reports within radius (1 excluded)

--- Step 2: corroboration (radius=0.15km, over ALL reports) ---
  CHECKPOINT: 4 corroborating report(s) [ids 1, 2, 3, 10]
  PATROL_PRESENCE: 1 corroborating report(s) [ids 4]
  RAID_REPORTED: 1 corroborating report(s) [ids 5]
  PATROL_PRESENCE: 1 corroborating report(s) [ids 9]
  OTHER: 2 corroborating report(s) [ids 6, 7]
  CHECKPOINT: 1 corroborating report(s) [ids 8]
  -> 10 raw reports merged into 6 corroborated entries
```

**Correctness check**: output is identical in substance to Prototype 1 (Imperative) and Prototype 3 (Functional) on the same fixture — three independent implementations agreeing is stronger evidence of correctness than any single one passing its own tests.

## Advantage

The public/private boundary (`#` fields) makes it structurally impossible for calling code to corrupt a `Report`'s or `ReportBook`'s internal state by accident — contrast with Prototype 1, where `visited` and the accumulator arrays are just local variables a later maintainer could misuse if the function grew.

## Limitation

The extra structure (two classes, getters, a dedicated `CorroboratedCluster` type) is more ceremony than the problem strictly needs at this small scale — Prototype 3 solves the identical problem in less code by not needing object identity or encapsulation at all.
