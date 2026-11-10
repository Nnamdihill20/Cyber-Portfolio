# Site polish checklist

Went through a standard pre-launch website checklist. Most of it applies
directly and is done; two items are a deliberate no for now, explained
below rather than silently skipped.

## Done

1. **Privacy policy page.** `/privacy` (`src/legal/PrivacyPolicy.tsx`) -
   describes what this codebase actually collects (approximate location
   per search, anonymous submissions, the rate-limiting fingerprint) rather
   than generic boilerplate. Has `[PLACEHOLDER]` markers for
   operator-specific details (your org name, contact email, launch date) -
   fill those in, and get an actual lawyer to review it before real
   launch, same caveat as `docs/LEGAL.md`.
2. **Terms & conditions page.** `/terms` (`src/legal/Terms.tsx`) - covers
   accuracy disclaimers, acceptable use (explicitly bans submitting
   anything that identifies a specific individual, consistent with
   `docs/LEGAL.md`), and liability limitation. Same placeholder/review
   caveat as above.
3. **Secrets off the frontend.** Audited: `grep` across `packages/web/src`
   for `import.meta.env`, `process.env`, `VITE_`, and key/secret/token
   patterns returns nothing - the frontend references no environment
   variable and holds no secret to leak. It doesn't need any: every
   external call (map tiles) is to a keyless public tile server, and every
   authenticated call (admin) relies on a server-set httpOnly cookie, never
   a token the frontend has to hold.
4. **Force HTTPS.** Already done in an earlier pass (`src/index.ts`, API) -
   confirmed still in place, no change needed here.
5. **Cookie consent banner - not added, and here's why.** The public map
   sets zero cookies. The only cookie anywhere in this app is the admin
   login session (`httpOnly`, `sameSite=strict`), which is "strictly
   necessary" for that feature to function - under GDPR/ePrivacy, strictly
   necessary cookies are specifically exempt from consent-banner
   requirements. Adding a banner with nothing to consent to would just be
   UI noise. Revisit this the moment any analytics/tracking cookie is
   added (see item 19).
6. **Meta titles + descriptions.** Added to `index.html`.
7. **Social preview image.** Open Graph + Twitter card tags added to
   `index.html`, pointing at `public/og-image.svg`. Caveat: that SVG is a
   placeholder, and OG image support for SVG is inconsistent across
   platforms - Twitter/X and Discord render it fine, Facebook/LinkedIn
   often don't. Export it to a 1200x630 PNG before relying on link
   previews there.
8. **Favicon.** `public/favicon.svg`, referenced in `index.html`. SVG
   favicons work in every current browser; add a `.ico` fallback only if
   you need to support browsers old enough to lack SVG favicon support.
9. **Sitemap + robots.txt.** `public/robots.txt` disallows `/admin` (a
   login page has nothing worth indexing, and there's no reason to
   advertise it to crawlers). `public/sitemap.xml` has a placeholder
   domain - swap in your real one once deployed.
10. **Alt text on images.** Audited: this app currently has no `<img>`
    content elements (the map is a `<canvas>`, icons are inline SVG/CSS) -
    nothing to add alt text to yet. Revisit if a logo or content image gets
    added later.
11. **Compress images.** Same as above - no raster image assets in the app
    yet to compress. The one thing to watch: if you replace `og-image.svg`
    with a PNG (see item 7), export it compressed (most social platforms
    cap useful size well under 1MB anyway).
12. **Page load speed.** `vite.config.ts` now splits `maplibre-gl` (the
    large majority of the bundle) into its own chunk via `manualChunks` -
    app code alone is 170KB (55KB gzipped) instead of shipping a single
    ~970KB bundle. A returning visitor's browser can reuse the cached
    MapLibre chunk across app updates instead of re-downloading it every
    time. The MapLibre chunk itself (~800KB) still trips Vite's 500KB
    warning - that's the actual mapping library and isn't reasonably
    smaller without removing map functionality, so it's left as is.
13. **Color contrast.** Found and fixed one real failure: `.hint` text was
    `#777` on white, ~4.48:1 contrast - just under the 4.5:1 WCAG AA
    threshold for normal text. Changed to `#595959` (~7:1). Everything
    else in the stylesheet checked (`.subtitle`, `.rights-intro`,
    `.legal-aid-details`, etc.) was already comfortably above 4.5:1.
14. **Mobile-friendly.** This is one of the more important items on this
    list given what this app is actually for - checking the map from a
    phone is a primary use case, not an edge case. Added a `640px` media
    query: the sidebar goes near-full-width with a scrollable max-height
    instead of a fixed 260px box eating most of a phone screen, the report
    form and resources panel cap at `min(Npx, ~90vw)` instead of
    overflowing, the know-your-rights state/language selectors stack
    instead of squeezing side by side, and the admin table scrolls
    horizontally in its own container instead of forcing the whole page
    wider than the viewport. Verified on a 375px-wide viewport.
15. **Custom 404 page.** `src/NotFound.tsx`, wired into the same
    pathname-based routing `main.tsx` already used for `/admin` - any
    unrecognized path renders it instead of a blank screen.
16. **Broken links.** Audited: no internal link structure of note (this is
    a single-page app plus three secondary pages, all correctly wired).
    External links (legal aid websites in the resources panel) already
    carry `target="_blank" rel="noreferrer"`.
17. **Form validation.** Found and fixed a real gap: the report form had no
    protection against a fast double-click or a slow connection firing a
    second submission before the first one's response closed the form -
    two near-identical reports from one honest double-click. Added a
    `submitting` state that disables both buttons and shows "Submitting..."
    for the duration of the request, plus a live character counter on the
    description field. Server-side validation (zod schemas, strict field
    checking) was already solid from the earlier security pass.
18. **Spam protection.** Already covered in the security pass: honeypot
    field, per-endpoint rate limiting, generic error messages. Nothing new
    needed here.
20. **One clear call to action.** The sidebar's primary action ("Click the
    map to report activity") is already the single, prominent
    instruction - no changes made here; flagging as reviewed rather than
    silently skipped.

## Deliberately not done

19. **Analytics - not added, on purpose, not just skipped for time.** This
    app's entire design, reinforced throughout this project (see
    `docs/LEGAL.md` and `docs/SECURITY.md`), is built around *not*
    correlating activity back to a person or device - the reporter-hash
    system exists specifically so even the operator can't do that. A
    conventional analytics setup (Google Analytics, Meta Pixel, etc.) runs
    directly against that: third-party scripts that fingerprint visitors
    and phone home to an ad-tech company are a real risk for people using
    a tool that may include tracking immigration/police enforcement
    activity near them, especially anyone in a vulnerable population this
    app is meant to help. Don't add one without discussing it first.
    If usage insight is genuinely needed, the fit here is a privacy-
    respecting, cookieless, aggregate-only option - a self-hosted tool
    like Plausible or Umami, or even a simple server-side page-view
    counter with no per-visitor identifier at all - not a third-party
    tracking script.
