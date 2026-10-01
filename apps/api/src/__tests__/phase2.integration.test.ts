import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import sharp from "sharp";
import express, { Request, Response } from "express";
import { app } from "../app.js";
import { User } from "../models/User.js";
import {
  signToken,
  COOKIE_NAME,
  assertUserOwnsPublicId,
} from "../services/auth.service.js";
import { authLimiter, getUserOrIpKey } from "../middleware/rate-limit.js";
import { env } from "../config/env.js";

// Mock Cloudinary SDK and Gemini SDK
vi.mock("cloudinary", () => ({
  v2: {
    config: vi.fn(),
    uploader: {
      upload_stream: vi.fn((_options, callback) => {
        const stream = {
          end: vi.fn((_buffer) => {
            callback(null, {
              secure_url: "https://res.cloudinary.com/demo/image/upload/sample.webp",
              public_id: "posters/uploads/user123/sample_uuid",
              width: 1200,
              height: 1800,
            });
          }),
        };
        return stream;
      }),
      destroy: vi.fn().mockResolvedValue({ result: "ok" }),
    },
    url: vi.fn((id) => `https://res.cloudinary.com/demo/image/upload/${id}`),
  },
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn(),
}));

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

describe("Phase 2 Integration Verification Suite (PRD & Constraints checklist)", () => {
  // 1. Register with email → 201, sets cookie, passwordHash not in response
  it("Register with email -> 201, sets cookie, passwordHash not in response", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "রাহুল আহমেদ",
      email: "rahul@example.com",
      password: "Password123!",
    });

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.name).toBe("রাহুল আহমেদ");
    expect(res.body.user.email).toBe("rahul@example.com");
    expect(res.body.user.role).toBe("user");
    expect(res.body.user.passwordHash).toBeUndefined();

    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    const cookieStr = Array.isArray(cookies) ? cookies.join("; ") : cookies;
    expect(cookieStr).toContain(COOKIE_NAME);
    expect(cookieStr.toLowerCase()).toContain("httponly");
  });

  // 2. Register with phone (all 3 valid formats) → 201
  it("Register with phone (all 3 valid formats) -> 201", async () => {
    const res1 = await request(app).post("/api/auth/register").send({
      name: "ইউজার ১",
      phone: "01711111111",
      password: "Password123!",
    });
    expect(res1.status).toBe(201);
    expect(res1.body.user.phone).toBe("+8801711111111");

    const res2 = await request(app).post("/api/auth/register").send({
      name: "ইউজার ২",
      phone: "8801822222222",
      password: "Password123!",
    });
    expect(res2.status).toBe(201);
    expect(res2.body.user.phone).toBe("+8801822222222");

    const res3 = await request(app).post("/api/auth/register").send({
      name: "ইউজার ৩",
      phone: "+8801933333333",
      password: "Password123!",
    });
    expect(res3.status).toBe(201);
    expect(res3.body.user.phone).toBe("+8801933333333");
  });

  // 3. Register with invalid phone → 400
  it("Register with invalid phone -> 400", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "ইনভ্যালিড ফোন",
      phone: "02987654321", // 02 is landline, not 01
      password: "Password123!",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("VALIDATION_ERROR");
  });

  // 4. Register duplicate email → 409
  it("Register duplicate email -> 409", async () => {
    await request(app).post("/api/auth/register").send({
      name: "অরিজিনাল ইউজার",
      email: "duplicate_check@example.com",
      password: "Password123!",
    });

    const res = await request(app).post("/api/auth/register").send({
      name: "ডুপ্লিকেট ইউজার",
      email: "duplicate_check@example.com",
      password: "Password123!",
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("CONFLICT");
  });

  // 5. Register email that collides with another user's phone → 409
  it("Register email that collides with another user's phone -> 409", async () => {
    await request(app).post("/api/auth/register").send({
      name: "ফোন ইউজার",
      phone: "01755555555",
      password: "Password123!",
    });

    const res = await request(app).post("/api/auth/register").send({
      name: "কলিশন ইউজার",
      email: "+8801755555555",
      password: "Password123!",
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("CONFLICT");
  });

  // 6. Login wrong password → 401 "Invalid credentials"
  it("Login wrong password -> 401 'Invalid credentials'", async () => {
    await request(app).post("/api/auth/register").send({
      name: "লগইন চেক",
      email: "authcheck@example.com",
      password: "CorrectPassword123!",
    });

    const res = await request(app).post("/api/auth/login").send({
      identifier: "authcheck@example.com",
      password: "WrongPassword999!",
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("UNAUTHORIZED");
    expect(res.body.message).toBe("Invalid credentials");
  });

  // 7. Login unknown identifier → 401 "Invalid credentials" (identical response)
  it("Login unknown identifier -> 401 'Invalid credentials' (identical response)", async () => {
    const res = await request(app).post("/api/auth/login").send({
      identifier: "unknown_person_999@example.com",
      password: "AnyPassword123!",
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("UNAUTHORIZED");
    expect(res.body.message).toBe("Invalid credentials");
  });

  // 8. GET /api/auth/me without cookie → 401
  it("GET /api/auth/me without cookie -> 401", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("UNAUTHORIZED");
  });

  // 9. GET /api/auth/me with cookie → 200 user
  it("GET /api/auth/me with cookie -> 200 user", async () => {
    const reg = await request(app).post("/api/auth/register").send({
      name: "কুকি প্রোফাইল",
      email: "profile_cookie@example.com",
      password: "Password123!",
    });
    const cookie = reg.headers["set-cookie"];

    const res = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("profile_cookie@example.com");
  });

  // 10. GET /api/auth/me with Authorization: Bearer → 200 user
  it("GET /api/auth/me with Authorization: Bearer -> 200 user", async () => {
    const reg = await request(app).post("/api/auth/register").send({
      name: "বেয়ারার প্রোফাইল",
      email: "bearer_profile@example.com",
      password: "Password123!",
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
    expect(res.body.user.email).toBe("bearer_profile@example.com");
  });

  // 11. Logout → 204, cookie cleared
  it("Logout -> 204, cookie cleared", async () => {
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(204);
    const cookie = res.headers["set-cookie"];
    expect(cookie).toBeDefined();
    const cookieStr = Array.isArray(cookie) ? cookie.join("; ") : cookie;
    expect(cookieStr).toContain(`${COOKIE_NAME}=;`);
  });

  // 12. Rate limit: 11th auth request within window → 429 with Retry-After
  it("Rate limit: 11th auth request within window -> 429 with Retry-After", async () => {
    const prev = env.RATE_LIMIT_DISABLED;
    (env as { RATE_LIMIT_DISABLED: boolean }).RATE_LIMIT_DISABLED = false;

    try {
      const rateApp = express();
      rateApp.use(express.json());
      rateApp.post("/rate-auth", authLimiter, (_req: Request, res: Response) => {
        res.json({ ok: true });
      });

      for (let i = 0; i < 10; i++) {
        const res = await request(rateApp).post("/rate-auth").send({});
        expect(res.status).toBe(200);
      }

      const blocked = await request(rateApp).post("/rate-auth").send({});
      expect(blocked.status).toBe(429);
      expect(blocked.body.error).toBe("RATE_LIMIT_EXCEEDED");
      expect(blocked.headers["retry-after"]).toBeDefined();
      expect(Number(blocked.headers["retry-after"])).toBeGreaterThan(0);
    } finally {
      (env as { RATE_LIMIT_DISABLED: boolean }).RATE_LIMIT_DISABLED = prev;
    }
  });

  // Upload tests setup
  let uploadUserId: string;
  let uploadTokenCookie: string;

  beforeEach(async () => {
    const user = await User.create({
      name: "ফটো আপলোডার",
      email: "photouploader@example.com",
      passwordHash: "hash999",
      role: "user",
    });
    uploadUserId = user._id.toString();
    const token = signToken({ sub: uploadUserId, role: "user" });
    uploadTokenCookie = `${COOKIE_NAME}=${token}`;
  });

  // 13. Upload: valid JPEG → 201, publicId starts with posters/uploads/{userId}/
  it("Upload: valid JPEG -> 201, publicId starts with posters/uploads/{userId}/", async () => {
    const validJpeg = await sharp({
      create: { width: 300, height: 400, channels: 3, background: { r: 10, g: 150, b: 30 } },
    })
      .jpeg()
      .toBuffer();

    const res = await request(app)
      .post("/api/upload")
      .set("Cookie", [uploadTokenCookie])
      .attach("photos", validJpeg, "leader_photo.jpg");

    expect(res.status).toBe(201);
    expect(res.body.photos).toBeDefined();
    expect(res.body.photos.length).toBe(1);

    const photo = res.body.photos[0];
    expect(photo.publicId).toBeDefined();
    expect(photo.publicId.startsWith(`posters/uploads/${uploadUserId}/`)).toBe(true);
    expect(photo.url).toBeDefined();
    expect(photo.width).toBe(300);
    expect(photo.height).toBe(400);
  });

  // 14. Upload: .txt renamed .jpg → 422
  it("Upload: .txt renamed .jpg -> 422", async () => {
    const textBuffer = Buffer.from("plain text string pretend to be jpeg");

    const res = await request(app)
      .post("/api/upload")
      .set("Cookie", [uploadTokenCookie])
      .attach("photos", textBuffer, "malicious.jpg");

    expect(res.status).toBe(422);
    expect(res.body.error).toBe("UNPROCESSABLE_ENTITY");
  });

  // 15. Upload: 6 MB file → 413 or 400 (multer limit)
  it("Upload: 6 MB file -> 413 or 400 (multer limit)", async () => {
    const oversized = Buffer.alloc(6 * 1024 * 1024, 0);

    const res = await request(app)
      .post("/api/upload")
      .set("Cookie", [uploadTokenCookie])
      .attach("photos", oversized, "oversized.jpg");

    expect([400, 413]).toContain(res.status);
  });

  // 16. Upload: 4 files → 400
  it("Upload: 4 files -> 400", async () => {
    const smallImg = await sharp({
      create: { width: 50, height: 50, channels: 3, background: { r: 50, g: 50, b: 50 } },
    })
      .png()
      .toBuffer();

    const res = await request(app)
      .post("/api/upload")
      .set("Cookie", [uploadTokenCookie])
      .attach("photos", smallImg, "1.png")
      .attach("photos", smallImg, "2.png")
      .attach("photos", smallImg, "3.png")
      .attach("photos", smallImg, "4.png");

    expect(res.status).toBe(400);
  });

  // 17. Upload: EXIF stripped (check output buffer has no EXIF markers)
  it("Upload: EXIF stripped (check output buffer has no EXIF markers)", async () => {
    const withGpsExif = await sharp({
      create: { width: 120, height: 120, channels: 3, background: { r: 100, g: 100, b: 100 } },
    })
      .withMetadata({
        exif: {
          IFD0: {
            Make: "CameraWithGPS",
            Model: "BanglaPhone",
          },
        },
      })
      .jpeg()
      .toBuffer();

    const inputMeta = await sharp(withGpsExif).metadata();
    expect(inputMeta.exif).toBeDefined();

    const res = await request(app)
      .post("/api/upload")
      .set("Cookie", [uploadTokenCookie])
      .attach("photos", withGpsExif, "with_exif.jpg");

    expect(res.status).toBe(201);
    const photo = res.body.photos[0];

    const fetchRes = await request(app).get(photo.url);
    expect(fetchRes.status).toBe(200);

    const outputMeta = await sharp(fetchRes.body).metadata();
    expect(outputMeta.exif).toBeUndefined();
    expect(outputMeta.format).toBe("webp");
  });

  // 18. assertUserOwnsPublicId: valid and invalid cases
  it("assertUserOwnsPublicId: valid and invalid cases", () => {
    const ownerId = "user_valid_12345";
    const otherId = "user_attacker_999";

    // Valid
    expect(assertUserOwnsPublicId(`posters/uploads/${ownerId}/photo1.webp`, ownerId)).toBe(true);
    expect(assertUserOwnsPublicId(`posters/uploads/${ownerId}/sub/photo2.webp`, ownerId)).toBe(true);

    // Invalid: different user
    expect(assertUserOwnsPublicId(`posters/uploads/${otherId}/photo1.webp`, ownerId)).toBe(false);

    // Invalid: malformed path or traversal
    expect(assertUserOwnsPublicId(`uploads/${ownerId}/photo1.webp`, ownerId)).toBe(false);
    expect(assertUserOwnsPublicId(`posters/uploads/photo1.webp`, ownerId)).toBe(false);
    expect(assertUserOwnsPublicId("", ownerId)).toBe(false);
    expect(assertUserOwnsPublicId(`posters/uploads/${ownerId}/photo1.webp`, "")).toBe(false);
  });

  // 19. Rate limit keyGenerator uses user id when authed
  it("Rate limit keyGenerator uses user id when authed", () => {
    const authedReq = {
      user: { _id: new mongoose.Types.ObjectId("64f123456789abcdef012345") },
      ip: "10.0.0.1",
    } as unknown as Request;

    expect(getUserOrIpKey(authedReq)).toBe("user:64f123456789abcdef012345");

    const unauthedReq = {
      ip: "192.168.1.50",
    } as unknown as Request;

    expect(getUserOrIpKey(unauthedReq)).toBe("192.168.1.50");
  });
});
