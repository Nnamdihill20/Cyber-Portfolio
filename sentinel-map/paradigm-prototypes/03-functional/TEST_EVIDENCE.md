# Prototype 3 — Functional — Test Evidence

## How the paradigm is represented

- **Pure functions**: `haversineKm`, `findNearby`, `corroborate`, `centroidOf`, and `toClusterSummary` never read or write anything outside their own arguments and return value — calling any of them twice with the same input is guaranteed to produce the same output (see the "Purity check" in the captured output below).
- **No mutation**: `reduce` builds `{ matched, unmatched }` by returning new arrays (`[...acc.matched, candidate]`) rather than pushing onto an existing one; `findNearby` is a `.map().filter()` chain, not a loop with an accumulator. `allReports` is never reassigned or modified by either step.
- **Higher-order functions**: `map`, `filter`, and `reduce` — functions that take other functions as arguments — do the iteration, instead of hand-written `for` loops.
- **Recursion in place of looping with mutable state**: `corroborate` has no `visited` array (contrast with Prototype 1). Instead it recurses on `unmatched`, a strictly smaller array each call, until there's nothing left to cluster.

## How to run it

```bash
node 03-functional/functional_prototype.js
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

--- Purity check ---
  haversineKm called twice with identical args: 0.013863197260114906 === 0.013863197260114906 -> true
  allReports still has 10 entries (unmutated by either step)
```

**Correctness check**: output is identical in substance to Prototype 1 (Imperative) and Prototype 2 (Object-Oriented) on the same fixture. The purity check is itself evidence specific to this paradigm — proving `haversineKm` is referentially transparent and that the input array survived both steps unmutated.

## Advantage

Because every function is pure, each one is independently testable and reasoned about in isolation — `haversineKm` can be unit-tested with no setup, no mock objects, and no concern about what state the rest of the program is in, unlike Prototype 1's loop-embedded distance calculation.

## Limitation

The immutable, spread-heavy style (`[...acc.matched, candidate]` inside `reduce`) allocates a new array on every iteration rather than mutating one in place; at this fixture's scale (10 reports) that's irrelevant, but on a much larger report volume it would do measurably more allocation and garbage-collection work than Prototype 1's in-place `push`.
