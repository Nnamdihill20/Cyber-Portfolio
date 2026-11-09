# Sentinel Map — Four Paradigm Prototypes

Required by Step 6 (Requirement A) of the CMPSC 460 company project: four small,
independent proof-of-concept programs — not four complete applications — that
each solve the **same problem** using a different required programming
paradigm, so the paradigms can be fairly compared before being integrated into
the final web application (see `../docs/` and the company report for how each
paradigm actually shows up inside the shipped app).

## The shared problem

**Nearby Activity Report Corroboration** — a reduced version of the real
logic in `packages/api/src/routes/reports.ts` and `packages/api/src/lib/geo.ts`:

1. **Nearby filter** — given a list of anonymous activity reports (latitude,
   longitude, activity type, timestamp) and a viewer's center point + search
   radius, return only the reports within that radius.
2. **Corroboration** — given the full list of reports, group reports of the
   **same activity type** that are mutually within **150 m** of each other
   (the same `CORROBORATION_RADIUS_KM = 0.15` constant the real API uses)
   into a single corroborated entry with a count, instead of showing
   duplicates.

All four prototypes read the same fixture, `shared/sample_reports.json` (10
reports: one 4-report CHECKPOINT cluster near the search center, one 2-report
OTHER cluster further away, two reports that sit almost on top of each other
but have *different* types and must **not** corroborate, two isolated
PATROL_PRESENCE/RAID_REPORTED reports, and one CHECKPOINT report ~27 km away
that the nearby filter must exclude). Search center: `(41.8781, -87.6298)`
(the same Chicago fallback coordinate the real web app starts at), search
radius: `5 km`.

Every prototype prints its own test output when run — see each folder's
`TEST_EVIDENCE.md` for what a correct run looks like and why it's correct.

## Running each prototype

```bash
# 1. Imperative — explicit state, loops, conditionals
node 01-imperative/imperative_prototype.js

# 2. Object-Oriented — classes, encapsulation, collaborating objects
node 02-object-oriented/oop_prototype.js

# 3. Functional — pure functions, map/filter/reduce, no mutation
node 03-functional/functional_prototype.js

# 4. Declarative — SQL states "what", not "how"
python3 04-declarative/run_declarative_prototype.py
```

No build step or external dependencies are required beyond Node.js (18+) and
Python 3 (both already used elsewhere in this project).

## Comparison

See `COMPARISON.md` for the required four-paradigm comparison table
(Requirement B) and the advantage/limitation of each approach.
