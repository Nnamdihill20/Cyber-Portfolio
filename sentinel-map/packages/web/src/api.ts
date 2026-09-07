export interface AlprCamera {
  id: string;
  latitude: number;
  longitude: number;
  vendor: string;
  mountType?: string | null;
  ownerType?: string | null;
  confidence: string;
}

export interface Facility {
  id: string;
  latitude: number;
  longitude: number;
  name: string;
  type: string;
  jurisdiction: string;
  address?: string | null;
  phone?: string | null;
}

export interface ActivityReport {
  id: string;
  latitude: number;
  longitude: number;
  activityType: string;
  description?: string | null;
  corroborations: number;
  createdAt: string;
  expiresAt: string;
}

export interface LegalAidOrg {
  id: string;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  website?: string | null;
  languages: string[];
  specialty?: string | null;
  hours?: string | null;
}

export interface KnowYourRightsContent {
  state: string;
  language: string;
  title: string;
  body: string;
}

const BASE = "/api";

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export function fetchCamerasNearby(lat: number, lon: number, radiusKm: number) {
  return getJSON<{ cameras: AlprCamera[] }>(
    `${BASE}/cameras/nearby?lat=${lat}&lon=${lon}&radiusKm=${radiusKm}`
  ).then((r) => r.cameras);
}

export function fetchFacilitiesNearby(lat: number, lon: number, radiusKm: number) {
  return getJSON<{ facilities: Facility[] }>(
    `${BASE}/facilities/nearby?lat=${lat}&lon=${lon}&radiusKm=${radiusKm}`
  ).then((r) => r.facilities);
}

export function fetchReportsNearby(lat: number, lon: number, radiusKm: number) {
  return getJSON<{ reports: ActivityReport[] }>(
    `${BASE}/reports/nearby?lat=${lat}&lon=${lon}&radiusKm=${radiusKm}`
  ).then((r) => r.reports);
}

export async function submitReport(input: {
  latitude: number;
  longitude: number;
  activityType: string;
  description?: string;
}) {
  const res = await fetch(`${BASE}/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Submit failed: ${res.status}`);
  return res.json();
}

export async function flagReport(id: string) {
  const res = await fetch(`${BASE}/reports/${id}/flag`, { method: "POST" });
  if (!res.ok) throw new Error(`Flag failed: ${res.status}`);
  return res.json() as Promise<{ hidden: boolean }>;
}

export function fetchLegalAidNearby(lat: number, lon: number, radiusKm: number) {
  return getJSON<{ orgs: LegalAidOrg[] }>(
    `${BASE}/legal-aid/nearby?lat=${lat}&lon=${lon}&radiusKm=${radiusKm}`
  ).then((r) => r.orgs);
}

export async function fetchKnowYourRights(state: string, lang: string) {
  const res = await fetch(`${BASE}/know-your-rights?state=${state}&lang=${lang}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  const data = (await res.json()) as { content: KnowYourRightsContent };
  return data.content;
}
