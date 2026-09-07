import { Router } from "express";
import { prisma } from "../db";
import { knowYourRightsQuerySchema } from "../lib/validation";

export const knowYourRightsRouter = Router();

interface StoredBody {
  intro: string;
  bullets: string[];
}

// `body` is stored as JSON ({ intro, bullets } - see schema.prisma for why
// it's structured instead of a flat prose string) - parsing it is a backend
// concern, so clients get clean `intro`/`bullets` fields directly rather
// than a JSON string every consumer would have to know to parse itself.
function parseBody(raw: string): StoredBody {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.intro === "string" && Array.isArray(parsed.bullets)) {
      return parsed;
    }
  } catch {
    // fall through
  }
  // Defensive fallback for a malformed row - surface something rather than
  // a blank panel, without throwing a 500 over a content data issue.
  return { intro: raw, bullets: [] };
}

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
      const { intro, bullets } = parseBody(content.body);
      return res.json({
        content: {
          state: content.state,
          language: content.language,
          title: content.title,
          intro,
          bullets,
        },
        exactMatch: where.state === state && where.language === lang,
      });
    }
  }

  res.status(404).json({ error: "No know-your-rights content available yet." });
});
