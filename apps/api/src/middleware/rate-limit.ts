import rateLimit, { Options } from "express-rate-limit";
import { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";

// MVP single-instance; swap store for Redis when horizontally scaled.

/**
 * Key generator that uses req.user.id when authenticated, falling back to IP.
 */
export function getUserOrIpKey(req: Request): string {
  const user = req.user as { _id?: { toString(): string }; id?: string } | undefined;
  const userId = user?._id?.toString() || user?.id;
  if (userId) {
    return `user:${userId}`;
  }
  return req.ip || req.socket.remoteAddress || "127.0.0.1";
}

/**
 * Standard 429 handler ensuring Retry-After header and structured JSON error response.
 */
function createRateLimitHandler(windowMs: number) {
  return (_req: Request, res: Response, _next: NextFunction, options: Options) => {
    const retryAfterSeconds = Math.ceil(windowMs / 1000);
    if (!res.getHeader("Retry-After")) {
      res.setHeader("Retry-After", String(retryAfterSeconds));
    }
    res.status(options.statusCode).json({
      error: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests. Please try again later.",
      retryAfter: retryAfterSeconds,
    });
  };
}

/**
 * Global API rate limiter: 300 req / 15 min / IP
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => env.RATE_LIMIT_DISABLED,
  handler: createRateLimitHandler(15 * 60 * 1000),
});

/**
 * Auth rate limiter: 10 req / 15 min / IP (applied to POST /api/auth/*)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => env.RATE_LIMIT_DISABLED,
  handler: createRateLimitHandler(15 * 60 * 1000),
});

/**
 * Upload rate limiter: 20 req / 15 min / user (falls back to IP)
 */
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: getUserOrIpKey,
  validate: { keyGeneratorIpFallback: false },
  skip: () => env.RATE_LIMIT_DISABLED,
  handler: createRateLimitHandler(15 * 60 * 1000),
});

/**
 * Poster generation per-minute limiter: 5 req / 1 min / user (Phase 6)
 */
export const posterCreateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: env.GEN_RATE_PER_MIN,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: getUserOrIpKey,
  validate: { keyGeneratorIpFallback: false },
  skip: () => env.RATE_LIMIT_DISABLED,
  handler: createRateLimitHandler(60 * 1000),
});

/**
 * Poster generation daily limiter: 30 req / 24 hours / user (Phase 6)
 */
export const posterDailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  limit: env.GEN_RATE_PER_DAY,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: getUserOrIpKey,
  validate: { keyGeneratorIpFallback: false },
  skip: () => env.RATE_LIMIT_DISABLED,
  handler: createRateLimitHandler(24 * 60 * 60 * 1000),
});
