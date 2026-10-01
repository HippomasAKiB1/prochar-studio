import { Router, Request, Response } from "express";
import { RegisterSchema, LoginSchema, normalizeBangladeshiPhone } from "@prochar/shared";
import { User } from "../models/User.js";
import {
  hashPassword,
  comparePassword,
  signToken,
  toUserResponse,
  getAuthCookieOptions,
  COOKIE_NAME,
} from "../services/auth.service.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { authLimiter } from "../middleware/rate-limit.js";

export const authRouter = Router();

// Apply auth rate limiting (10 req / 15 min / IP) to all POST /api/auth/* routes
authRouter.use((req, res, next) => {
  if (req.method === "POST") {
    return authLimiter(req, res, next);
  }
  next();
});

/**
 * POST /api/auth/register
 * Registers a new user with email and/or phone number.
 */
authRouter.post("/register", async (req: Request, res: Response): Promise<void> => {
  const result = RegisterSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Validation failed",
      details: result.error.issues,
    });
    return;
  }

  const { name, email, phone, password } = result.data;

  // Collision check (FR-A8): Duplicate email or phone, or email colliding with another's phone
  const searchConditions: Array<Record<string, unknown>> = [];
  if (email) {
    searchConditions.push({ email: email.toLowerCase() }, { phone: email });
    const norm = normalizeBangladeshiPhone(email);
    if (norm) {
      searchConditions.push({ phone: norm }, { email: norm });
    }
  }
  if (phone) {
    searchConditions.push({ phone }, { email: phone.toLowerCase() });
    const norm = normalizeBangladeshiPhone(phone);
    if (norm) {
      searchConditions.push({ phone: norm }, { email: norm });
    }
  }

  if (searchConditions.length > 0) {
    const existing = await User.findOne({ $or: searchConditions });
    if (existing) {
      res.status(409).json({
        error: "CONFLICT",
        message: "An account with this email or phone number already exists",
      });
      return;
    }
  }

  try {
    const passwordHash = await hashPassword(password);
    const user = await User.create({
      name,
      email: email || undefined,
      phone: phone || undefined,
      passwordHash,
      role: "user",
    });

    const token = signToken({ sub: user._id.toString(), role: user.role });
    res.cookie(COOKIE_NAME, token, getAuthCookieOptions());
    res.status(201).json({ user: toUserResponse(user) });
  } catch (err: unknown) {
    // Check for MongoDB E11000 duplicate key error just in case of race condition
    if (err && typeof err === "object" && "code" in err && (err as { code: number }).code === 11000) {
      res.status(409).json({
        error: "CONFLICT",
        message: "An account with this email or phone number already exists",
      });
      return;
    }
    throw err;
  }
});

/**
 * POST /api/auth/login
 * Logs in with email or phone + password.
 * Generic 401 on any failure to avoid account enumeration (FR-A8).
 */
authRouter.post("/login", async (req: Request, res: Response): Promise<void> => {
  const result = LoginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Validation failed",
      details: result.error.issues,
    });
    return;
  }

  const { identifier, password } = result.data;
  const normalizedPhone = normalizeBangladeshiPhone(identifier);

  const searchConditions: Array<Record<string, unknown>> = [
    { email: identifier.toLowerCase() },
    { phone: identifier },
  ];
  if (normalizedPhone) {
    searchConditions.push({ phone: normalizedPhone });
  }

  const user = await User.findOne({ $or: searchConditions }).select("+passwordHash");
  if (!user) {
    res.status(401).json({
      error: "UNAUTHORIZED",
      message: "Invalid credentials",
    });
    return;
  }

  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    res.status(401).json({
      error: "UNAUTHORIZED",
      message: "Invalid credentials",
    });
    return;
  }

  const token = signToken({ sub: user._id.toString(), role: user.role });
  res.cookie(COOKIE_NAME, token, getAuthCookieOptions());
  res.status(200).json({ user: toUserResponse(user) });
});

/**
 * GET /api/auth/me
 * Returns current authenticated user.
 */
authRouter.get("/me", requireAuth, (req: Request, res: Response): void => {
  res.status(200).json({ user: toUserResponse(req.user!) });
});

/**
 * POST /api/auth/logout
 * Clears authentication cookie.
 */
authRouter.post("/logout", (_req: Request, res: Response): void => {
  res.clearCookie(COOKIE_NAME, {
    ...getAuthCookieOptions(),
    maxAge: 0,
  });
  res.status(204).end();
});
