// Automated tests for Guardian (see guardian.ts). Run with:
//   npx ts-node --transpile-only src/lib/guardian.test.ts
// or, once built: node --test dist/lib/guardian.test.js
//
// Uses Node's built-in test runner (node:test) and assert module - no new
// dependency needed to start closing the "automated test suite" gap
// tracked in the company report, at least for this one component.

import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyDescription } from "./guardian";

test("an ordinary, policy-compliant description is not flagged", () => {
  const verdict = classifyDescription("ICE agents parked outside the courthouse.");
  assert.equal(verdict.flagged, false);
  assert.equal(verdict.reason, null);
});

test("an empty description is not flagged", () => {
  assert.deepEqual(classifyDescription(""), { flagged: false, reason: null });
});

test("a null/undefined description is not flagged", () => {
  assert.deepEqual(classifyDescription(null), { flagged: false, reason: null });
  assert.deepEqual(classifyDescription(undefined), { flagged: false, reason: null });
});

test("naming an officer by badge number is flagged as an individual identifier", () => {
  const verdict = classifyDescription("Officer Smith, badge # 4471, is at the corner.");
  assert.equal(verdict.flagged, true);
  assert.match(verdict.reason ?? "", /individual identification/);
});

test("a license plate mention is flagged", () => {
  const verdict = classifyDescription("I got the license plate number, it's ABC123.");
  assert.equal(verdict.flagged, true);
  assert.match(verdict.reason ?? "", /individual identification/);
});

test("'his name is' / 'her name is' phrasing is flagged", () => {
  assert.equal(classifyDescription("His name is John and he drives a blue sedan.").flagged, true);
  assert.equal(classifyDescription("Her name is Jane, works the night shift.").flagged, true);
});

test("an address-doxxing phrase is flagged as harassment, with its own distinct reason", () => {
  const verdict = classifyDescription("I found their address is 123 Main St.");
  assert.equal(verdict.flagged, true);
  assert.match(verdict.reason ?? "", /harassment or doxxing/);
});

test("matching is case-insensitive", () => {
  assert.equal(classifyDescription("OFFICER Smith is here").flagged, true);
  assert.equal(classifyDescription("nothing to see here").flagged, false);
});

test("the reason always names the specific phrase that matched (explainability, not a bare boolean)", () => {
  const verdict = classifyDescription("Her license plate number was ABC123.");
  assert.equal(verdict.flagged, true);
  assert.match(verdict.reason ?? "", /license plate/);
});

test("classifyDescription is pure: identical input always produces an equal result", () => {
  const input = "Officer Smith, badge # 1, was here.";
  assert.deepEqual(classifyDescription(input), classifyDescription(input));
});
