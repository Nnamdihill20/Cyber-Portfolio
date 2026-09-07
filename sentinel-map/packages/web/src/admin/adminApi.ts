import type { ActivityReport } from "../api";

// The public ActivityReport type never carries flaggedCount (see api.ts) -
// the admin list is the one place that field is meant to be visible.
export interface FlaggedReport extends ActivityReport {
  flaggedCount: number;
}

const BASE = "/api/admin";

// Every admin call sends the session cookie (credentials: "include") - the
// cookie itself is httpOnly/sameSite=strict (see the API's lib/adminAuth.ts),
// so this is the only way the browser will actually attach it.
async function adminFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  return res;
}

export async function login(username: string, password: string): Promise<string> {
  const res = await adminFetch("/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Login failed: ${res.status}`);
  }
  const data = (await res.json()) as { username: string };
  return data.username;
}

export async function logout(): Promise<void> {
  await adminFetch("/logout", { method: "POST" });
}

export async function whoAmI(): Promise<string | null> {
  const res = await adminFetch("/me");
  if (!res.ok) return null;
  const data = (await res.json()) as { username: string };
  return data.username;
}

export async function fetchFlaggedReports(): Promise<FlaggedReport[]> {
  const res = await adminFetch("/reports/flagged");
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  const data = (await res.json()) as { reports: FlaggedReport[] };
  return data.reports;
}

export async function restoreReport(id: string): Promise<void> {
  const res = await adminFetch(`/reports/${id}/restore`, { method: "POST" });
  if (!res.ok) throw new Error(`Restore failed: ${res.status}`);
}

export async function purgeReport(id: string): Promise<void> {
  const res = await adminFetch(`/reports/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Purge failed: ${res.status}`);
}
