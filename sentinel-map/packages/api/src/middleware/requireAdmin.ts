import type { NextFunction, Request, Response } from "express";
import { ADMIN_COOKIE_NAME, verifyAdminSession, type AdminSessionPayload } from "../lib/adminAuth";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: AdminSessionPayload;
    }
  }
}

// Protects every /api/admin/reports/* route. Reads the session cookie
// (never a header a script could forge more easily, and never a query
// param that would end up in logs), verifies its signature and expiry, and
// attaches the decoded payload to req.admin for the route to use.
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[ADMIN_COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const session = verifyAdminSession(token);
  if (!session) {
    return res.status(401).json({ error: "Session expired or invalid" });
  }

  req.admin = session;
  next();
}
