import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";

export function getUserId(req: Request): string | null {
  try {
    const auth = getAuth(req);
    return auth?.userId ?? null;
  } catch {
    return null;
  }
}

export function requireUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  (req as Request & { userId: string }).userId = userId;
  next();
}

export type AuthedRequest = Request & { userId: string };
