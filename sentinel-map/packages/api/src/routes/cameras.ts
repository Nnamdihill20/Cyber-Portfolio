import { Router } from "express";
import { prisma } from "../db";
import { boundingBox, haversineKm, reporterHash } from "../lib/geo";
import { createCameraSchema, nearbyQuerySchema } from "../lib/validation";
import { makeRateLimiter } from "../middleware/rateLimit";

export const camerasRouter = Router();

const SALT = process.env.REPORTER_HASH_SALT ?? "dev-only-change-me";

// Community camera submission was previously unlimited - the same abuse
// case as activity reports (a script flooding fake pins) applies here too,
// so it gets the same shape of defense. See docs/MODERATION.md.
const submitLimiter = makeRateLimiter({ windowMs: 10 * 60 * 1000, max: 5 }); // 5 submissions / 10 min / reporter
const cameraRateLimit = submitLimiter((req) => {
  const ip = req.ip ?? "unknown";
  const ua = req.get("user-agent") ?? "unknown";
  return reporterHash(ip, ua, SALT);
});

// GET /api/cameras/nearby?lat=&lon=&radiusKm=
camerasRouter.get("/nearby", async (req, res) => {
  const parsed = nearbyQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { lat, lon, radiusKm } = parsed.data;
  const bbox = boundingBox(lat, lon, radiusKm);

  const candidates = await prisma.alprCamera.findMany({
    where: {
      latitude: { gte: bbox.minLat, lte: bbox.maxLat },
      longitude: { gte: bbox.minLon, lte: bbox.maxLon },
    },
  });

  const cameras = candidates.filter(
    (c) => haversineKm(lat, lon, c.latitude, c.longitude) <= radiusKm
  );

  res.json({ cameras });
});

// POST /api/cameras - community submission (e.g. an HOA-owned camera with
// no public record). Always lands as COMMUNITY_REPORTED confidence.
camerasRouter.post("/", cameraRateLimit, async (req, res) => {
  const parsed = createCameraSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { honeypot, ...cameraData } = parsed.data;

  // Bot deterrent - see lib/validation.ts and the matching check in
  // routes/reports.ts for why this fakes success instead of erroring.
  if (honeypot) {
    return res.status(201).json({
      camera: {
        id: "00000000-0000-0000-0000-000000000000",
        ...cameraData,
        source: "community_submission",
        confidence: "COMMUNITY_REPORTED",
        firstReportedAt: new Date().toISOString(),
      },
    });
  }

  const camera = await prisma.alprCamera.create({
    data: {
      ...cameraData,
      source: "community_submission",
      confidence: "COMMUNITY_REPORTED",
    },
  });

  res.status(201).json({ camera });
});
