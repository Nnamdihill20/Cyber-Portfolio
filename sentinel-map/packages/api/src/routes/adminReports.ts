import { Router } from "express";
import { prisma } from "../db";
import { reportIdParamSchema } from "../lib/validation";
import { requireAdmin } from "../middleware/requireAdmin";

export const adminReportsRouter = Router();

// Every route here requires a valid admin session - applied once for the
// whole router rather than per-route, so a new route added later can't
// accidentally ship unprotected.
adminReportsRouter.use(requireAdmin);

// GET /api/admin/reports/flagged - every report with at least one flag,
// including ones below the hide threshold, so moderators can catch a
// pattern early rather than only seeing reports the public can no longer
// see. Includes expired reports too (a flag on something already expired
// is still a useful signal about a reporter or a location).
adminReportsRouter.get("/flagged", async (_req, res) => {
  const reports = await prisma.activityReport.findMany({
    where: { flaggedCount: { gt: 0 } },
    orderBy: [{ flaggedCount: "desc" }, { createdAt: "desc" }],
  });
  // reporterHash stays out of the admin UI too - moderators review report
  // *content*, not who sent it (see docs/LEGAL.md); if abuse patterns ever
  // need cross-report correlation, that's a deliberate follow-up decision,
  // not a side effect of this list happening to include the field.
  const publicShape = reports.map(({ reporterHash: _reporterHash, ...rest }) => rest);
  res.json({ reports: publicShape });
});

// POST /api/admin/reports/:id/restore - clears flags, returning the report
// to normal visibility (a moderator judged the flags weren't warranted).
adminReportsRouter.post("/:id/restore", async (req, res) => {
  const parsed = reportIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid report id" });
  }

  const existing = await prisma.activityReport.findUnique({ where: { id: parsed.data.id } });
  if (!existing) {
    return res.status(404).json({ error: "Report not found" });
  }

  await prisma.activityReport.update({
    where: { id: parsed.data.id },
    data: { flaggedCount: 0 },
  });
  res.json({ ok: true });
});

// DELETE /api/admin/reports/:id - a moderator judged the flags were
// warranted (spam, harassment, fabricated). Hard delete, consistent with
// this layer never being a permanent record (see docs/LEGAL.md) - there is
// no soft-delete/audit-log tier here by design.
adminReportsRouter.delete("/:id", async (req, res) => {
  const parsed = reportIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid report id" });
  }

  const existing = await prisma.activityReport.findUnique({ where: { id: parsed.data.id } });
  if (!existing) {
    return res.status(404).json({ error: "Report not found" });
  }

  await prisma.activityReport.delete({ where: { id: parsed.data.id } });
  res.json({ ok: true });
});
