import { describe, it, expect } from "vitest";
import {
  hashPassword,
  comparePassword,
  signToken,
  verifyToken,
  assertUserOwnsPublicId,
  toUserResponse,
} from "../services/auth.service.js";
import { IUserDocument } from "../models/User.js";

describe("Auth Service", () => {
  describe("Password Hashing (bcrypt cost 12)", () => {
    it("hashes password and verifies successfully", async () => {
      const password = "ValidPassword123!";
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith("$2b$12$") || hash.startsWith("$2a$12$")).toBe(true);

      const isValid = await comparePassword(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await comparePassword("WrongPassword123!", hash);
      expect(isInvalid).toBe(false);
    });

    it("rejects password exceeding 72 bytes", async () => {
      // 73 ASCII bytes
      const longPassword = "a".repeat(73);
      await expect(hashPassword(longPassword)).rejects.toThrow("Password exceeds 72 bytes limit");

      // Exactly 72 ASCII bytes should succeed
      const maxPassword = "a".repeat(72);
      await expect(hashPassword(maxPassword)).resolves.toBeDefined();
    });
  });

  describe("JWT Signing and Verification (HS256, 7d)", () => {
    it("signs and verifies a valid token payload", () => {
      const payload = { sub: "user_64f123456789abcdef012345", role: "user" as const };
      const token = signToken(payload);

      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBe(3);

      const decoded = verifyToken(token);
      expect(decoded.sub).toBe(payload.sub);
      expect(decoded.role).toBe(payload.role);
    });

    it("fails verification on invalid or tampered token", () => {
      expect(() => verifyToken("invalid.jwt.token")).toThrow();

      const validToken = signToken({ sub: "user123", role: "user" });
      const tamperedToken = validToken.slice(0, -5) + "abcde";
      expect(() => verifyToken(tamperedToken)).toThrow();
    });
  });

  describe("assertUserOwnsPublicId", () => {
    it("returns true for matching user publicId prefix", () => {
      const userId = "user_abc_123";
      const validPublicId = `posters/uploads/${userId}/photo_uuid_789`;
      expect(assertUserOwnsPublicId(validPublicId, userId)).toBe(true);
    });

    it("returns false for non-matching user publicId", () => {
      const userId = "user_abc_123";
      const otherUserPublicId = `posters/uploads/other_user_999/photo_uuid_789`;
      expect(assertUserOwnsPublicId(otherUserPublicId, userId)).toBe(false);
    });

    it("returns false for arbitrary or malformed paths", () => {
      const userId = "user_abc_123";
      expect(assertUserOwnsPublicId(`uploads/${userId}/photo`, userId)).toBe(false);
      expect(assertUserOwnsPublicId("", userId)).toBe(false);
      expect(assertUserOwnsPublicId("posters/uploads/photo", "")).toBe(false);
    });
  });

  describe("toUserResponse", () => {
    it("formats user document into clean response omitting passwordHash", () => {
      const fakeUser = {
        _id: "64f123456789abcdef012345",
        name: "আহমেদ হাসান",
        email: "ahmed@example.com",
        passwordHash: "should_never_appear_in_output",
        role: "user",
        createdAt: new Date("2026-01-01T00:00:00Z"),
      } as unknown as IUserDocument;

      const response = toUserResponse(fakeUser);

      expect(response).toEqual({
        id: "64f123456789abcdef012345",
        name: "আহমেদ হাসান",
        email: "ahmed@example.com",
        role: "user",
        createdAt: new Date("2026-01-01T00:00:00Z"),
      });
      expect((response as { passwordHash?: string }).passwordHash).toBeUndefined();
    });
  });
});
