import { LegalPage } from "./LegalPage";

// Written to describe what this codebase actually does, not generic
// boilerplate - update it if you change how data flows. It is a starting
// draft, not legal advice: get it reviewed by a lawyer before real launch,
// especially for jurisdiction-specific obligations (CCPA, GDPR, etc.) that
// depend on where you operate and who uses the app. See docs/LEGAL.md.
export default function PrivacyPolicy() {
  return (
    <LegalPage title="Privacy Policy">
      <p className="legal-updated">
        Last updated: [DATE] &middot; Operated by: [YOUR ORGANIZATION NAME] &middot;
        Contact: [CONTACT EMAIL]
      </p>

      <h2>The short version</h2>
      <p>
        You don't need an account to use this map. Submitting a camera or an
        activity report doesn't ask for your name, email, or phone number.
        We don't sell data, and we don't run third-party advertising or
        tracking scripts.
      </p>

      <h2>What we collect and why</h2>
      <ul>
        <li>
          <strong>Your location.</strong> If you allow it, your browser
          shares your approximate location so the map can center on you;
          this also happens implicitly whenever you pan or zoom the map,
          since "what's nearby" is calculated from wherever you're
          currently looking. That coordinate is sent to our server with
          each search request to find nearby cameras, facilities, and
          reports - it is used to answer that one request and is not
          stored in a database tied to you.
        </li>
        <li>
          <strong>Anonymous submissions.</strong> A camera report or an
          activity report you submit is stored with its location, type,
          and any description you wrote - never your name or contact
          information, because we never ask for it.
        </li>
        <li>
          <strong>A rate-limiting fingerprint, not your identity.</strong>{" "}
          When you submit a report or flag one, our server computes a
          salted one-way hash of your IP address and browser type. We use
          it only to prevent spam (limiting how many submissions come from
          the same device in a short window) and to detect when two
          reports are about the same nearby event. It is never shown to
          any user, including moderators, and cannot be reversed back into
          your IP address.
        </li>
        <li>
          <strong>Nothing, if you're just browsing.</strong> Viewing the
          map, reading know-your-rights content, or looking up legal aid
          doesn't send us anything beyond the location query above.
        </li>
      </ul>

      <h2>Map tiles come from third parties</h2>
      <p>
        The map imagery itself (streets or satellite) is loaded directly by
        your browser from OpenStreetMap's and Esri's tile servers, not
        through us. Those requests go straight from your device to those
        providers, who may log the request (including your IP address)
        under their own privacy practices - see{" "}
        <a href="https://osmfoundation.org/wiki/Privacy_Policy" target="_blank" rel="noreferrer">
          OpenStreetMap's privacy policy
        </a>{" "}
        and{" "}
        <a href="https://www.esri.com/en-us/privacy/overview" target="_blank" rel="noreferrer">
          Esri's privacy policy
        </a>
        .
      </p>

      <h2>How long we keep things</h2>
      <ul>
        <li>
          Activity reports automatically expire and are excluded from
          results after a few hours - see the timestamp on any report you
          view. They're deleted outright, not archived.
        </li>
        <li>
          Camera and facility locations are kept as ongoing reference data
          (that's the point of the map), independent of who submitted
          them.
        </li>
        <li>
          The rate-limiting fingerprint above is held only in server
          memory for a short rolling window, not written to permanent
          storage.
        </li>
      </ul>

      <h2>Cookies</h2>
      <p>
        The public map sets no cookies at all. The only cookie this app
        ever sets is a login session cookie for the separate, password-
        protected moderation dashboard - it's strictly necessary for that
        login to function and is never used for tracking or advertising.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>
          You can deny or revoke location permission at any time in your
          browser settings - the map still works, just without
          auto-centering on you.
        </li>
        <li>
          Anything you submit is anonymous by design; there's no account
          to delete because there's no account to begin with.
        </li>
        <li>
          If you believe a specific submission should be removed, contact
          [CONTACT EMAIL] with the approximate time and location and we'll
          review it.
        </li>
      </ul>

      <h2>Changes to this policy</h2>
      <p>
        If this policy changes in a way that matters, we'll update the
        date above.
      </p>
    </LegalPage>
  );
}
