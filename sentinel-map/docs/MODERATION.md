# Moderation & anti-abuse design

Layer B (activity reports) is the highest-risk surface in this app: it's
the only layer that accepts arbitrary public input, and it's the one most
easily weaponized (spam, harassment via false reports, flooding an area to
discredit the app).

## Implemented in this scaffold

- **No identity fields.** `ActivityReport` has no name/plate/photo-of-person
  field — see `docs/LEGAL.md`.
- **Reporter hashing, not storage.** The API stores a salted hash of
  `IP + User-Agent`, never the raw IP, purely for rate-limiting and
  duplicate-corroboration detection (`src/lib/geo.ts#reporterHash`).
- **Rate limiting.** `src/middleware/rateLimit.ts` caps submissions per
  reporter hash per time window (in-memory for this scaffold — swap for a
  Redis-backed limiter before production, since in-memory state doesn't
  survive a restart or scale past one instance).
- **Auto-expiry.** Reports carry `expiresAt` and are filtered out of `GET`
  results once expired; a scheduled job should hard-delete expired rows
  (not just hide them) — see `LEGAL.md` on retention.
- **Corroboration instead of duplication.** A new report within ~150m of an
  existing, unexpired report of the same `activityType` increments
  `corroborations` on the existing row instead of creating a new pin —
  this both reduces spam surface area and gives users a confidence signal.

## Not yet implemented — needed before public launch

- **Photo/metadata sanity checks** on any submitted evidence (strip EXIF
  GPS before storage if you ever accept photos — ironic to leak a
  reporter's location while protecting everyone else's).
- **Community flagging** to downweight or hide reports other users mark as
  false.
- **Geofenced flood detection** — many reports from the same rough area/hash
  in a short window should throttle harder, not just per-reporter.
- **Human review queue** for repeated flags before a report is fully removed
  vs. auto-expired.
