import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import express, { Request, Response } from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { User } from "../models/User.js";
import { requireAuth, requireAdmin } from "../middleware/auth.middleware.js";
import { signToken, COOKIE_NAME } from "../services/auth.service.js";

let mongod: MongoMemoryServer;
let testApp: express.Express;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  testApp = express();
  testApp.use(cookieParser());
  testApp.use(express.json());

  testApp.get("/protected", requireAuth, (req: Request, res: Response) => {
    res.json({ message: "OK", userId: req.user?.id, role: req.user?.role });
  });

  testApp.get("/admin-only", requireAdmin, (req: Request, res: Response) => {
    res.json({ message: "Admin area", userId: req.user?.id });
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
});

describe("Auth Middleware (requireAuth, requireAdmin)", () => {
  describe("requireAuth", () => {
    it("returns 401 when no token is provided", async () => {
      const res = await request(testApp).get("/protected");
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("UNAUTHORIZED");
      expect(res.body.message).toBe("Authentication required");
    });

    it("returns 401 when authorization header is not Bearer", async () => {
      const res = await request(testApp)
        .get("/protected")
        .set("Authorization", "Basic 12345");
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("UNAUTHORIZED");
    });

    it("returns 401 when token is tampered/invalid", async () => {
      const res = await request(testApp)
        .get("/protected")
        .set("Authorization", "Bearer invalid.jwt.string");
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("UNAUTHORIZED");
      expect(res.body.message).toBe("Invalid or expired token");
    });

    it("returns 401 when token user ID does not exist in DB", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const token = signToken({ sub: nonExistentId, role: "user" });

      const res = await request(testApp)
        .get("/protected")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("UNAUTHORIZED");
      expect(res.body.message).toBe("Invalid credentials");
    });

    it("attaches req.user and calls next() when valid cookie is provided", async () => {
      const user = await User.create({
        name: "কুকি ইউজার",
        email: "cookie_auth@example.com",
        passwordHash: "hash123",
        role: "user",
      });

      const token = signToken({ sub: user._id.toString(), role: user.role });

      const res = await request(testApp)
        .get("/protected")
        .set("Cookie", [`${COOKIE_NAME}=${token}`]);

      expect(res.status).toBe(200);
      expect(res.body.userId).toBe(user._id.toString());
      expect(res.body.role).toBe("user");
    });
  });

  describe("requireAdmin (stub)", () => {
    it("returns 401 when not authenticated", async () => {
      const res = await request(testApp).get("/admin-only");
      expect(res.status).toBe(401);
    });

    it("returns 403 when authenticated user is not an admin", async () => {
      const user = await User.create({
        name: "নরমাল ইউজার",
        email: "regular@example.com",
        passwordHash: "hash123",
        role: "user",
      });

      const token = signToken({ sub: user._id.toString(), role: "user" });

      const res = await request(testApp)
        .get("/admin-only")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("FORBIDDEN");
      expect(res.body.message).toBe("Admin access required");
    });

    it("returns 501 NOT_IMPLEMENTED when authenticated user has admin role (AGENTS.md §3)", async () => {
      const admin = await User.create({
        name: "এডমিন ইউজার",
        email: "admin@example.com",
        passwordHash: "hash123",
        role: "admin",
      });

      const token = signToken({ sub: admin._id.toString(), role: "admin" });

      const res = await request(testApp)
        .get("/admin-only")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(501);
      expect(res.body.error).toBe("NOT_IMPLEMENTED");
      expect(res.body.message).toBe("Admin features are not implemented in MVP");
    });
  });
});
