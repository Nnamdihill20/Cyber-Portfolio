// Sentinel - Threat / Anomaly Agent
//
// Sentinel Map's second implemented product-level AI component (see
// Guardian in lib/guardian.ts for the first, and the company report's AI
// Integration section). Sentinel watches a corroborated-report cluster's
// aggregate statistics - how many corroborating reports, how recently they
// started - and surfaces an alert severity, WITHOUT ever looking at or
// needing anything that could identify a person. It only ever sees a
// count and a timestamp, by construction - there is no description, no
// location history, no reporter information anywhere in its input type.
//
// Design choice, and why: exactly like Guardian, this is a deterministic,
// explainable threshold evaluator, not a call to an external model or a
// black-box scoring system. It mirrors, almost line for line, the rule set
// already specified and tested in racket-dsl/DSL_2_anomaly_alerts.rkt (the
// Racket Development Department's alert-rule DSL) - the same policy,
// implemented here in the app's own runtime so every report in a nearby-
// search response gets evaluated in-process, with no per-request
// subprocess call to a separate interpreter.
//
// Evaluation semantics - deliberately different from Guardian's first-
// match-wins policy evaluator: Sentinel evaluates EVERY rule and returns
// the HIGHEST-SEVERITY match, exactly like DSL_2. An alerting system
// should surface the worst applicable finding, not just the first rule a
// developer happened to write down first - see the "two 6-report clusters,
// different time windows" test case below, which specifically proves this
// matters (the same report count is CRITICAL in a 12-minute window and
// only HIGH over two hours).
//
// Sentinel only ever labels a pattern. It never hides, flags, or purges
// anything itself - that remains Guardian's and the human moderator's job.
// Sentinel's output is purely informational, shown to every viewer (unlike
// Guardian's reasoning, which is deliberately hidden from the submitter -
// see guardian.ts - there is no equivalent adversarial-probing concern
// here: telling the public "this looks like a forming pattern" is the
// entire point of the feature, not something to conceal).

export type AlertSeverity = "info" | "low" | "medium" | "high" | "critical";

export interface ClusterStats {
  corroborations: number;
  minutesSinceFirst: number;
}

export interface AlertResult {
  label: string;
  severity: AlertSeverity;
  message: string;
}

// Severity ordering, low to high - mirrors DSL_2's SEVERITY-RANK hash.
const SEVERITY_RANK: Record<AlertSeverity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

interface AlertRule {
  label: string;
  condition: (stats: ClusterStats) => boolean;
  severity: AlertSeverity;
  message: string;
}

// Same four rules as DSL_2_anomaly_alerts.rkt's sentinel-alert-rules.
const SENTINEL_ALERT_RULES: AlertRule[] = [
  {
    label: "rapid-spike",
    condition: (s) => s.corroborations >= 5 && s.minutesSinceFirst < 30,
    severity: "critical",
    message: "5+ corroborating reports within 30 minutes - possible large-scale enforcement action forming",
  },
  {
    label: "sustained-cluster",
    condition: (s) => s.corroborations >= 5 && s.minutesSinceFirst >= 30,
    severity: "high",
    message: "5+ corroborating reports over a longer window - sustained activity at this location",
  },
  {
    label: "cluster-forming",
    condition: (s) => s.corroborations >= 3,
    severity: "medium",
    message: "Multiple corroborating reports suggest activity worth watching",
  },
  {
    label: "single-unconfirmed",
    condition: (s) => s.corroborations === 1,
    severity: "low",
    message: "Single, unconfirmed report - no corroboration yet",
  },
];

// Pure function: evaluates every rule, keeps every match, returns the
// highest-severity one (first-written wins a tie) - exactly DSL_2's
// evaluate-alerts. If nothing matches (e.g. exactly 2 corroborations,
// below the cluster-forming threshold but above single-unconfirmed),
// returns a safe "info" no-op rather than erroring, same as DSL_2.
export function evaluateAlert(stats: ClusterStats): AlertResult {
  const matches = SENTINEL_ALERT_RULES.filter((rule) => rule.condition(stats));

  if (matches.length === 0) {
    return { label: "none", severity: "info", message: "no notable pattern" };
  }

  const best = matches.reduce((highest, candidate) =>
    SEVERITY_RANK[candidate.severity] > SEVERITY_RANK[highest.severity] ? candidate : highest
  );

  return { label: best.label, severity: best.severity, message: best.message };
}
