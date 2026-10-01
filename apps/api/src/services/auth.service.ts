import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { IUserDocument } from "../models/User.js";
import { assertUserOwnsPublicId } from "@prochar/shared";

export { assertUserOwnsPublicId };

export const COOKIE_NAME = "prochar_token";
export const BCRYPT_SALT_ROUNDS = 12;

export interface TokenPayload {
  sub: string;
  role: "user" | "admin";
}

export interface UserResponse {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: "user" | "admin";
  createdAt: Date;
}

/**
 * Hashes a plaintext password using bcrypt with cost factor 12.
 * Enforces the 72-byte bcrypt limit.
 */
export async function hashPassword(password: string): Promise<string> {
  const byteLength = Buffer.byteLength(password, "utf8");
  if (byteLength > 72) {
    throw new Error("VALIDATION_ERROR: Password exceeds 72 bytes limit");
  }
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Verifies a plaintext password against a stored bcrypt hash.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
}

/**
 * Signs a JWT with HS256 algorithm and 7-day expiry.
 */
export function signToken(payload: TokenPayload): string {
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters long");
  }

  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "7d",
  });
}

/**
 * Verifies a JWT and extracts the TokenPayload.
 */
export function verifyToken(token: string): TokenPayload {
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters long");
  }

  const decoded = jwt.verify(token, env.JWT_SECRET, {
    algorithms: ["HS256"],
  });

  return decoded as TokenPayload;
}

/**
 * Formats a User document into the clean response shape specified in PRD §11.1.
 * Never includes passwordHash.
 */
export function toUserResponse(user: IUserDocument): UserResponse {
  const response: UserResponse = {
    id: user._id.toString(),
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
  };

  if (user.email) {
    response.email = user.email;
  }
  if (user.phone) {
    response.phone = user.phone;
  }

  return response;
}

/**
 * Returns standard express cookie options for the auth token cookie.
 */
export function getAuthCookieOptions() {
  const isProd = env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProd,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}
