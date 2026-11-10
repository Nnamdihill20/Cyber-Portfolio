// Guardian - Content Safety Agent
//
// Sentinel Map's one implemented product-level AI component (see the
// company report's AI Integration section and the Artificial Intelligence
// Department). Guardian screens an incoming activity report's free-text
// description at submission time, before it's stored, and decides whether
// it needs a human moderator's attention before anyone else sees it.
//
// Design choice, and why: Guardian is a deterministic, explainable,
// phrase-based classifier - not a call to an external LLM. That is a
// deliberate decision, not a shortcut:
//   - It is directly testable (see guardian.test.ts) with no network call,
//     no API key, and no non-determinism to account for.
//   - It is explainable by construction - guardianReason is always the
//     exact rule that fired, never an opaque confidence score - which is
//     what lets a moderator actually evaluate a flag instead of just
//     trusting it (see docs/GUARDIAN.md and the company's "human verifies
//     AI-generated decisions" core value).
//   - It mirrors, almost line for line, the rule set already specified and
//     tested in racket-dsl/DSL_1_moderation_policy.rkt (the Racket
//     Development Department's moderation-policy DSL) - the same policy,
//     implemented here in the app's own runtime so it runs in-process on
//     every submission instead of shelling out to a separate interpreter
//     per request.
//
// Guardian only ever recommends a flag. It never deletes, hides anything
// itself outside the existing flaggedCount mechanism, or makes a final
// call - the admin dashboard's existing Restore/Purge actions (see
// routes/adminReports.ts) remain the only thing that actually removes
// content, exactly as community-flagged reports already work. A false
// positive costs a moderator one click to restore; Guardian is deliberately
// tuned to flag generously rather than let a real violation through.

export interface GuardianVerdict {
  flagged: boolean;
  reason: string | null;
}

// Same phrase lists as DSL_1_moderation_policy.rkt's "individual-identifier"
// and "slur-or-harassment" rules - kept in sync deliberately, see the note
// at the top of this file. (DSL_1's "honeypot-filled" rule has no
// equivalent here: the honeypot check already happens earlier in
// routes/reports.ts, before Guardian ever sees the submission.)
const INDIVIDUAL_IDENTIFIER_PHRASES = [
  "badge #",
  "officer ",
  "his name is",
  "her name is",
  "license plate",
  "plate number",
  "social security",
];

const HARASSMENT_PHRASES = ["kill ", "threat", "address is"];

function containsAny(text: string, phrases: string[]): string | null {
  const lowered = text.toLowerCase();
  return phrases.find((phrase) => lowered.includes(phrase.toLowerCase())) ?? null;
}

// Pure function: same input always produces the same output, no side
// effects - the one thing this module is responsible for deciding.
export function classifyDescription(description: string | null | undefined): GuardianVerdict {
  const text = description ?? "";

  if (text.trim() === "") {
    return { flagged: false, reason: null };
  }

  const identifierHit = containsAny(text, INDIVIDUAL_IDENTIFIER_PHRASES);
  if (identifierHit) {
    return {
      flagged: true,
      reason: `Guardian: possible individual identification ("${identifierHit.trim()}") - violates the places-not-people scope boundary (docs/LEGAL.md)`,
    };
  }

  const harassmentHit = containsAny(text, HARASSMENT_PHRASES);
  if (harassmentHit) {
    return {
      flagged: true,
      reason: `Guardian: possible harassment or doxxing content ("${harassmentHit.trim()}") - needs human review`,
    };
  }

  return { flagged: false, reason: null };
}
