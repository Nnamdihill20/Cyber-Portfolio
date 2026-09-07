import { Router } from "express";
import { prisma } from "../db";
import { knowYourRightsQuerySchema } from "../lib/validation";

export const knowYourRightsRouter = Router();

// GET /api/know-your-rights?state=IL&lang=en
// Falls back state -> FEDERAL, then lang -> en, so there's always something
// to show even for a state/language combination with no dedicated entry.
knowYourRightsRouter.get("/", async (req, res) => {
  const parsed = knowYourRightsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { state, lang } = parsed.data;

  const attempts: Array<{ state: string; language: string }> = [
    { state, language: lang },
    { state, language: "en" },
    { state: "FEDERAL", language: lang },
    { state: "FEDERAL", language: "en" },
  ];

  for (const where of attempts) {
    const content = await prisma.knowYourRightsContent.findUnique({
      where: { state_language: where },
    });
    if (content) {
      return res.json({ content, exactMatch: where.state === state && where.language === lang });
    }
  }

  res.status(404).json({ error: "No know-your-rights content available yet." });
});
