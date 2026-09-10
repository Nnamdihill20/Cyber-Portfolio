# Security posture

The public side of this app is intentionally accountless: every write (a
camera submission, an activity report, a flag) is anonymous, and every read
is public data. `/admin` (the flagged-reports moderation dashboard) is the
one exception - a real login system, built when there was an actual admin
surface to protect it, not preemptively. Below, each checklist item says
what's done, where, and why - or why it doesn't apply to the public side's
architecture.

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
6. **Enforce server-side authorization on writes.** No public endpoint
   accepts a client-supplied trust/verification field: `POST /api/cameras`
   always sets `confidence: COMMUNITY_REPORTED` and `source` itself
   regardless of what the client sends; `POST /api/reports` always sets
   `reporterHash` and `expiresAt` server-side. A client cannot submit as
   `VERIFIED` or set its own expiry. The only endpoints that *can* mutate
   or delete an existing record - `POST /api/admin/reports/:id/restore` and
   `DELETE /api/admin/reports/:id` - are behind `requireAdmin` (see below),
   applied once for the whole router so a new admin route added later can't
   ship unprotected by accident.
7. **Lock down record access.** Cameras and facilities still have no
   update/delete endpoint at all (read + create only). Activity reports
   accept exactly two mutations from the public (their own flag counter,
   via a rate-limited endpoint) and two more from an authenticated admin
   (restore, purge) - there is no path for one anonymous submitter to
   modify or remove another's record.
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
20. **Scan dependencies.** Ran `npm audit` on both packages (see below for
    what's fixed vs. accepted-and-documented) and added a CI job
    (`.github/workflows/dependency-audit.yml`) that runs `npm audit
    --audit-level=high` on both packages on every PR touching a
    `package.json` here, plus weekly on a schedule so a newly-disclosed
    advisory against an untouched dependency still surfaces. `web`'s one
    known finding is marked `continue-on-error` in that workflow so it
    doesn't permanently block merges - see the comment there and the
    finding below before assuming a red run is new.

## Rate limiting (item 11, generalized)

The same principle - bound how often an actor can hit a sensitive endpoint -
applies to every write here, login included now that one exists:

- `POST /api/reports`: 5 / 10 min per reporter hash (already existed).
- `POST /api/reports/:id/flag`: 20 / hour per reporter hash (already existed).
- `POST /api/cameras`: **was unlimited - fixed in the previous pass.** Now
  5 / 10 min per reporter hash, same shape as report submission.
- `POST /api/admin/login`: 10 attempts / 15 min per IP (there's no reporter
  hash pre-authentication) - tighter than the public limits above, since a
  failed login is a much stronger abuse signal than an extra map pin.

## The admin login (items 9, 10, 11 - now built, not skipped)

`/admin` is a login-gated dashboard for reviewing flagged reports (see
`docs/MODERATION.md`). Building it meant the three items below stopped
being N/A:

- **10. Hash passwords.** `bcryptjs`, 12 rounds
  (`src/lib/adminAuth.ts#hashPassword`). No password is ever stored or
  logged in plaintext. Accounts are provisioned only via
  `seed/create-admin.ts` (a local CLI script, not an API endpoint) - there
  is no public signup surface to abuse in the first place.
- **9. Secure session cookies.** A signed JWT (`jsonwebtoken`, 8h expiry)
  in a cookie that is `httpOnly` (unreachable from JS, so an XSS elsewhere
  in the app can't steal it), `sameSite=strict` (the browser won't attach
  it to any cross-site request at all - form-based or fetch-based, which is
  what actually stops CSRF here, not the CORS config), and `secure` in
  production (never sent over plain HTTP). This assumes the admin UI and
  API are served from the same origin in production - see the CORS comment
  in `src/index.ts` for why that matters.
- **11. Rate-limit login.** Covered above. On top of that: a failed login
  returns the identical "Invalid username or password" whether the
  username doesn't exist or the password was wrong (no
  username-enumeration oracle), and a lookup miss is compared against a
  precomputed dummy bcrypt hash so it takes about as long as a real
  password check (no timing oracle either).

`ADMIN_JWT_SECRET` (`.env.example`) signs those sessions. Unlike
`REPORTER_HASH_SALT`, a weak value here is a full auth bypass, not just a
correlation weakness - the app refuses to start with the placeholder value
when `NODE_ENV=production` (`src/lib/adminAuth.ts#getJwtSecret`).

## Doesn't apply to this architecture (and why)

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

## Dependency findings

- **`esbuild`/`vite`, moderate+high - mitigated, not fixed (reverted an
  earlier attempt to fix it).** Dev-server-only: it lets a malicious
  website make requests to `vite dev`'s local server and read the
  response, which only matters while that dev server is running and
  reachable - it doesn't affect a production `vite build` output. An
  earlier pass ran `npm audit fix --force` (vite 5 -> 8) and called it
  fixed after typecheck/build/a live run all passed - but that
  verification only ran against an install that `--force` had already
  pushed past a real peer-dependency conflict (`@vitejs/plugin-react`
  caps its peer range at `vite ^7`, not `^8`), so a genuine `npm install`
  elsewhere (no force, no stale `node_modules`) failed outright with
  `ERESOLVE`. Reverted to `vite ^5.4.1`, confirmed with an actual clean
  install (`node_modules` and `package-lock.json` deleted first, not just
  re-run) that it installs, typechecks, and builds with no peer conflicts.
  Revisit once `@vitejs/plugin-react` (or its `-oxc` successor) ships
  stable Vite 8 support - don't force this upgrade again until then, and
  when verifying any future dependency bump, confirm it with a genuinely
  clean install, not a rerun of an environment `--force` already touched.
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
