import { Router } from "express";
import { prisma } from "../db";
import { boundingBox, haversineKm } from "../lib/geo";
import { createCameraSchema, nearbyQuerySchema } from "../lib/validation";

export const camerasRouter = Router();

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
camerasRouter.post("/", async (req, res) => {
  const parsed = createCameraSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const camera = await prisma.alprCamera.create({
    data: {
      ...parsed.data,
      source: "community_submission",
      confidence: "COMMUNITY_REPORTED",
    },
  });

  res.status(201).json({ camera });
});
