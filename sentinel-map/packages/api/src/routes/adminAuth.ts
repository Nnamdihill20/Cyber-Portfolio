import { Router } from "express";
import { prisma } from "../db";
import {
  ADMIN_COOKIE_NAME,
  adminCookieOptions,
  hashPassword,
  signAdminSession,
  verifyPassword,
} from "../lib/adminAuth";
import { adminLoginSchema } from "../lib/validation";
import { makeRateLimiter } from "../middleware/rateLimit";
import { requireAdmin } from "../middleware/requireAdmin";

export const adminAuthRouter = Router();

// A real bcrypt hash of an arbitrary, never-used password - compared
// against on a login attempt for a username that doesn't exist, so that
// path takes roughly the same time as a real password check instead of
// returning early and leaking "that username doesn't exist" through a
// timing difference. Computed lazily, once, on first use (rather than a
// fire-and-forget promise at module load) so there's no startup race where
// an early request could hit it before it resolves.
let dummyHashPromise: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  if (!dummyHashPromise) {
    dummyHashPromise = hashPassword("not-a-real-password-timing-decoy");
  }
  return dummyHashPromise;
}

// Brute-force defense on login, keyed by IP (there's no reporter hash
// concept pre-authentication). Deliberately tighter than the public
// submission limits - failed login attempts are a much stronger abuse
// signal than an extra map pin.
const loginLimiter = makeRateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }); // 10 attempts / 15 min / IP
const loginRateLimit = loginLimiter((req) => req.ip ?? "unknown");

// POST /api/admin/login
adminAuthRouter.post("/login", loginRateLimit, async (req, res) => {
  const parsed = adminLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { username, password } = parsed.data;

  const user = await prisma.adminUser.findUnique({ where: { username } });
  // Same generic error whether the username doesn't exist or the password
  // is wrong - never reveal which one it was (that's a username-enumeration
  // oracle). Compare against a dummy hash on a miss so a nonexistent
  // username doesn't respond measurably faster than a real one.
  const ok = user
    ? await verifyPassword(password, user.passwordHash)
    : await verifyPassword(password, await getDummyHash());

  if (!user || !ok) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const token = signAdminSession({ sub: user.id, username: user.username });
  res.cookie(ADMIN_COOKIE_NAME, token, adminCookieOptions());
  res.json({ username: user.username });
});

// POST /api/admin/logout
adminAuthRouter.post("/logout", (_req, res) => {
  const { maxAge: _maxAge, ...clearOptions } = adminCookieOptions();
  res.clearCookie(ADMIN_COOKIE_NAME, clearOptions);
  res.json({ ok: true });
});

// GET /api/admin/me - lets the admin UI check whether its session is live.
adminAuthRouter.get("/me", requireAdmin, (req, res) => {
  res.json({ username: req.admin!.username });
});
