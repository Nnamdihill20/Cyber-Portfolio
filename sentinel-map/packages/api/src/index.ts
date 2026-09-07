import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { camerasRouter } from "./routes/cameras";
import { facilitiesRouter } from "./routes/facilities";
import { knowYourRightsRouter } from "./routes/knowYourRights";
import { legalAidRouter } from "./routes/legalAid";
import { reportsRouter } from "./routes/reports";

const app = express();
app.set("trust proxy", true); // needed for req.ip to reflect the real client behind a proxy/LB

// Express's default query parser ("extended") uses the `qs` package, which
// currently has an unpatched moderate-severity advisory with no fix
// available yet for the Express 4.x line (only Express 5, a breaking
// migration - see docs/SECURITY.md). "simple" uses Node's built-in
// querystring module instead, sidestepping the vulnerable codepath
// entirely. Every query param this API reads (lat, lon, radiusKm, type,
// state, lang) is a flat scalar, so nothing here needs qs's nested/bracket
// syntax - "simple" parses all of it identically.
app.set("query parser", "simple");

app.use(helmet());

// Permissive CORS is intentional here, not an oversight: every response is
// either public read data (cameras/facilities/reports/legal-aid/rights) or
// an anonymous, unauthenticated write - there's no session cookie or
// per-user data for a cross-origin page to steal, so the usual CORS-as-
// CSRF-defense concern doesn't apply the way it would for an authenticated
// app. Revisit this if an authenticated admin/moderation API is added
// alongside this one (see docs/MODERATION.md's "human review queue").
app.use(cors());

app.use(express.json({ limit: "10kb" })); // every payload this API accepts is small; reject the rest outright

// Redirect to HTTPS in production, behind a reverse proxy/load balancer
// (trust proxy is already set above so req.secure reflects X-Forwarded-Proto).
// No-op in local dev (NODE_ENV isn't "production") and safe if the LB
// already terminates TLS and only forwards HTTPS internally.
if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    if (req.secure) return next();
    res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
  });
}

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/cameras", camerasRouter);
app.use("/api/facilities", facilitiesRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/legal-aid", legalAidRouter);
app.use("/api/know-your-rights", knowYourRightsRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // Log the real error server-side, but never let its details (stack
  // trace, query text, file paths) reach the client.
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`Sentinel Map API listening on :${port}`);
});
