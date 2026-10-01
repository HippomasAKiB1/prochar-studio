import { Request, Response, NextFunction } from "express";
import { User, IUserDocument } from "../models/User.js";
import { verifyToken, COOKIE_NAME, TokenPayload } from "../services/auth.service.js";

// Extend express Request to include the authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: IUserDocument;
    }
  }
}

/**
 * Authentication middleware.
 * Verifies JWT token from either httpOnly cookie "prochar_token" or "Authorization: Bearer <token>" header.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  let token: string | undefined;

  // 1. Check prochar_token cookie
  if (req.cookies && req.cookies[COOKIE_NAME]) {
    token = req.cookies[COOKIE_NAME];
  }

  // 2. Check Authorization: Bearer <token> header (API tooling support)
  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    }
  }

  if (!token) {
    res.status(401).json({
      error: "UNAUTHORIZED",
      message: "Authentication required",
    });
    return;
  }

  try {
    const payload: TokenPayload = verifyToken(token);
    const user = await User.findById(payload.sub).select("-passwordHash");

    if (!user) {
      res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Invalid credentials",
      });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({
      error: "UNAUTHORIZED",
      message: "Invalid or expired token",
    });
    return;
  }
}

/**
 * Require admin role middleware stub.
 * Per AGENTS.md §3, admin features return 501 NOT_IMPLEMENTED in MVP.
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  await requireAuth(req, res, () => {
    if (req.user?.role !== "admin") {
      res.status(403).json({
        error: "FORBIDDEN",
        message: "Admin access required",
      });
      return;
    }
    // Stub per AGENTS.md §3
    res.status(501).json({
      error: "NOT_IMPLEMENTED",
      message: "Admin features are not implemented in MVP",
    });
  });
}
