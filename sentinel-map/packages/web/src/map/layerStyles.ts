// Color coding kept centralized so the map, sidebar legend, and popups agree.

export const VENDOR_COLORS: Record<string, string> = {
  FLOCK: "#e05252",
  MOTOROLA_VIGILANT: "#e0a052",
  GENETEC: "#52a0e0",
  REKOR: "#a052e0",
  NEOLOGY: "#52e0a0",
  ELSAG: "#e0d652",
  JENOPTIK: "#d652e0",
  COBAN: "#52e0d6",
  OTHER: "#999999",
  UNKNOWN: "#666666",
};

export const FACILITY_COLORS: Record<string, string> = {
  POLICE_STATION: "#2b6cb0",
  SHERIFF_OFFICE: "#2c5282",
  ICE_FIELD_OFFICE: "#9b2c2c",
  ICE_DETENTION_FACILITY: "#742a2a",
  CBP_OFFICE: "#975a16",
  IMMIGRATION_COURT: "#6b46c1",
  COURTHOUSE: "#4a5568",
  DHS_OFFICE: "#9b2c2c",
  NATIONAL_GUARD_ARMORY: "#276749",
};

export const ACTIVITY_COLORS: Record<string, string> = {
  CHECKPOINT: "#dd6b20",
  PATROL_PRESENCE: "#d69e2e",
  RAID_REPORTED: "#c53030",
  OTHER: "#718096",
};
