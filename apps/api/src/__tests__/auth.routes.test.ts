import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { app } from "../app.js";
import { User } from "../models/User.js";
import { COOKIE_NAME } from "../services/auth.service.js";

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  await User.init();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
});

describe("Auth Routes & Middleware (/api/auth)", () => {
  describe("POST /api/auth/register", () => {
    it("registers with email -> 201, sets cookie, passwordHash not in response", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "সাকিব আল হাসান",
        email: "sakib@example.com",
        password: "ValidPassword123!",
      });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.name).toBe("সাকিব আল হাসান");
      expect(res.body.user.email).toBe("sakib@example.com");
      expect(res.body.user.role).toBe("user");
      expect(res.body.user.id).toBeDefined();
      expect(res.body.user.passwordHash).toBeUndefined();

      // Check cookie
      const cookies = res.headers["set-cookie"];
      expect(cookies).toBeDefined();
      const cookieStr = Array.isArray(cookies) ? cookies.join("; ") : cookies;
      expect(cookieStr).toContain(COOKIE_NAME);
      expect(cookieStr.toLowerCase()).toContain("httponly");
    });

    it("registers with phone (all 3 valid formats) -> 201", async () => {
      // 1. 01XXXXXXXXX format
      const res1 = await request(app).post("/api/auth/register").send({
        name: "মুশফিকুর রহিম",
        phone: "01712345678",
        password: "ValidPassword123!",
      });
      expect(res1.status).toBe(201);
      expect(res1.body.user.phone).toBe("+8801712345678");

      // 2. 8801XXXXXXXXX format
      const res2 = await request(app).post("/api/auth/register").send({
        name: "মাহমুদুল্লাহ রিয়াদ",
        phone: "8801812345678",
        password: "ValidPassword123!",
      });
      expect(res2.status).toBe(201);
      expect(res2.body.user.phone).toBe("+8801812345678");

      // 3. +8801XXXXXXXXX format
      const res3 = await request(app).post("/api/auth/register").send({
        name: "তামিম ইকবাল",
        phone: "+8801912345678",
        password: "ValidPassword123!",
      });
      expect(res3.status).toBe(201);
      expect(res3.body.user.phone).toBe("+8801912345678");
    });

    it("rejects registration with invalid phone -> 400", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "ভুল নম্বর",
        phone: "12345",
        password: "ValidPassword123!",
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("VALIDATION_ERROR");
    });

    it("rejects registration with duplicate email -> 409", async () => {
      await request(app).post("/api/auth/register").send({
        name: "প্রথম ব্যবহারকারী",
        email: "duplicate@example.com",
        password: "ValidPassword123!",
      });

      const res = await request(app).post("/api/auth/register").send({
        name: "দ্বিতীয় ব্যবহারকারী",
        email: "duplicate@example.com",
        password: "ValidPassword123!",
      });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe("CONFLICT");
    });

    it("rejects registration when email collides with another user's phone -> 409", async () => {
      await request(app).post("/api/auth/register").send({
        name: "ফোন ব্যবহারকারী",
        phone: "01712345678",
        password: "ValidPassword123!",
      });

      const res = await request(app).post("/api/auth/register").send({
        name: "ইমেইল ব্যবহারকারী",
        email: "+8801712345678",
        password: "ValidPassword123!",
      });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe("CONFLICT");
    });
  });

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      await request(app).post("/api/auth/register").send({
        name: "লগইন টেস্ট ব্যবহারকারী",
        email: "login@example.com",
        phone: "01711223344",
        password: "CorrectPassword123!",
      });
    });

    it("logs in successfully with email -> 200 + Set-Cookie", async () => {
      const res = await request(app).post("/api/auth/login").send({
        identifier: "login@example.com",
        password: "CorrectPassword123!",
      });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe("login@example.com");
      expect(res.headers["set-cookie"]).toBeDefined();
    });

    it("logs in successfully with phone (any format) -> 200", async () => {
      const res = await request(app).post("/api/auth/login").send({
        identifier: "01711223344",
        password: "CorrectPassword123!",
      });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe("login@example.com");
    });

    it("fails on wrong password -> 401 'Invalid credentials'", async () => {
      const res = await request(app).post("/api/auth/login").send({
        identifier: "login@example.com",
        password: "WrongPassword123!",
      });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("UNAUTHORIZED");
      expect(res.body.message).toBe("Invalid credentials");
    });

    it("fails on unknown identifier -> 401 'Invalid credentials' (identical to wrong password)", async () => {
      const res = await request(app).post("/api/auth/login").send({
        identifier: "unknown_user@example.com",
        password: "AnyPassword123!",
      });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("UNAUTHORIZED");
      expect(res.body.message).toBe("Invalid credentials");
    });
  });

  describe("GET /api/auth/me", () => {
    it("rejects without cookie -> 401", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("UNAUTHORIZED");
    });

    it("succeeds with cookie -> 200 user", async () => {
      const reg = await request(app).post("/api/auth/register").send({
        name: "কুকি টেস্ট",
        email: "cookie@example.com",
        password: "ValidPassword123!",
      });
      const cookie = reg.headers["set-cookie"];

      const res = await request(app).get("/api/auth/me").set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe("cookie@example.com");
      expect(res.body.user.name).toBe("কুকি টেস্ট");
    });

    it("succeeds with Authorization: Bearer token -> 200 user", async () => {
      const reg = await request(app).post("/api/auth/register").send({
        name: "হেডার টেস্ট",
        email: "bearer@example.com",
        password: "ValidPassword123!",
      });
      const cookieHeader = reg.headers["set-cookie"];
      const cookieStr = Array.isArray(cookieHeader) ? cookieHeader.join(";") : cookieHeader;
      const match = cookieStr.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
      expect(match).toBeDefined();
      const token = match![1];

      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe("bearer@example.com");
      expect(res.body.user.name).toBe("হেডার টেস্ট");
    });
  });

  describe("POST /api/auth/logout", () => {
    it("clears auth cookie -> 204", async () => {
      const res = await request(app).post("/api/auth/logout");
      expect(res.status).toBe(204);

      const cookie = res.headers["set-cookie"];
      expect(cookie).toBeDefined();
      const cookieStr = Array.isArray(cookie) ? cookie.join("; ") : cookie;
      expect(cookieStr).toContain(`${COOKIE_NAME}=;`);
    });
  });
});
