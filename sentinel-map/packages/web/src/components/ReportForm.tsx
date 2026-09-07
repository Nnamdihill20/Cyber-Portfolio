import { useState } from "react";

interface Props {
  lat: number;
  lon: number;
  onSubmit: (activityType: string, description: string, honeypot: string) => void;
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
          <button onClick={onCancel}>Cancel</button>
          <button
            className="primary"
            onClick={() => onSubmit(activityType, description, honeypot)}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
