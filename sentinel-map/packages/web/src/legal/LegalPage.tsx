import type { ReactNode } from "react";
import { ThemeToggle } from "../components/ThemeToggle";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="legal-page">
      <div className="legal-page-content">
        <div className="legal-page-topbar">
          <a className="legal-back-link" href="/">
            &larr; Back to the map
          </a>
          <ThemeToggle />
        </div>
        <h1>{title}</h1>
        {children}
      </div>
    </div>
  );
}
