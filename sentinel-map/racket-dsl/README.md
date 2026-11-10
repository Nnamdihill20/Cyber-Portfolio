# Sentinel Map — Racket DSLs

Required by Step 6 (Requirement F) of the CMPSC 460 company project, owned
by the **Racket Development Department** and built by **AI Agent #2 (DSL
Racket Builder)** under CEO/Software Architect review (see the company
report's Organizational Structure section).

Two small, independent DSLs, each built the same way — a couple of
`define-syntax-rule` macros giving a fixed, readable surface syntax over a
struct-based rule representation, plus a dedicated evaluator function — but
with deliberately different evaluation semantics, so the pair demonstrates
two genuinely different (and equally legitimate) rule-engine designs rather
than the same idea renamed twice.

## DSL #1 — `DSL_1_moderation_policy.rkt` — Moderation Policy Language

**Problem it solves**: `docs/LEGAL.md`'s hard scope boundary — Sentinel Map
maps places and events, never people — has to be enforced on every incoming
anonymous activity report. This is the rule language the company report's
"Guardian" content-safety agent is meant to run.

**Surface syntax**: `(rule "label" (s) condition-expr action-expr)` inside
`(define-policy name rule ...)`.

**Evaluation semantics**: **first match wins**, in the order rules are
written — a firewall-ruleset style, so a policy author controls precedence
just by ordering the rules.

```bash
racket DSL_1_moderation_policy.rkt   # runs 5 example submissions through the real policy
raco test DSL_1_moderation_policy.rkt   # 6 rackunit tests
```

## DSL #2 — `DSL_2_anomaly_alerts.rkt` — Anomaly Alert Rule Language

**Problem it solves**: the company report's "Sentinel" threat/anomaly agent
watches corroborated-report cluster statistics (count and timing only —
never anything identifying) for suspicious patterns and has to decide how
urgent an alert is.

**Surface syntax**: `(alert "label" (s) condition-expr severity message)`
inside `(define-alert-rules name alert ...)`.

**Evaluation semantics**: **highest severity wins** — every rule is
evaluated, every match is kept, and the single most severe match is
returned (rule order is only a tie-breaker). This is the deliberate
difference from DSL #1: an alerting system should surface the worst
applicable finding, not just the first rule a developer happened to write
down first — the test suite's `highest-severity-wins` case specifically
proves a `cluster-forming` match loses to a `rapid-spike` match on the same
input, which a naive first-match evaluator would get wrong.

```bash
racket DSL_2_anomaly_alerts.rkt   # runs 5 example cluster-stat scenarios
raco test DSL_2_anomaly_alerts.rkt   # 7 rackunit tests
```

## Requirements

Racket 8.10+ (CS variant). No packages beyond the ones that ship with a
standard Racket install (`racket`, `rackunit`, `racket/list`).

## How these relate to the rest of the company project

- Both files are real, runnable `.rkt` DSLs — not pseudocode — verified
  with `racket` (demonstration output), `raco test` (automated rackunit
  assertions, 13 total across the two files), and `raco make` (clean
  byte-compile, no warnings).
- Both reuse patterns already decided elsewhere in this project: DSL #1's
  policy is literally an executable version of the scope boundary in
  `docs/LEGAL.md`; DSL #2's cluster-stats input matches the corroboration
  model in `packages/api/src/routes/reports.ts`.
- Neither DSL is wired into the running web application yet — like the
  Sentinel/Guardian/Oracle/Forge agents in the company report, they are a
  real, tested specification of the rule language those agents would run,
  not yet a live integration. That remaining gap is tracked in the company
  report's Known Gaps & Submission Checklist.
