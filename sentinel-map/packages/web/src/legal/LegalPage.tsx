import type { ReactNode } from "react";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="legal-page">
      <div className="legal-page-content">
        <a className="legal-back-link" href="/">
          &larr; Back to the map
        </a>
        <h1>{title}</h1>
        {children}
      </div>
    </div>
  );
}
