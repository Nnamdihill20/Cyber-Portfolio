// Disclaimer/consent gate acknowledgment, persisted the same way theme.ts
// persists its preference. Versioned key: bump the suffix if the
// disclaimer's substance changes materially, so returning users are shown
// the new copy and asked to acknowledge it again rather than staying
// silently opted-in to language they never saw.

const STORAGE_KEY = "sentinel-map-consent-ack-v1";

export function hasAcknowledged(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // Private browsing / storage disabled - fail open to "not acknowledged"
    // rather than assume consent, so the gate shows every load. That's a
    // minor annoyance; silently skipping the disclaimer would not be.
    return false;
  }
}

export function setAcknowledged(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Nothing we can do if storage is unavailable - the caller still lets
    // the user through for this page load, it just won't persist to the
    // next one.
  }
}
