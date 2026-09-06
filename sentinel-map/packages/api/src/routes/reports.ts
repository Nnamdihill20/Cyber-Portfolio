import { Router } from "express";
import { prisma } from "../db";
import { boundingBox, haversineKm, reporterHash } from "../lib/geo";
import { createReportSchema, nearbyQuerySchema } from "../lib/validation";
import { makeRateLimiter } from "../middleware/rateLimit";

export const reportsRouter = Router();

const CORROBORATION_RADIUS_KM = 0.15; // ~150m
const TTL_MINUTES = Number(process.env.REPORT_TTL_MINUTES ?? 180);
const SALT = process.env.REPORTER_HASH_SALT ?? "dev-only-change-me";

const limiter = makeRateLimiter({ windowMs: 10 * 60 * 1000, max: 5 }); // 5 reports / 10 min / reporter
const reportRateLimit = limiter((req) => {
  const ip = req.ip ?? "unknown";
  const ua = req.get("user-agent") ?? "unknown";
  return reporterHash(ip, ua, SALT);
});

// GET /api/reports/nearby?lat=&lon=&radiusKm= - only unexpired reports.
reportsRouter.get("/nearby", async (req, res) => {
  const parsed = nearbyQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { lat, lon, radiusKm } = parsed.data;
  const bbox = boundingBox(lat, lon, radiusKm);

  const candidates = await prisma.activityReport.findMany({
    where: {
      latitude: { gte: bbox.minLat, lte: bbox.maxLat },
      longitude: { gte: bbox.minLon, lte: bbox.maxLon },
      expiresAt: { gt: new Date() },
    },
  });

  const reports = candidates.filter(
    (r) => haversineKm(lat, lon, r.latitude, r.longitude) <= radiusKm
  );

  res.json({ reports });
});

// POST /api/reports - anonymous submission. Rate-limited per reporter hash;
// merges into an existing nearby unexpired report of the same type instead
// of creating a duplicate pin. See docs/MODERATION.md.
reportsRouter.post("/", reportRateLimit, async (req, res) => {
  const parsed = createReportSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { latitude, longitude, activityType, description } = parsed.data;

  const ip = req.ip ?? "unknown";
  const ua = req.get("user-agent") ?? "unknown";
  const hash = reporterHash(ip, ua, SALT);

  const bbox = boundingBox(latitude, longitude, CORROBORATION_RADIUS_KM);
  const nearbyCandidates = await prisma.activityReport.findMany({
    where: {
      activityType,
      expiresAt: { gt: new Date() },
      latitude: { gte: bbox.minLat, lte: bbox.maxLat },
      longitude: { gte: bbox.minLon, lte: bbox.maxLon },
    },
  });
  const existing = nearbyCandidates.find(
    (r) =>
      haversineKm(latitude, longitude, r.latitude, r.longitude) <=
      CORROBORATION_RADIUS_KM
  );

  if (existing) {
    const updated = await prisma.activityReport.update({
      where: { id: existing.id },
      data: { corroborations: { increment: 1 } },
    });
    return res.status(200).json({ report: updated, corroborated: true });
  }

  const created = await prisma.activityReport.create({
    data: {
      latitude,
      longitude,
      activityType,
      description,
      reporterHash: hash,
      expiresAt: new Date(Date.now() + TTL_MINUTES * 60 * 1000),
    },
  });

  res.status(201).json({ report: created, corroborated: false });
});
