import { ThemeToggle } from "./ThemeToggle";

// Shown once (per browser, per disclaimer version - see lib/consent.ts)
// before the map, geolocation prompt, or any API request fires. Content
// mirrors the fuller language already reviewed for docs/LEGAL.md and
// legal/Terms.tsx rather than drafting divergent new copy - this is a
// summary of that page, not a separate legal document.
export function ConsentGate({ onAcknowledge }: { onAcknowledge: () => void }) {
  return (
    <div className="consent-gate">
      <div className="consent-gate-card">
        <div className="consent-gate-topbar">
          <ThemeToggle />
        </div>

        <h1>Before you continue</h1>

        <div className="consent-gate-point">
          <h2>Not legal advice</h2>
          <p>
            This app is an informational tool, not a substitute for legal
            counsel. For guidance on your specific situation, contact a
            local legal aid organization or attorney.
          </p>
        </div>

        <div className="consent-gate-point">
          <h2>Data may be incomplete or inaccurate</h2>
          <p>
            Camera and facility locations come from public datasets and
            community submissions; activity reports come entirely from
            anonymous members of the public. Nothing here is verified,
            current, or exhaustive - don't rely on this app as your sole
            source of information for a decision that affects your safety.
          </p>
        </div>

        <div className="consent-gate-point">
          <h2>Anonymous by design</h2>
          <p>
            There are no reporter accounts and no individual tracking. This
            app maps infrastructure and activity patterns, not people -
            submissions that name, describe, or otherwise identify a
            specific individual are not permitted and will be removed.
          </p>
        </div>

        <p className="consent-gate-links">
          Read the full <a href="/terms">Terms &amp; Conditions</a> and{" "}
          <a href="/privacy">Privacy Policy</a> for more.
        </p>

        <button type="button" className="primary consent-gate-button" onClick={onAcknowledge}>
          I understand — show me the map
        </button>
      </div>
    </div>
  );
}
