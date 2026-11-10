# Guardian — the content-safety agent

Sentinel Map's one implemented product-level AI component (see the company
report's Artificial Intelligence Integration section and
`racket-dsl/DSL_1_moderation_policy.rkt`, the Racket Development
Department's moderation-policy DSL that this mirrors). Guardian screens a
submitted activity report's free-text description at submission time, in
`src/lib/guardian.ts`.

## What it does

`classifyDescription(description)` checks the text against two short
phrase lists and returns a verdict:

- **Individual-identifier phrases** (`badge #`, `officer `, `his name is`,
  `her name is`, `license plate`, `plate number`, `social security`) — a
  match means the report may violate `LEGAL.md`'s hard scope boundary:
  places and events only, never a specific person.
- **Harassment/doxxing phrases** (`kill `, `threat`, `address is`) — a
  match means the report may be targeting someone rather than describing
  enforcement activity.

Anything else, including an empty description, passes through unflagged.

## Why a phrase-list classifier, not an LLM call

This was a deliberate choice, not a shortcut:

- **Testable with no network call or API key.** `guardian.test.ts` runs 10
  deterministic assertions in milliseconds, with no mocking and no
  non-determinism to account for.
- **Explainable by construction.** `guardianReason` is always the exact
  phrase that matched, never an opaque confidence score — a moderator can
  actually evaluate a flag instead of just trusting it, which is the whole
  point of staying human-in-the-loop.
- **It is provably the same policy as the Racket DSL.** `guardian.ts` and
  `DSL_1_moderation_policy.rkt` share the same phrase lists and the same
  rule logic (minus the honeypot rule, which happens earlier and
  separately in `routes/reports.ts`) — implemented twice, once as the
  Racket Development Department's specification language and once in the
  app's own runtime, so it runs in-process on every submission instead of
  shelling out to a separate interpreter per request.

## Where it's wired in

`routes/reports.ts`'s `POST /` handler runs `classifyDescription` on every
new report (not on a corroboration-merge — the new submission's
description is discarded in that path regardless, so there's nothing to
screen). A flagged report is still created — this layer is flag-to-hide,
not block-on-submit, exactly like a report the public has flagged three
times via the existing flag button — except it starts life already at
`FLAG_THRESHOLD`, so it never reaches public results before a moderator
has looked at it.

## The one deliberate anti-probing decision

The submitter's own response to `POST /reports` never reveals that
Guardian flagged their report: `guardianFlagged`/`guardianReason` are
stripped (same as `reporterHash`), and `flaggedCount` is always reported
as `0` in that one response (`toSubmitterResponse` in `routes/reports.ts`)
— a freshly created report cannot honestly have any *community* flags
yet, so a non-zero count at that exact moment could only mean Guardian
just flagged it, which is the tell this exists to hide. This mirrors the
honeypot branch just above it in the same file, which fabricates its own
all-zero response for the identical reason: a bad-faith submitter who sees
a different response for a flagged vs. clean submission can iteratively
reword a real violation until it slips past the classifier. The *true*
`flaggedCount`, `guardianFlagged`, and `guardianReason` are written to the
database regardless, and that's exactly what the admin dashboard shows.

## What the admin dashboard shows

`/admin`'s flagged-reports table (`packages/web/src/admin/AdminApp.tsx`)
shows a blue "Guardian" tag and Guardian's exact reason text under any
report it flagged, distinct from the existing red "hidden from public" tag
— so a moderator can immediately tell "the system flagged this
automatically, here's why" apart from "three members of the public flagged
this." **Restore** and **Purge** work on a Guardian-flagged report exactly
as they do on a community-flagged one; Guardian never has the final say.

## Known limitations

- **Phrase matching, not language understanding.** A creatively-worded
  identification ("that cop over there, you know the one") will not match
  any listed phrase. This is a real false-negative risk, not a hidden one
  — it's the direct tradeoff for the explainability and testability above,
  and it's why Guardian supplements human review rather than replacing it.
- **No confidence score.** A match is binary (flagged or not) by design —
  see "why a phrase-list classifier" above — so there is no way to tune a
  threshold the way a model-based classifier would allow.
- **English phrases only.** No localization yet.
- **Not evaluated against a held-out labeled dataset.** The 10 assertions
  in `guardian.test.ts` prove the classifier does what it's written to do;
  they are not a measurement of real-world false-positive/false-negative
  rates against real submitted reports, which would need genuine report
  volume to assess.
