import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import express, { Request, Response } from "express";
import request from "supertest";
import {
  authLimiter,
  uploadLimiter,
  getUserOrIpKey,
} from "../middleware/rate-limit.js";
import { env } from "../config/env.js";

describe("Rate Limiting", () => {
  let prevDisabled: boolean;

  beforeAll(() => {
    prevDisabled = env.RATE_LIMIT_DISABLED;
    (env as { RATE_LIMIT_DISABLED: boolean }).RATE_LIMIT_DISABLED = false;
  });

  afterAll(() => {
    (env as { RATE_LIMIT_DISABLED: boolean }).RATE_LIMIT_DISABLED = prevDisabled;
  });
  describe("getUserOrIpKey helper", () => {
    it("uses user id when authenticated", () => {
      const mockReq = {
        user: { id: "user_12345" },
        ip: "192.168.1.1",
      } as unknown as Request;

      expect(getUserOrIpKey(mockReq)).toBe("user:user_12345");
    });

    it("falls back to IP when unauthenticated", () => {
      const mockReq = {
        ip: "192.168.1.100",
      } as unknown as Request;

      expect(getUserOrIpKey(mockReq)).toBe("192.168.1.100");
    });
  });

  describe("Auth Limiter (10 req / 15 min / IP)", () => {
    let app: express.Express;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.post("/test-auth", authLimiter, (_req: Request, res: Response) => {
        res.json({ ok: true });
      });
    });

    it("blocks 11th request with 429 and includes Retry-After header", async () => {
      // Send 10 allowed requests
      for (let i = 0; i < 10; i++) {
        const res = await request(app).post("/test-auth").send({});
        expect(res.status).toBe(200);
      }

      // 11th request must receive 429
      const blockedRes = await request(app).post("/test-auth").send({});
      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body.error).toBe("RATE_LIMIT_EXCEEDED");
      expect(blockedRes.headers["retry-after"]).toBeDefined();
      expect(Number(blockedRes.headers["retry-after"])).toBeGreaterThan(0);
    });
  });

  describe("Upload Limiter (20 req / 15 min / user)", () => {
    let app: express.Express;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.post(
        "/test-upload",
        (req, _res, next) => {
          // Simulate authenticated user from header
          const userId = req.headers["x-test-user-id"];
          if (userId) {
            req.user = { id: String(userId) } as any;
          }
          next();
        },
        uploadLimiter,
        (_req: Request, res: Response) => {
          res.json({ ok: true });
        }
      );
    });

    it("tracks rate limits per user ID", async () => {
      const userA = "user_A_111";
      const userB = "user_B_222";

      // User A sends 20 requests
      for (let i = 0; i < 20; i++) {
        const res = await request(app)
          .post("/test-upload")
          .set("x-test-user-id", userA);
        expect(res.status).toBe(200);
      }

      // User A 21st request -> 429
      const blockedA = await request(app)
        .post("/test-upload")
        .set("x-test-user-id", userA);
      expect(blockedA.status).toBe(429);
      expect(blockedA.headers["retry-after"]).toBeDefined();

      // User B should still succeed (different user scope)
      const resB = await request(app)
        .post("/test-upload")
        .set("x-test-user-id", userB);
      expect(resB.status).toBe(200);
    });
  });
});
