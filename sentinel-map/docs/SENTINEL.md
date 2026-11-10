# Sentinel — the threat/anomaly agent

Sentinel Map's second implemented product-level AI component (see
`docs/GUARDIAN.md` for the first, and the company report's Artificial
Intelligence Integration section). Sentinel watches a corroborated-report
cluster's aggregate statistics and labels how notable the pattern is, in
`src/lib/sentinel.ts`.

## What it does

`evaluateAlert({ corroborations, minutesSinceFirst })` runs four threshold
rules and returns the single highest-severity match:

| Rule | Condition | Severity |
|---|---|---|
| `rapid-spike` | 5+ corroborations within 30 minutes | critical |
| `sustained-cluster` | 5+ corroborations, 30+ minutes | high |
| `cluster-forming` | 3+ corroborations | medium |
| `single-unconfirmed` | exactly 1 corroboration | low |
| (no rule matches, e.g. exactly 2) | — | info |

That's it. Sentinel's input type has no field for a description, a
reporter, or anything else that could identify a person — only a count and
an elapsed time, by construction. It only ever labels a pattern; it never
hides, flags, or changes anything (that stays Guardian's and a human
moderator's job).

## Why evaluate-all-and-take-the-highest, not first-match-wins

This is the deliberate difference from Guardian's policy evaluator (see
`docs/GUARDIAN.md`), and it mirrors
`racket-dsl/DSL_2_anomaly_alerts.rkt`'s evaluation semantics exactly: an
alerting system should surface the *worst* applicable finding, not just
whichever rule happens to be written first. The same 5-report count is
**critical** if it formed in 12 minutes and only **high** if it took 2
hours — a first-match evaluator checking rules in the wrong order could
get that backwards. `sentinel.test.ts` specifically tests this case.

## Where it's wired in

`routes/reports.ts`'s shared `toPublicReport()` helper calls
`computeAlert()` on every report before it goes out — so `GET
/reports/nearby`, the corroboration-merge response, the brand-new-report
response, and the flag-confirmation response all carry the same
`alertSeverity`/`alertMessage` fields consistently. `minutesSinceFirst` is
computed from the report's `createdAt` (the time the cluster was first
seen, not the most recent corroboration), matching
`CORROBORATION_RADIUS_KM`'s existing semantics.

Unlike Guardian's reasoning, there is no reason to hide this from the
submitter or the public: "this looks like a forming pattern" is the
feature, not a tell to conceal. The honeypot's fake response (see
`routes/reports.ts`) carries matching `alertSeverity`/`alertMessage` values
for the same reason every other field there does — a bot diffing response
shapes must never be able to tell a fake success from a real one.

## What it looks like

A report pin's fill color still encodes `activityType` (see
`layerStyles.ts`'s `ACTIVITY_COLORS`, unchanged) — Sentinel's severity
renders as the pin's **stroke**, layered on top: wider and redder as
severity climbs (`ALERT_SEVERITY_STROKE` in `layerStyles.ts`). The popup
only shows an explicit alert line at medium severity or above, so a
routine single, unconfirmed report's popup isn't cluttered with a
"no notable pattern" message every time.

Verified live end-to-end against a running Postgres-backed API: five real
submissions to the same spot escalated `alertSeverity` from `low` →
`info` → `medium` → `medium` → `critical` exactly as the rule table above
predicts, and a Playwright screenshot confirms the critical cluster's pin
renders a visibly thicker red stroke with the matching red "⚠ CRITICAL"
line in its popup.

## Known limitations

- **Thresholds are fixed, not learned or tunable per deployment.** 3/5
  corroborations and a 30-minute window are reasonable starting points,
  not validated against real report volume at any real deployment's scale.
- **No decay or geographic correlation across distinct clusters.** Five
  *unrelated* single-report clusters springing up across a wide area
  wouldn't trigger anything — Sentinel only looks at one cluster's own
  count and age, never cross-cluster patterns. That's a deliberately
  separate, harder problem for a future agent, not something this version
  claims to solve.
- **`minutesSinceFirst` is wall-clock time since first report, not a
  rolling window.** A cluster that formed slowly and then goes quiet still
  reads as "sustained," not "ended," until its reports expire.
