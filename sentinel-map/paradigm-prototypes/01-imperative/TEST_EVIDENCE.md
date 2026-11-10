# Prototype 1 — Imperative — Test Evidence

## How the paradigm is represented

- Explicit **mutable state**: `nearby`, `merged`, and `visited` are all declared with `let`/`new Array(...).fill(...)` and mutated in place as the program runs.
- **Sequence**: steps run in a fixed, hand-written order — loop, check distance, conditionally push, repeat.
- **Loops and conditions**: `for` loops walk the report list by index; `if` statements (`if (visited[i]) continue`, `if (distance <= radiusKm)`) control what happens to each element.
- **Functions as organized procedures**, not transformations: `findNearby` and `corroborate` describe *how* to build up a result step by step, not a declared relationship between input and output.

## How to run it

```bash
node 01-imperative/imperative_prototype.js
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

**Correctness check**: report #8 (~27km away) is correctly excluded from the nearby filter; the four tight CHECKPOINT reports (#1, #2, #3, #10) correctly merge into one 4-member cluster; #4 (PATROL_PRESENCE) and #5 (RAID_REPORTED), though almost co-located, correctly stay separate because their types differ. This output is identical in substance (same clusters, same membership, same exclusion) to Prototypes 2 and 3, which independently confirms correctness rather than a shared bug.

## Advantage

Totally explicit control flow makes the exact cost and order of operations easy to reason about and tune — e.g. it's immediately visible that corroboration is an O(n²) nested scan, and exactly where a `break`/early-exit optimization could go.

## Limitation

Correctness depends on the programmer manually keeping every piece of mutable state (`visited`, accumulators) consistent at every step; it is easy to introduce an off-by-one or a forgotten state update that no type system or compiler will catch, especially as the function grows.
