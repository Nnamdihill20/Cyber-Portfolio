// Automated tests for Sentinel (see sentinel.ts). Run with:
//   npx ts-node --transpile-only src/lib/sentinel.test.ts
// Mirrors racket-dsl/DSL_2_anomaly_alerts.rkt's test module - the two
// implementations are checked against the same cases deliberately.

import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateAlert } from "./sentinel";

test("a fast, large spike is CRITICAL, not just high", () => {
  const r = evaluateAlert({ corroborations: 5, minutesSinceFirst: 10 });
  assert.equal(r.severity, "critical");
  assert.equal(r.label, "rapid-spike");
});

test("the same report count over a long window is only HIGH, not critical", () => {
  const r = evaluateAlert({ corroborations: 5, minutesSinceFirst: 90 });
  assert.equal(r.severity, "high");
  assert.equal(r.label, "sustained-cluster");
});

test("highest-severity-wins, not first-rule-wins: cluster-forming would also match a rapid-spike case, but must lose", () => {
  const r = evaluateAlert({ corroborations: 5, minutesSinceFirst: 10 });
  assert.equal(r.label, "rapid-spike");
  assert.notEqual(r.label, "cluster-forming");
});

test("a modest 3-report cluster is medium severity", () => {
  assert.equal(evaluateAlert({ corroborations: 3, minutesSinceFirst: 60 }).severity, "medium");
});

test("a single report is low severity, not silently dropped", () => {
  assert.equal(evaluateAlert({ corroborations: 1, minutesSinceFirst: 5 }).severity, "low");
});

test("exactly 2 corroborations (below every named threshold) is a safe info no-op, not an error", () => {
  const r = evaluateAlert({ corroborations: 2, minutesSinceFirst: 20 });
  assert.equal(r.severity, "info");
  assert.equal(r.label, "none");
});

test("evaluateAlert is pure: identical input always produces an equal result", () => {
  const input = { corroborations: 6, minutesSinceFirst: 15 };
  assert.deepEqual(evaluateAlert(input), evaluateAlert(input));
});

test("a very large, very fast spike is still just critical (no higher tier exists)", () => {
  assert.equal(evaluateAlert({ corroborations: 50, minutesSinceFirst: 1 }).severity, "critical");
});
