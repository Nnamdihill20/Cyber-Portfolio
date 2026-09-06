import "dotenv/config";
import cors from "cors";
import express from "express";
import { camerasRouter } from "./routes/cameras";
import { facilitiesRouter } from "./routes/facilities";
import { reportsRouter } from "./routes/reports";

const app = express();
app.set("trust proxy", true); // needed for req.ip to reflect the real client behind a proxy/LB

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/cameras", camerasRouter);
app.use("/api/facilities", facilitiesRouter);
app.use("/api/reports", reportsRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`Sentinel Map API listening on :${port}`);
});
