import type { NextFunction, Request, Response } from "express";

/**
 * In-memory sliding-window rate limiter, keyed by an arbitrary string
 * (e.g. a reporter hash). Fine for a single-instance MVP; swap for a
 * Redis-backed limiter before running more than one API instance or before
 * public launch (state here doesn't survive a restart or scale out).
 */
export function makeRateLimiter(opts: { windowMs: number; max: number }) {
  const hits = new Map<string, number[]>();

  return function rateLimit(
    keyFn: (req: Request) => string
  ) {
    return (req: Request, res: Response, next: NextFunction) => {
      const key = keyFn(req);
      const now = Date.now();
      const windowStart = now - opts.windowMs;

      const recent = (hits.get(key) ?? []).filter((t) => t > windowStart);
      if (recent.length >= opts.max) {
        res.status(429).json({ error: "Too many submissions, try again later." });
        return;
      }

      recent.push(now);
      hits.set(key, recent);
      next();
    };
  };
}
