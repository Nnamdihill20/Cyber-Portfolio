import { useEffect, useState } from "react";
import {
  fetchKnowYourRights,
  fetchLegalAidNearby,
  type KnowYourRightsContent,
  type LegalAidOrg,
} from "../api";

const US_STATES = [
  "FEDERAL", "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI",
  "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS",
  "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR",
  "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

interface Props {
  center: [number, number]; // [lon, lat]
  onClose: () => void;
}

export function ResourcesPanel({ center, onClose }: Props) {
  const [tab, setTab] = useState<"rights" | "legal-aid">("rights");
  const [state, setState] = useState("FEDERAL");
  const [lang, setLang] = useState("en");
  const [content, setContent] = useState<KnowYourRightsContent | null>(null);
  const [orgs, setOrgs] = useState<LegalAidOrg[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tab !== "rights") return;
    setLoading(true);
    fetchKnowYourRights(state, lang)
      .then(setContent)
      .catch(() => setContent(null))
      .finally(() => setLoading(false));
  }, [tab, state, lang]);

  useEffect(() => {
    if (tab !== "legal-aid") return;
    const [lon, lat] = center;
    setLoading(true);
    fetchLegalAidNearby(lat, lon, 25)
      .then(setOrgs)
      .catch(() => setOrgs([]))
      .finally(() => setLoading(false));
  }, [tab, center]);

  return (
    <div className="resources-panel-backdrop" onClick={onClose}>
      <div className="resources-panel" onClick={(e) => e.stopPropagation()}>
        <div className="resources-panel-header">
          <div className="resources-tabs">
            <button
              className={tab === "rights" ? "tab active" : "tab"}
              onClick={() => setTab("rights")}
            >
              Know your rights
            </button>
            <button
              className={tab === "legal-aid" ? "tab active" : "tab"}
              onClick={() => setTab("legal-aid")}
            >
              Legal aid nearby
            </button>
          </div>
          <button className="close-button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {tab === "rights" && (
          <div className="resources-body">
            <div className="rights-controls">
              <label>
                State
                <select value={state} onChange={(e) => setState(e.target.value)}>
                  {US_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s === "FEDERAL" ? "General (all states)" : s}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Language
                <select value={lang} onChange={(e) => setLang(e.target.value)}>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </label>
            </div>
            {loading && <p className="hint">Loading...</p>}
            {!loading && content && (
              <>
                <h3>{content.title}</h3>
                <p className="rights-body">{content.body}</p>
              </>
            )}
            {!loading && !content && (
              <p className="hint">
                No content available yet for this state/language combination.
              </p>
            )}
          </div>
        )}

        {tab === "legal-aid" && (
          <div className="resources-body">
            {loading && <p className="hint">Loading...</p>}
            {!loading && orgs.length === 0 && (
              <p className="hint">No legal aid organizations loaded for this area yet.</p>
            )}
            <ul className="legal-aid-list">
              {orgs.map((org) => (
                <li key={org.id}>
                  <strong>{org.name}</strong>
                  {org.specialty && <span className="tag">{org.specialty}</span>}
                  <div className="legal-aid-details">
                    {org.phone && <div>📞 {org.phone}</div>}
                    {org.website && (
                      <div>
                        🔗{" "}
                        <a href={org.website} target="_blank" rel="noreferrer">
                          {org.website}
                        </a>
                      </div>
                    )}
                    {org.hours && <div>🕒 {org.hours}</div>}
                    {org.languages.length > 0 && (
                      <div>🗣 {org.languages.join(", ")}</div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
