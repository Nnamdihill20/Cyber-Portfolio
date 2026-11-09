# Four-Paradigm Prototype Comparison

All four prototypes solve the identical problem (see `README.md`) against the
identical fixture (`shared/sample_reports.json`) and — run independently —
produce the same clusters and the same excluded out-of-radius report. That
agreement across three languages and four paradigms is itself part of the
testing evidence: it is strong signal that the result is correct, not an
artifact of one implementation's bug repeated four times.

| Criterion | Imperative | Object-Oriented | Functional | Declarative |
|---|---|---|---|---|
| **Program Structure** | Two top-level functions; sequential steps inside `for` loops | Two classes (`Report`, `ReportBook`) plus a small `CorroboratedCluster` value type; behavior attached to the data it owns | A pipeline of small pure functions composed via `map`/`filter`/`reduce`, plus one recursive function | Two declarative SQL queries over one table; a three-line Python shim to wire data in and print results out |
| **State Management** | Explicit, mutated in place (`visited` array, accumulator arrays reassigned via `push`) | Encapsulated and private (`#` fields); mutated only from inside the owning class's own methods | None — every function returns a new value; no variable is ever reassigned after its `const` declaration | None in application code — SQLite's query execution owns whatever intermediate state a `JOIN`/`GROUP BY` needs internally |
| **Readability** | High for a reader used to step-by-step procedural code; the exact sequence of operations is visible top to bottom | High once the class responsibilities are understood; lower for a reader unfamiliar with where state actually lives across two classes | Moderate — requires comfort with `reduce`-building-two-arrays and recursion instead of a loop, but each function is small and nameable | High for *what* is being asked ("reports within radius, nearest first"); lower for *why* a given query performs well, since that logic is implicit in the engine |
| **Maintainability** | Moderate — adding a new rule means carefully threading another condition through existing loops without breaking the `visited` bookkeeping | High — a new rule usually becomes a new method on the class that should own it, without touching unrelated code | High — a new pipeline step is usually one more `.map()`/`.filter()` inserted into the chain, each independently testable | High for changing *what* is asked (edit a `WHERE`/`GROUP BY`); low for changing *how* it is computed, since that is delegated entirely to the engine |
| **Main Advantage** | Full, explicit control over execution order and cost | Encapsulation makes invalid external mutation structurally impossible | Every function is independently testable and provably side-effect-free | The intent is stated directly, in far less code, with no hand-maintained state to get out of sync |
| **Main Limitation** | Correctness depends on the programmer manually keeping every mutable flag/accumulator consistent | More structural ceremony (two extra types) than the problem strictly requires at this scale | More allocation (new arrays at every step) than an in-place approach, as data volume grows | True transitive clustering (a chained case, not a clique) needs a different approach — see `04-declarative/TEST_EVIDENCE.md` |

## Where this shows up in the real Sentinel Map application

This comparison is not an abstract exercise — see the Four-Paradigm
Integration Matrix in the company report: the real API genuinely does mix
all four of these styles for closely related reasons. Request handling and
rate limiting in `packages/api/src/routes/reports.ts` is Imperative for the
same reason Prototype 1 is (explicit, auditable control flow over a
security-sensitive sequence of checks). The Prisma models are
Object-Oriented for the same reason Prototype 2 is (encapsulating a domain
entity's fields and constraints). `lib/geo.ts`'s `haversineKm` and
`lib/validation.ts`'s zod schemas are Functional for the same reason
Prototype 3 is (pure, independently testable, safe to call from both the
client and the server). And the actual nearby/corroboration query the real
API runs against Postgres is Declarative for the same reason Prototype 4 is
(state what's wanted, let the database decide how).
