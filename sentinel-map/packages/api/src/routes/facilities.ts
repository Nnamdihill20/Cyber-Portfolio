import { Router } from "express";
import { FacilityType } from "@prisma/client";
import { prisma } from "../db";
import { boundingBox, haversineKm } from "../lib/geo";
import { nearbyQuerySchema } from "../lib/validation";

export const facilitiesRouter = Router();

// GET /api/facilities/nearby?lat=&lon=&radiusKm=&type=
// Read-only: facilities come from bulk import (see /seed), not user submission.
facilitiesRouter.get("/nearby", async (req, res) => {
  const parsed = nearbyQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { lat, lon, radiusKm } = parsed.data;
  const bbox = boundingBox(lat, lon, radiusKm);
  const rawType = typeof req.query.type === "string" ? req.query.type : undefined;
  const type = rawType && rawType in FacilityType ? (rawType as FacilityType) : undefined;

  const candidates = await prisma.facility.findMany({
    where: {
      latitude: { gte: bbox.minLat, lte: bbox.maxLat },
      longitude: { gte: bbox.minLon, lte: bbox.maxLon },
      ...(type ? { type } : {}),
    },
  });

  const facilities = candidates.filter(
    (f) => haversineKm(lat, lon, f.latitude, f.longitude) <= radiusKm
  );

  res.json({ facilities });
});
