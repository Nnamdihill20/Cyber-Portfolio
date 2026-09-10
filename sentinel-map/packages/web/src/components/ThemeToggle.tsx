import { useEffect, useState } from "react";
import { currentEffectiveTheme, toggleTheme } from "../lib/theme";

export function ThemeToggle({ className }: { className?: string }) {
  // Read on mount, not at module scope - matchMedia isn't available during
  // server-side anything, and this keeps it correct if the OS theme is
  // what's actually in effect (no explicit override stored yet).
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => setTheme(currentEffectiveTheme()), []);

  return (
    <button
      type="button"
      className={className ? `${className} theme-toggle` : "theme-toggle"}
      onClick={() => setTheme(toggleTheme())}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? "☀️" : "\u{1F319}"}
    </button>
  );
}
