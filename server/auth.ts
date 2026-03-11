import { jwtVerify, SignJWT } from "jose";
import type { Request, Response, NextFunction } from "express";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StaffTokenPayload {
  openId: string; // "staff_{staffAccountId}"
  appId: string; // "cros-workbench"
  name: string;
  role: string; // "staff"
  staffId: number;
}

export interface SessionPayload {
  openId: string;
  name: string;
  staffId: number;
  appId: string;
}

// ─── In-memory user store (replaces DB for this static frontend) ─────────────

interface LocalUser {
  openId: string;
  name: string;
  loginMethod: string;
  staffId: number;
  lastSignedIn: Date;
  createdAt: Date;
}

const userStore = new Map<string, LocalUser>();

export function upsertUser(data: {
  openId: string;
  name: string;
  loginMethod: string;
  staffId: number;
}) {
  const existing = userStore.get(data.openId);
  if (existing) {
    existing.name = data.name;
    existing.loginMethod = data.loginMethod;
    existing.lastSignedIn = new Date();
  } else {
    userStore.set(data.openId, {
      ...data,
      lastSignedIn: new Date(),
      createdAt: new Date(),
    });
  }
  return userStore.get(data.openId)!;
}

export function getUser(openId: string): LocalUser | undefined {
  return userStore.get(openId);
}

// ─── Staff Token verification ────────────────────────────────────────────────

export async function verifyStaffToken(
  token: string
): Promise<StaffTokenPayload | null> {
  try {
    if (!token) return null;
    const secret = new TextEncoder().encode(
      process.env.STAFF_JWT_SECRET || "dev-staff-jwt-secret"
    );
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });
    const { openId, appId, name, role, staffId } = payload as Record<
      string,
      unknown
    >;
    if (!openId || !name) return null;
    return {
      openId: openId as string,
      appId: (appId as string) || "cros-workbench",
      name: name as string,
      role: (role as string) || "staff",
      staffId: (staffId as number) || 0,
    };
  } catch {
    return null;
  }
}

// ─── Session Token creation / verification ───────────────────────────────────

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function getJwtSecret() {
  return new TextEncoder().encode(
    process.env.JWT_SECRET || "dev-local-jwt-secret"
  );
}

export async function createSessionToken(
  payload: SessionPayload
): Promise<string> {
  return new SignJWT({
    openId: payload.openId,
    name: payload.name,
    staffId: payload.staffId,
    appId: payload.appId || "a11-poc-report",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(Math.floor((Date.now() + THIRTY_DAYS_MS) / 1000))
    .sign(getJwtSecret());
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    if (!token) return null;
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      algorithms: ["HS256"],
    });
    return {
      openId: payload.openId as string,
      name: payload.name as string,
      staffId: (payload.staffId as number) || 0,
      appId: (payload.appId as string) || "a11-poc-report",
    };
  } catch {
    return null;
  }
}

// ─── Cookie helpers ──────────────────────────────────────────────────────────

const COOKIE_NAME = "app_session_id";

export function setSessionCookie(req: Request, res: Response, token: string) {
  const secure = req.protocol === "https";
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure,
    sameSite: secure ? "none" : "lax",
    path: "/",
    maxAge: THIRTY_DAYS_MS,
  });
}

export function clearSessionCookie(req: Request, res: Response) {
  const secure = req.protocol === "https";
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure,
    sameSite: secure ? "none" : "lax",
    path: "/",
  });
}

// ─── Auth middleware ─────────────────────────────────────────────────────────

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const session = await verifySessionToken(token);
  if (!session) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
  // Attach to request for downstream use
  (req as any).user = session;
  next();
}
