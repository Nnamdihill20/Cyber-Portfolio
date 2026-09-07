import { z } from "zod";

export const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(0.1).max(100).default(5),
});

export const createReportSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  activityType: z.enum([
    "CHECKPOINT",
    "PATROL_PRESENCE",
    "RAID_REPORTED",
    "OTHER",
  ]),
  description: z.string().max(280).optional(),
});

export const createCameraSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  vendor: z
    .enum([
      "FLOCK",
      "MOTOROLA_VIGILANT",
      "GENETEC",
      "REKOR",
      "NEOLOGY",
      "ELSAG",
      "JENOPTIK",
      "COBAN",
      "OTHER",
      "UNKNOWN",
    ])
    .default("UNKNOWN"),
  mountType: z
    .enum(["FIXED_POLE", "MOBILE_PATROL", "TRAILER", "TOLL_GANTRY", "BUSINESS_OWNED"])
    .optional(),
  ownerType: z
    .enum(["POLICE_DEPT", "HOA", "PRIVATE_BUSINESS", "TOLL_AUTHORITY", "UNKNOWN"])
    .optional(),
  ownerName: z.string().max(120).optional(),
  notes: z.string().max(280).optional(),
});

const US_STATE_CODE = /^([A-Z]{2}|FEDERAL)$/;

export const knowYourRightsQuerySchema = z.object({
  state: z
    .string()
    .transform((s) => s.toUpperCase())
    .refine((s) => US_STATE_CODE.test(s), "state must be a 2-letter code or FEDERAL")
    .default("FEDERAL"),
  lang: z.string().min(2).max(5).default("en"),
});
