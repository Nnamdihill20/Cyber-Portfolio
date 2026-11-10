// Three-state theme: explicit "light"/"dark" (user override, persisted) or
// unset (follow the OS/browser's prefers-color-scheme). Applied as a
// data-theme attribute on <html>, which styles.css's tokens key off of.
// Called both from main.tsx (before React renders, on every full page
// load - this is a multi-page app, not a client-side router, so each of
// /, /admin, /privacy, /terms, and the 404 needs this to run independently)
// and from the toggle button itself.

const STORAGE_KEY = "sentinel-map-theme";

export type Theme = "light" | "dark";

export function getStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null; // private browsing / storage disabled - fall back to system preference
  }
}

export function applyStoredTheme(): void {
  const stored = getStoredTheme();
  if (stored) {
    document.documentElement.dataset.theme = stored;
  }
  // No stored value -> no data-theme attribute -> styles.css's
  // prefers-color-scheme media query decides, and stays live if the OS
  // theme changes later (no attribute to override it).
}

export function currentEffectiveTheme(): Theme {
  const stored = getStoredTheme();
  if (stored) return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function toggleTheme(): Theme {
  const next: Theme = currentEffectiveTheme() === "dark" ? "light" : "dark";
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Nothing we can do if storage is unavailable - the toggle still
    // applies for this page load via the attribute below, it just won't
    // persist to the next one.
  }
  document.documentElement.dataset.theme = next;
  return next;
}
