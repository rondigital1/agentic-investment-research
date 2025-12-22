import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "@clerk/clerk-sdk-node";

export type AuthedRequest = Request & { auth?: { userId: string } };

export async function requireClerkAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "missing_token" });

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
      issuer: null
    });
    // Clerk user id lives in the JWT "sub" claim
    req.auth = { userId: payload.sub };

    return next();
  } catch {
    return res.status(401).json({ error: "unauthorized" });
  }
}