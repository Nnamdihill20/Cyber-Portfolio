# Security posture

This app is intentionally accountless: every write (a camera submission, an
activity report, a flag) is anonymous, and every read is public data. That
shapes which items on a standard web-app security checklist apply here and
which don't - a few assume a login/session system this app deliberately
doesn't have. Below, each item says what's done, where, and why - or why it
doesn't apply to this architecture.

## Applies directly - done

1. **Hide API keys.** This app doesn't call any third-party API that needs a
   key (OSM/Overpass is keyless). Nothing to hide; verified no secrets are
   hardcoded anywhere in `packages/*/src` (see `.env.example` for the one
   secret that does exist - the reporter-hash salt - which is a placeholder,
   never a real value).
2. **Purge git secrets.** Checked: `.env` was never committed (gitignored
   from the first commit), and `git log -p` across this project's history
   has no API-key or private-key patterns in it.
5. **Encrypt sensitive data.** The one piece of "sensitive" data this app
   ever touches - a reporter's IP+User-Agent - is never stored raw; only a
   salted SHA-256 hash is kept (`src/lib/geo.ts#reporterHash`), and even
   that hash is now stripped from every API response (see #17).
6. **Enforce server-side authorization on writes.** No endpoint accepts a
   client-supplied trust/verification field: `POST /api/cameras` always
   sets `confidence: COMMUNITY_REPORTED` and `source` itself regardless of
   what the client sends; `POST /api/reports` always sets `reporterHash`
   and `expiresAt` server-side. A client cannot submit as `VERIFIED` or
   set its own expiry.
7. **Lock down record access.** There is no update/delete endpoint for
   cameras or facilities at all (read + create only), and the only mutation
   an activity report accepts is its own flag counter - there's no
   "edit someone else's record" surface to lock down because it doesn't
   exist.
8. **Block field tampering.** Every write schema in `lib/validation.ts` is
   now `.strict()` - a request body with an unrecognized field (e.g. trying
   to set `flaggedCount` or `corroborations` directly) is rejected with a
   400 instead of the extra field being silently dropped.
12. **Add bot protection.** A honeypot field (`honeypot`) on both submission
    schemas: hidden from real users via CSS (not `display:none`, which some
    bots specifically check for) and empty for anyone who doesn't fill
    every field a script finds. A filled honeypot gets a fake success
    response rather than an error, so a bot can't distinguish "caught" from
    "worked" and adjust. This is a deterrent, not a wall - a targeted
    attacker will find the empty field. Layered with the rate limits below,
    and see the note on a real CAPTCHA (Turnstile/hCaptcha) under "not yet
    done."
13. **Parameterize queries.** All database access goes through Prisma's
    query builder - there is no raw SQL string concatenation anywhere in
    this codebase (`grep -rn "queryRaw\|executeRaw"` returns nothing), so
    SQL injection isn't reachable through normal use of this code.
14. **Validate all input.** Every request body and query string is parsed
    through a `zod` schema before use (`lib/validation.ts`); path
    parameters are validated too now (`reportIdParamSchema` on the flag
    route, so a malformed `:id` gets a clean 400 instead of an unhandled
    Prisma error).
15. **Escape user content.** Fixed a real stored-XSS hole this pass: the
    activity-report popup built its content with a template-literal
    `innerHTML`, so a submitted `description` containing `<img
    onerror=...>` would execute in any viewer's browser. All three map
    popups (`MapView.tsx`) now build DOM nodes with `.textContent`
    exclusively - no popup anywhere constructs HTML from interpolated data,
    whether or not that data is currently user-submitted.
17. **Trim API responses.** `reporterHash` was being returned on every
    activity-report response (`GET .../nearby`, the create/corroborate
    response, the flag response) - a stable hash any client could use to
    correlate "these reports came from the same device," which undercuts
    the whole point of this layer being anonymous. `toPublicReport()` in
    `routes/reports.ts` strips it before every response now.
18. **Add security headers.** `helmet()` is wired into the Express app
    (`src/index.ts`) - sets `X-Content-Type-Options`, a baseline CSP,
    `X-Frame-Options`, and the rest of helmet's defaults.
19. **Force HTTPS.** A redirect-to-HTTPS middleware runs when
    `NODE_ENV=production`, using `req.secure` (which respects
    `X-Forwarded-Proto` since `trust proxy` is set) - a no-op in local dev,
    and safe behind a load balancer that already terminates TLS.
20. **Scan dependencies.** Ran `npm audit` on both packages, fixed what had
    a safe fix (see below), and added a CI job
    (`.github/workflows/dependency-audit.yml`) that runs `npm audit
    --audit-level=high` on both packages on every PR touching a
    `package.json` here, plus weekly on a schedule so a newly-disclosed
    advisory against an untouched dependency still surfaces.

## Rate limiting (item 11, generalized)

There's no login to rate-limit, but the same principle - bound how often an
anonymous actor can hit a sensitive endpoint - applies to every write here:

- `POST /api/reports`: 5 / 10 min per reporter hash (already existed).
- `POST /api/reports/:id/flag`: 20 / hour per reporter hash (already existed).
- `POST /api/cameras`: **was unlimited - fixed this pass.** Now 5 / 10 min
  per reporter hash, same shape as report submission.

## Doesn't apply to this architecture (and why)

- **9. Secure session cookies / 10. Hash passwords / 11. Rate-limit login
  (as literally "login").** There is no login, no account, no session, no
  password anywhere in this app - it's anonymous by design (see
  `docs/LEGAL.md`). These become relevant the moment an admin/moderation
  login is built for the "human review queue" `docs/MODERATION.md` still
  lists as not-yet-built - at that point: bcrypt/argon2 for any password,
  `httpOnly` + `secure` + `sameSite=strict` cookies or a signed JWT for the
  session, and a real rate limit on the login endpoint itself. Don't add
  fake auth scaffolding now just to check this box - build it when there's
  an actual admin surface to protect.
- **3. Use a public DB key / 4. Enable row-level security.** These are the
  right controls for an architecture where the browser talks to the
  database directly (e.g. Supabase/Firebase with a publishable client key).
  This app's browser client never touches Postgres - every read and write
  goes through the Express API, which *is* the access-control layer here
  (see items 6-8 above for how it's hardened). RLS becomes the right tool
  if this ever grows a direct-from-browser data path; it isn't one today.
- **16. Restrict file uploads.** There is no upload endpoint yet - the
  `evidencePhotoUrl` field on `AlprCamera` is unused by any route. When
  photo evidence is added (tracked in `docs/MODERATION.md`), restrict by:
  content-type allowlist + magic-byte sniffing (not just the extension),
  a strict size cap, re-encoding rather than storing the original bytes,
  and stripping EXIF (GPS in particular - see `docs/MODERATION.md`) before
  anything touches disk or a bucket.

## Dependency findings from this pass

- **`esbuild`/`vite`, moderate+high - fixed.** Was dev-server-only (let a
  malicious website make requests to `vite dev`'s local server and read the
  response), but a safe fix existed: `npm audit fix --force` upgraded
  `vite` 5 -> 8. Verified the upgrade didn't break anything before keeping
  it - typecheck, `vite build`, and a full live run (real API + real
  browser exercising every layer, the resources panel, and report
  submission) all passed unchanged after the bump. `packages/web` is at
  0 known vulnerabilities now.
- **`qs` (via `body-parser`/`express`), moderate - mitigated, not fixed.**
  No fix exists yet for the Express 4.x line - only Express 5, which is a
  breaking migration (different error-handling middleware signature,
  route-matching changes) out of scope for a hardening pass. Mitigated
  instead: this API never uses `express.urlencoded()` (only
  `express.json()`), and `app.set("query parser", "simple")` in
  `src/index.ts` switches Express's own query-string parsing to Node's
  built-in `querystring` module, avoiding the vulnerable `qs` codepath
  entirely. Every query param this API reads is a flat scalar, so nothing
  is lost. This is why the CI job below runs at `--audit-level=high`, not
  `moderate` - revisit when Express patches 4.x or an Express 5 migration
  is planned deliberately.
