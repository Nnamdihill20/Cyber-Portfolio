import { Router } from "express";
import { prisma } from "../db";
import { boundingBox, haversineKm } from "../lib/geo";
import { nearbyQuerySchema } from "../lib/validation";

export const legalAidRouter = Router();

// GET /api/legal-aid/nearby?lat=&lon=&radiusKm=
// Returns orgs within radiusKm of the point, PLUS every statewide/national
// hotline (latitude/longitude null) regardless of distance - those serve
// callers everywhere, so geo-filtering them out would just hide them.
legalAidRouter.get("/nearby", async (req, res) => {
  const parsed = nearbyQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { lat, lon, radiusKm } = parsed.data;
  const bbox = boundingBox(lat, lon, radiusKm);

  const [localCandidates, national] = await Promise.all([
    prisma.legalAidOrg.findMany({
      where: {
        latitude: { gte: bbox.minLat, lte: bbox.maxLat },
        longitude: { gte: bbox.minLon, lte: bbox.maxLon },
      },
    }),
    prisma.legalAidOrg.findMany({ where: { latitude: null } }),
  ]);

  const local = localCandidates.filter(
    (o) =>
      o.latitude !== null &&
      o.longitude !== null &&
      haversineKm(lat, lon, o.latitude, o.longitude) <= radiusKm
  );

  res.json({ orgs: [...local, ...national] });
});
