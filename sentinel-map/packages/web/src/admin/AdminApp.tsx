import { useEffect, useState } from "react";
import {
  fetchFlaggedReports,
  login,
  logout,
  purgeReport,
  restoreReport,
  whoAmI,
  type FlaggedReport,
} from "./adminApi";

export default function AdminApp() {
  const [username, setUsername] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    whoAmI()
      .then(setUsername)
      .finally(() => setCheckingSession(false));
  }, []);

  if (checkingSession) return null;

  return username ? (
    <Dashboard username={username} onLoggedOut={() => setUsername(null)} />
  ) : (
    <LoginForm onLoggedIn={setUsername} />
  );
}

function LoginForm({ onLoggedIn }: { onLoggedIn: (username: string) => void }) {
  const [usernameInput, setUsernameInput] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const name = await login(usernameInput, password);
      onLoggedIn(name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-login-page">
      <form className="admin-login-form" onSubmit={handleSubmit}>
        <h1>Sentinel Map — Moderation</h1>
        <label>
          Username
          <input
            type="text"
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            autoComplete="username"
            autoFocus
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error && <p className="admin-error">{error}</p>}
        <button type="submit" className="primary" disabled={submitting}>
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}

function Dashboard({ username, onLoggedOut }: { username: string; onLoggedOut: () => void }) {
  const [reports, setReports] = useState<FlaggedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetchFlaggedReports()
      .then(setReports)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleRestore = async (id: string) => {
    setActioningId(id);
    try {
      await restoreReport(id);
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setActioningId(null);
    }
  };

  const handlePurge = async (id: string) => {
    if (!confirm("Permanently delete this report? This cannot be undone.")) return;
    setActioningId(id);
    try {
      await purgeReport(id);
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Purge failed");
    } finally {
      setActioningId(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    onLoggedOut();
  };

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>Flagged reports</h1>
        <div className="admin-header-actions">
          <span className="admin-username">{username}</span>
          <button onClick={load}>Refresh</button>
          <button onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      {loading && <p className="hint">Loading...</p>}
      {error && <p className="admin-error">{error}</p>}
      {!loading && reports.length === 0 && !error && (
        <p className="hint">No flagged reports right now.</p>
      )}

      <div className="admin-table-scroll">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Description</th>
            <th>Location</th>
            <th>Flags</th>
            <th>Corrob.</th>
            <th>Reported</th>
            <th>Expires</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((r) => (
            <tr key={r.id} className={r.flaggedCount >= 3 ? "hidden-row" : undefined}>
              <td>{r.activityType}</td>
              <td className="admin-description-cell">{r.description || <em>none</em>}</td>
              <td>
                {r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}
              </td>
              <td>
                <span className="flag-count">{r.flaggedCount}</span>
                {r.flaggedCount >= 3 && <span className="tag hidden-tag">hidden from public</span>}
              </td>
              <td>{r.corroborations}</td>
              <td>{new Date(r.createdAt).toLocaleString()}</td>
              <td>{new Date(r.expiresAt).toLocaleString()}</td>
              <td className="admin-actions-cell">
                <button
                  disabled={actioningId === r.id}
                  onClick={() => handleRestore(r.id)}
                >
                  Restore
                </button>
                <button
                  className="danger"
                  disabled={actioningId === r.id}
                  onClick={() => handlePurge(r.id)}
                >
                  Purge
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
