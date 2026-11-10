import { LegalPage } from "./LegalPage";

// A starting draft, not legal advice - get it reviewed by a lawyer before
// real launch. See docs/LEGAL.md for the underlying design decisions this
// reflects (why the app is scoped to places/events, never individuals).
export default function Terms() {
  return (
    <LegalPage title="Terms &amp; Conditions">
      <p className="legal-updated">
        Last updated: [DATE] &middot; Operated by: [YOUR ORGANIZATION NAME] &middot;
        Contact: [CONTACT EMAIL]
      </p>

      <h2>What this is</h2>
      <p>
        This app maps public, fixed infrastructure (license plate reader
        cameras, enforcement facilities) and hosts anonymous, short-lived
        community reports of enforcement activity. By using it, you agree
        to these terms.
      </p>

      <h2>This is not legal advice</h2>
      <p>
        Any know-your-rights content on this app is general information,
        not legal advice, and doesn't create an attorney-client
        relationship. Laws and procedures vary by state and situation -
        contact a local legal aid organization or attorney for guidance on
        your specific circumstances.
      </p>

      <h2>Accuracy isn't guaranteed</h2>
      <p>
        Camera and facility locations come from public datasets and
        community submissions; activity reports come entirely from
        anonymous members of the public. We do not verify every submission
        before it appears on the map, and location data (including your
        own device's GPS) can be imprecise. Don't rely on this app as your
        sole source of information for a decision that affects your
        safety or legal situation.
      </p>

      <h2>Acceptable use</h2>
      <p>You agree not to use this app to:</p>
      <ul>
        <li>
          Submit a report or camera location that names, describes, or
          otherwise identifies a specific individual - this app is scoped
          to places and events, never people, and content aimed at
          tracking a particular person will be removed.
        </li>
        <li>
          Submit false, fabricated, or intentionally misleading reports.
        </li>
        <li>
          Harass, threaten, or endanger any person, including law
          enforcement personnel.
        </li>
        <li>
          Attempt to circumvent rate limits, submission safeguards, or the
          moderation system, including through automated tools (bots,
          scripts) not authorized by us.
        </li>
        <li>Attempt to access the moderation dashboard without authorization.</li>
      </ul>
      <p>
        We can remove content or restrict access for anyone who violates
        these terms.
      </p>

      <h2>No warranty</h2>
      <p>
        This app is provided "as is," without warranties of any kind,
        express or implied, including accuracy, availability, or fitness
        for a particular purpose.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, [YOUR ORGANIZATION NAME]
        is not liable for any damages arising from your use of, or
        inability to use, this app, including decisions made in reliance
        on its content.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        If these terms change in a way that matters, we'll update the date
        above.
      </p>

      <h2>Contact</h2>
      <p>Questions about these terms: [CONTACT EMAIL]</p>
    </LegalPage>
  );
}
