import { Router } from "express";
import type { ActivityReport } from "@prisma/client";
import { prisma } from "../db";
import { boundingBox, haversineKm, reporterHash } from "../lib/geo";
import { createReportSchema, nearbyQuerySchema, reportIdParamSchema } from "../lib/validation";
import { makeRateLimiter } from "../middleware/rateLimit";

export const reportsRouter = Router();

const CORROBORATION_RADIUS_KM = 0.15; // ~150m
const TTL_MINUTES = Number(process.env.REPORT_TTL_MINUTES ?? 180);
const SALT = process.env.REPORTER_HASH_SALT ?? "dev-only-change-me";
// A report with this many flags is hidden from results pending human review,
// rather than deleted outright - see docs/MODERATION.md.
const FLAG_THRESHOLD = Number(process.env.REPORT_FLAG_THRESHOLD ?? 3);

const submitLimiter = makeRateLimiter({ windowMs: 10 * 60 * 1000, max: 5 }); // 5 reports / 10 min / reporter
const reportRateLimit = submitLimiter((req) => {
  const ip = req.ip ?? "unknown";
  const ua = req.get("user-agent") ?? "unknown";
  return reporterHash(ip, ua, SALT);
});

// Separate, more generous limiter for flagging - flagging is meant to be
// cheap for genuine users, but still bounded so one reporter hash can't mass-
// flag many reports to censor them.
const flagLimiter = makeRateLimiter({ windowMs: 60 * 60 * 1000, max: 20 }); // 20 flags / hour / reporter
const flagRateLimit = flagLimiter((req) => {
  const ip = req.ip ?? "unknown";
  const ua = req.get("user-agent") ?? "unknown";
  return reporterHash(ip, ua, SALT);
});

// reporterHash never leaves this file: it's an internal correlation key for
// rate limiting and corroboration-merge lookups, not something any client
// needs. Returning it in API responses would hand every viewer a stable,
// crossable ID that identifies "these reports came from the same device" -
// directly undermining the anonymity this layer is built around (see
// docs/LEGAL.md). Every response goes through this before res.json().
function toPublicReport(report: ActivityReport) {
  const { reporterHash: _reporterHash, ...publicFields } = report;
  return publicFields;
}

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
      flaggedCount: { lt: FLAG_THRESHOLD },
    },
  });

  const reports = candidates.filter(
    (r) => haversineKm(lat, lon, r.latitude, r.longitude) <= radiusKm
  );

  res.json({ reports: reports.map(toPublicReport) });
});

// POST /api/reports - anonymous submission. Rate-limited per reporter hash;
// merges into an existing nearby unexpired report of the same type instead
// of creating a duplicate pin. See docs/MODERATION.md.
reportsRouter.post("/", reportRateLimit, async (req, res) => {
  const parsed = createReportSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { latitude, longitude, activityType, description, honeypot } = parsed.data;

  // Bot deterrent: a hidden field no human ever fills in (see
  // lib/validation.ts). Respond exactly like a real submission - a bot that
  // sees an error or a different response shape learns to stop sending the
  // field, defeating the point - but never write anything to the database.
  if (honeypot) {
    return res.status(201).json({
      report: {
        id: "00000000-0000-0000-0000-000000000000",
        latitude,
        longitude,
        activityType,
        description: description ?? null,
        corroborations: 1,
        flaggedCount: 0,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + TTL_MINUTES * 60 * 1000).toISOString(),
      },
      corroborated: false,
    });
  }

  const ip = req.ip ?? "unknown";
  const ua = req.get("user-agent") ?? "unknown";
  const hash = reporterHash(ip, ua, SALT);

  const bbox = boundingBox(latitude, longitude, CORROBORATION_RADIUS_KM);
  const nearbyCandidates = await prisma.activityReport.findMany({
    where: {
      activityType,
      expiresAt: { gt: new Date() },
      flaggedCount: { lt: FLAG_THRESHOLD },
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
    return res.status(200).json({ report: toPublicReport(updated), corroborated: true });
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

  res.status(201).json({ report: toPublicReport(created), corroborated: false });
});

// POST /api/reports/:id/flag - anonymous "this looks wrong" flag. A report
// hits FLAG_THRESHOLD flags and it's excluded from results pending human
// review, rather than deleted (so it isn't gone before anyone can look at
// why it got flagged). See docs/MODERATION.md.
reportsRouter.post("/:id/flag", flagRateLimit, async (req, res) => {
  const parsedParams = reportIdParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return res.status(400).json({ error: "Invalid report id" });
  }
  const { id } = parsedParams.data;

  const existing = await prisma.activityReport.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: "Report not found" });
  }

  const updated = await prisma.activityReport.update({
    where: { id },
    data: { flaggedCount: { increment: 1 } },
  });

  res.json({
    report: toPublicReport(updated),
    hidden: updated.flaggedCount >= FLAG_THRESHOLD,
  });
});
