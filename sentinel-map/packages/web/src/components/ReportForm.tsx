import { useState } from "react";

interface Props {
  lat: number;
  lon: number;
  onSubmit: (activityType: string, description: string, honeypot: string) => Promise<void>;
  onCancel: () => void;
}

const ACTIVITY_TYPES = [
  { value: "CHECKPOINT", label: "Checkpoint" },
  { value: "PATROL_PRESENCE", label: "Patrol presence" },
  { value: "RAID_REPORTED", label: "Raid reported" },
  { value: "OTHER", label: "Other" },
];

export function ReportForm({ lat, lon, onSubmit, onCancel }: Props) {
  const [activityType, setActivityType] = useState("PATROL_PRESENCE");
  const [description, setDescription] = useState("");
  // Bot deterrent: hidden from real users (see .hp-field in styles.css and
  // aria-hidden/tabIndex below), so only an automated script that blindly
  // fills every field it finds will populate this. See lib/validation.ts
  // and routes/reports.ts on the API side for how a filled value is handled.
  const [honeypot, setHoneypot] = useState("");
  // Without this, a fast double-click (or a slow connection) can fire a
  // second request before the first one's response closes this form - two
  // near-identical reports instead of one. On success the parent unmounts
  // this component anyway; on failure this resets so the user can retry.
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit(activityType, description, honeypot);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="report-form-backdrop">
      <div className="report-form">
        <h2>Report activity</h2>
        <p className="hint">
          {lat.toFixed(5)}, {lon.toFixed(5)} — anonymous, expires automatically in a
          few hours.
        </p>

        <label>
          Type
          <select value={activityType} onChange={(e) => setActivityType(e.target.value)}>
            {ACTIVITY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Description (optional, no names)
          <textarea
            maxLength={280}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. 'several vehicles parked near the intersection'"
          />
          <span className="char-count">{description.length}/280</span>
        </label>

        <label className="hp-field" aria-hidden="true">
          Website
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </label>

        <div className="report-form-actions">
          <button onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
          <button className="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
