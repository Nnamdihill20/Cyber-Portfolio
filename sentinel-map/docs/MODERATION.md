# Moderation & anti-abuse design

Layer B (activity reports) is the highest-risk surface in this app: it's
the only layer that accepts arbitrary public input, and it's the one most
easily weaponized (spam, harassment via false reports, flooding an area to
discredit the app). See `docs/SECURITY.md` for the broader application
security posture (input validation, headers, dependency scanning, etc.) -
this file is specifically about abuse of the anonymous-submission model.

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
- **Community flagging.** `POST /api/reports/:id/flag` lets any viewer flag a
  report as inaccurate (button in the map popup). A report hitting
  `REPORT_FLAG_THRESHOLD` (default 3) flags is excluded from `GET .../nearby`
  results — hidden, not deleted, so there's still something to review. The
  flag endpoint has its own rate limit (20/hour/reporter hash) so one
  reporter can't mass-flag reports to censor them.
- **Camera submission is now rate-limited too.** `POST /api/cameras` had no
  limit at all until this pass — same abuse case as reports (a script
  flooding fake pins), so it now shares the same 5/10-min-per-reporter
  limiter.
- **Basic bot deterrent.** Both submission forms carry a honeypot field,
  hidden from real users, that a naive bot filling every field will
  populate — a filled honeypot gets a fake success response rather than an
  error. This is a deterrent against unsophisticated scripts, not a wall;
  see `docs/SECURITY.md` for what a targeted attacker would still get past
  and what a real CAPTCHA (Turnstile/hCaptcha) would add.
- **Response no longer leaks a correlation ID.** `reporterHash` was being
  returned in every report API response — harmless-looking, but it let any
  client correlate "these reports came from the same device," undercutting
  the anonymity this layer is built around. Stripped from all responses
  now (`toPublicReport()` in `routes/reports.ts`), including the admin
  endpoints below - moderators review report *content*, not who sent it.
- **Human review / admin UI.** `/admin` (see `packages/web/src/admin/`) is
  a login-gated dashboard listing every flagged report - including ones
  still below `REPORT_FLAG_THRESHOLD` that the public can still see, so a
  moderator can catch a pattern before it hits the auto-hide threshold, not
  only after. Each row can be **Restored** (clears its flags, back to
  normal visibility - a moderator judged the flags weren't warranted) or
  **Purged** (hard-deleted - the flags were right: spam, harassment,
  fabricated). See `docs/SECURITY.md` for the auth design behind `/admin`
  (hashed passwords, rate-limited login, `httpOnly`/`sameSite=strict`
  session cookie) and `packages/api/seed/create-admin.ts` for how an
  account gets provisioned (no self-service signup, by design).

## Not yet implemented — needed before public launch

- **Photo/metadata sanity checks** on any submitted evidence (strip EXIF
  GPS before storage if you ever accept photos — ironic to leak a
  reporter's location while protecting everyone else's). See
  `docs/SECURITY.md`'s file-upload section for the fuller list once that
  feature exists.
- **Geofenced flood detection** — many reports from the same rough area/hash
  in a short window should throttle harder, not just per-reporter.
- **A real CAPTCHA** (e.g. Cloudflare Turnstile or hCaptcha) in front of
  submission, once launch scale makes the honeypot's limits (see above)
  worth the added friction and third-party dependency.
- **Multiple admin accounts with roles/audit log** - today every admin
  account can do everything (restore, purge) and there's no record of
  which moderator took which action. Fine for a single small trusted team;
  add per-action audit logging before the team grows.
