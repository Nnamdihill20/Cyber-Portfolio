import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const BCRYPT_ROUNDS = 12;
const SESSION_COOKIE_NAME = "sentinel_admin_session";
const SESSION_TTL = "8h";

const DEFAULT_DEV_SECRET = "dev-only-change-me";

function getJwtSecret(): string {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (process.env.NODE_ENV === "production" && (!secret || secret === DEFAULT_DEV_SECRET)) {
    // Fail closed: an admin session is a full auth bypass if this secret is
    // guessable, unlike the reporter-hash salt (which only weakens
    // correlation, not access). Refuse to start rather than run insecurely.
    throw new Error(
      "ADMIN_JWT_SECRET must be set to a real secret in production (see .env.example)."
    );
  }
  return secret ?? DEFAULT_DEV_SECRET;
}

export interface AdminSessionPayload {
  sub: string; // admin user id
  username: string;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signAdminSession(payload: AdminSessionPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: SESSION_TTL });
}

export function verifyAdminSession(token: string): AdminSessionPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as AdminSessionPayload;
  } catch {
    return null; // expired, tampered, or wrong secret - all treated the same
  }
}

export const ADMIN_COOKIE_NAME = SESSION_COOKIE_NAME;

export function adminCookieOptions() {
  return {
    httpOnly: true,
    // sameSite=strict is the real CSRF defense here (the browser simply
    // won't attach this cookie to a cross-site request, form-based or
    // fetch-based) - it assumes the admin UI and this API are served from
    // the same origin in production. See docs/SECURITY.md.
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 8 * 60 * 60 * 1000, // 8h, matches SESSION_TTL
    path: "/",
  };
}
