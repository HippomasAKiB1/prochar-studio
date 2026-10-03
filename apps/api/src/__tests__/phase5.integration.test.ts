import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";
import mongoose, { Types } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { expandStandardFooterSlots, TemplateLayoutConfig } from "@prochar/shared";
import { app } from "../app.js";
import { User } from "../models/User.js";
import { Template } from "../models/Template.js";
import { Poster } from "../models/Poster.js";
import { GenerationLog } from "../models/GenerationLog.js";
import { signToken, COOKIE_NAME } from "../services/auth.service.js";
import { recoverStuckJobs } from "../server.js";
import { SEED_TEMPLATES_DATA } from "../scripts/seed-data.js";

import sharp from "sharp";
import { PhotoItemSchema } from "@prochar/shared";
import { env } from "../config/env.js";

// In-memory storage: upload() stores the real buffer, readFile() round-trips it.
const { memStore } = vi.hoisted(() => ({ memStore: new Map<string, Buffer>() }));
const mockStorageDelete = vi.fn().mockResolvedValue(undefined);
let mockPngBuffer: Buffer;

vi.mock("../services/storage/index.js", () => ({
  getStorageProvider: () => ({
    upload: async (buffer: Buffer, opts: { folder?: string; publicId?: string } = {}) => {
      const folder = (opts.folder || "posters/generated").replace(/\/+$/, "");
      const pid = opts.publicId || `${folder}/${globalThis.crypto.randomUUID()}`;
      memStore.set(pid, buffer);
      return { url: `/api/storage/${pid}`, publicId: pid };
    },
    delete: mockStorageDelete,
    getUrl: (pid: string) => `/api/storage/${pid}`,
    getBaseDir: () => "./apps/api/.local-storage",
  }),
  createStorageProvider: vi.fn(),
}));

// Render mock returns a REAL 1800x2400 PNG (no headless browser needed)
vi.mock("../services/render/render.service.js", () => ({
  renderPoster: async () => {
    const s = (await import("sharp")).default;
    return s({
      create: { width: 1800, height: 2400, channels: 3, background: { r: 240, g: 230, b: 210 } },
    })
      .png()
      .toBuffer();
  },
}));

// Any unexpected network fetch is a bug (local-storage mode must never fetch)
global.fetch = vi.fn().mockRejectedValue(new Error("unexpected network fetch in test"));

// fs.readFile: serve buffers from memStore by publicId suffix, else real fs
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    readFile: (async (p: unknown, ...rest: unknown[]) => {
      const norm = String(p).replace(/\\/g, "/");
      for (const [key, buf] of memStore) {
        if (norm.endsWith(`/${key}`)) return buf;
      }
      return (actual.readFile as (...a: unknown[]) => Promise<unknown>)(p, ...rest);
    }) as typeof actual.readFile,
  };
});

let mongoServer: MongoMemoryServer;
let userA: any;
let userB: any;
let tokenA: string;
let tokenB: string;
let templateVictory: any;
let templateCondolence: any;

beforeAll(async () => {
  mockPngBuffer = await sharp({
    create: {
      width: 200,
      height: 200,
      channels: 3,
      background: { r: 0, g: 100, b: 200 },
    },
  })
    .png()
    .toBuffer();

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Setup users
  userA = await User.create({
    name: "User Alpha",
    email: "alpha@prochar.studio",
    passwordHash: "hashedpassword123",
    role: "user",
  });
  tokenA = signToken({ sub: userA._id.toString(), role: userA.role });

  userB = await User.create({
    name: "User Beta",
    email: "beta@prochar.studio",
    passwordHash: "hashedpassword123",
    role: "user",
  });
  tokenB = signToken({ sub: userB._id.toString(), role: userB.role });

  // Seed real image bytes for each user's uploaded photo (round-trips via memStore)
  memStore.set(`posters/uploads/${userA._id}/photo1.webp`, mockPngBuffer);
  memStore.set(`posters/uploads/${userB._id}/photo1.webp`, mockPngBuffer);

  // Setup templates using standard seed definitions
  const victoryData = SEED_TEMPLATES_DATA.find((t) => t.slug === "victory-day-classic")!;
  const victorySlots = expandStandardFooterSlots((victoryData.layoutConfig as any).textSlots);
  const victoryConfig: TemplateLayoutConfig = {
    ...(victoryData.layoutConfig as any),
    textSlots: victorySlots,
  };
  templateVictory = await Template.create({
    slug: victoryData.slug,
    title: victoryData.title,
    titleEn: victoryData.titleEn,
    occasionType: victoryData.occasionType,
    thumbnailUrl: `/api/templates/thumbnail/${victoryData.slug}`,
    layoutConfig: victoryConfig,
    isActive: victoryData.isActive,
  });

  const condolenceData = SEED_TEMPLATES_DATA.find((t) => t.slug === "condolence-tribute")!;
  const condolenceSlots = expandStandardFooterSlots((condolenceData.layoutConfig as any).textSlots);
  const condolenceConfig: TemplateLayoutConfig = {
    ...(condolenceData.layoutConfig as any),
    textSlots: condolenceSlots,
  };
  templateCondolence = await Template.create({
    slug: condolenceData.slug,
    title: condolenceData.title,
    titleEn: condolenceData.titleEn,
    occasionType: condolenceData.occasionType,
    thumbnailUrl: `/api/templates/thumbnail/${condolenceData.slug}`,
    layoutConfig: condolenceConfig,
    isActive: condolenceData.isActive,
  });
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  mockStorageDelete.mockClear();
});

describe("Phase 5 Integration Suite (PRD §9.3, §9.4, §11.4)", () => {
  const validFormData = {
    name: "রহিম চৌধুরী",
    designation: "সভাপতি",
    partyOrOrganization: "বাংলাদেশ আওয়ামী লীগ",
    district: "ঢাকা",
    occasionType: "victory_day" as const,
    headline: "মহান বিজয় দিবস সফল হোক",
  };

  const getValidPhotosForUser = (userId: string) => [
    {
      url: `/api/storage/posters/uploads/${userId}/photo1.webp`,
      publicId: `posters/uploads/${userId}/photo1.webp`,
      width: 800,
      height: 800,
    },
  ];

  // 1. POST /posters with valid body → 202, doc created with status "generating"
  it("1. POST /posters with valid body -> 202, doc created with status generating", async () => {
    const res = await request(app)
      .post("/api/posters")
      .set("Cookie", `${COOKIE_NAME}=${tokenA}`)
      .send({
        templateId: templateVictory._id.toString(),
        formData: validFormData,
        photos: getValidPhotosForUser(userA._id.toString()),
        consent: true,
      });

    expect(res.status).toBe(202);
    expect(res.body).toHaveProperty("id");
    expect(res.body.status).toBe("generating");
    expect(res.body.stage).toBe("queued");

    const poster = await Poster.findById(res.body.id);
    expect(poster).toBeDefined();
    expect(poster?.status).toBe("generating");
  });

  // 2. POST /posters with photos not owned by user → 403 PHOTO_NOT_OWNED
  it("2. POST /posters with photos not owned by user -> 403 PHOTO_NOT_OWNED", async () => {
    const res = await request(app)
      .post("/api/posters")
      .set("Cookie", `${COOKIE_NAME}=${tokenA}`)
      .send({
        templateId: templateVictory._id.toString(),
        formData: validFormData,
        photos: getValidPhotosForUser(userB._id.toString()), // owned by userB!
        consent: true,
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("PHOTO_NOT_OWNED");
  });

  // 3. POST /posters with template occasion mismatch → 422
  it("3. POST /posters with template occasion mismatch -> 422 CONTENT_REJECTED", async () => {
    const res = await request(app)
      .post("/api/posters")
      .set("Cookie", `${COOKIE_NAME}=${tokenA}`)
      .send({
        templateId: templateCondolence._id.toString(), // occasionType is condolence
        formData: validFormData, // occasionType is victory_day
        photos: getValidPhotosForUser(userA._id.toString()),
        consent: true,
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("CONTENT_REJECTED");
  });

  // 4. POST /posters with blocklisted text → 422 CONTENT_REJECTED
  it("4. POST /posters with blocklisted text -> 422 CONTENT_REJECTED", async () => {
    const res = await request(app)
      .post("/api/posters")
      .set("Cookie", `${COOKIE_NAME}=${tokenA}`)
      .send({
        templateId: templateVictory._id.toString(),
        formData: {
          ...validFormData,
          headline: "শত্রুকে খুন করো এবং ধ্বংস করো", // contains blocklisted term "খুন করো"
        },
        photos: getValidPhotosForUser(userA._id.toString()),
        consent: true,
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("CONTENT_REJECTED");
  });

  // 5. Poll GET /posters/:id until completed (with test-side await)
  it("5. Poll GET /posters/:id until completed -> final doc has generatedImageUrl and GenerationLog", async () => {
    const createRes = await request(app)
      .post("/api/posters")
      .set("Cookie", `${COOKIE_NAME}=${tokenA}`)
      .send({
        templateId: templateVictory._id.toString(),
        formData: validFormData,
        photos: getValidPhotosForUser(userA._id.toString()),
        consent: true,
      });

    const posterId = createRes.body.id;

    // Await background pipeline execution
    let attempts = 0;
    let completed = false;
    let pollRes: any;

    while (attempts < 30 && !completed) {
      await new Promise((r) => setTimeout(r, 200));
      pollRes = await request(app)
        .get(`/api/posters/${posterId}`)
        .set("Cookie", `${COOKIE_NAME}=${tokenA}`);

      if (pollRes.body.status === "completed" || pollRes.body.status === "failed") {
        completed = true;
      }
      attempts++;
    }

    expect(pollRes.status).toBe(200);
    expect(pollRes.body.status).toBe("completed");
    expect(pollRes.body.generatedImageUrl).toBeDefined();

    const genLog = await GenerationLog.findOne({ posterId: new Types.ObjectId(posterId) });
    expect(genLog).toBeDefined();
    expect(genLog?.success).toBe(true);

    // The uploaded artifact is real, round-tripped through storage, and 1800x2400
    const done = await Poster.findById(posterId);
    const stored = memStore.get(done!.generatedPublicId!);
    expect(stored).toBeDefined();
    const meta = await sharp(stored!).metadata();
    expect(meta.format).toBe("png");
    expect(meta.width).toBe(1800);
    expect(meta.height).toBe(2400);
    expect(done!.exports.png.bytes).toBe(stored!.length);
  }, 20000);

  // 6. User B cannot GET user A's poster → 404
  it("6. User B cannot GET user A's poster -> 404", async () => {
    const poster = await Poster.create({
      userId: userA._id,
      templateId: templateVictory._id,
      formData: validFormData,
      uploadedPhotoUrls: getValidPhotosForUser(userA._id.toString()),
      status: "completed",
      stage: "done",
      variationSeed: 0,
      consentAcceptedAt: new Date(),
    });

    const res = await request(app)
      .get(`/api/posters/${poster._id}`)
      .set("Cookie", `${COOKIE_NAME}=${tokenB}`);

    expect(res.status).toBe(404);
  });

  // 7. User B cannot POST /posters/:id/regenerate on user A's poster → 404
  it("7. User B cannot POST /posters/:id/regenerate on user A's poster -> 404", async () => {
    const poster = await Poster.create({
      userId: userA._id,
      templateId: templateVictory._id,
      formData: validFormData,
      uploadedPhotoUrls: getValidPhotosForUser(userA._id.toString()),
      status: "completed",
      stage: "done",
      variationSeed: 0,
      consentAcceptedAt: new Date(),
    });

    const res = await request(app)
      .post(`/api/posters/${poster._id}/regenerate`)
      .set("Cookie", `${COOKIE_NAME}=${tokenB}`)
      .send({});

    expect(res.status).toBe(404);
  });

  // 8. User B cannot DELETE user A's poster → 404
  it("8. User B cannot DELETE user A's poster -> 404", async () => {
    const poster = await Poster.create({
      userId: userA._id,
      templateId: templateVictory._id,
      formData: validFormData,
      uploadedPhotoUrls: getValidPhotosForUser(userA._id.toString()),
      status: "completed",
      stage: "done",
      variationSeed: 0,
      consentAcceptedAt: new Date(),
    });

    const res = await request(app)
      .delete(`/api/posters/${poster._id}`)
      .set("Cookie", `${COOKIE_NAME}=${tokenB}`);

    expect(res.status).toBe(404);
  });

  // 9. User B cannot GET /posters/user/{A} → 403
  it("9. User B cannot GET /posters/user/{A} -> 403", async () => {
    const res = await request(app)
      .get(`/api/posters/user/${userA._id}`)
      .set("Cookie", `${COOKIE_NAME}=${tokenB}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  // 10. Regenerate: retryCount increments, retriesLeft decrements
  it("10. Regenerate: retryCount increments, retriesLeft decrements", async () => {
    const poster = await Poster.create({
      userId: userA._id,
      templateId: templateVictory._id,
      formData: validFormData,
      uploadedPhotoUrls: getValidPhotosForUser(userA._id.toString()),
      status: "completed",
      stage: "done",
      retryCount: 0,
      maxRetries: 3,
      variationSeed: 0,
      consentAcceptedAt: new Date(),
    });

    const res = await request(app)
      .post(`/api/posters/${poster._id}/regenerate`)
      .set("Cookie", `${COOKIE_NAME}=${tokenA}`)
      .send({});

    expect(res.status).toBe(202);
    expect(res.body.retriesLeft).toBe(2);

    const updated = await Poster.findById(poster._id);
    expect(updated?.retryCount).toBe(1);
    expect(updated?.variationSeed).toBe(1);
  });

  // 11. Regenerate at limit → 403 RETRY_LIMIT_REACHED
  it("11. Regenerate at limit -> 403 RETRY_LIMIT_REACHED", async () => {
    const poster = await Poster.create({
      userId: userA._id,
      templateId: templateVictory._id,
      formData: validFormData,
      uploadedPhotoUrls: getValidPhotosForUser(userA._id.toString()),
      status: "completed",
      stage: "done",
      retryCount: 3,
      maxRetries: 3,
      variationSeed: 3,
      consentAcceptedAt: new Date(),
    });

    const res = await request(app)
      .post(`/api/posters/${poster._id}/regenerate`)
      .set("Cookie", `${COOKIE_NAME}=${tokenA}`)
      .send({});

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("RETRY_LIMIT_REACHED");
  });

  // 12. Regenerate while generating → 409
  it("12. Regenerate while generating -> 409", async () => {
    const poster = await Poster.create({
      userId: userA._id,
      templateId: templateVictory._id,
      formData: validFormData,
      uploadedPhotoUrls: getValidPhotosForUser(userA._id.toString()),
      status: "generating",
      stage: "rendering",
      retryCount: 0,
      maxRetries: 3,
      variationSeed: 0,
      consentAcceptedAt: new Date(),
    });

    const res = await request(app)
      .post(`/api/posters/${poster._id}/regenerate`)
      .set("Cookie", `${COOKIE_NAME}=${tokenA}`)
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  // 13. GET /download?format=pdf → 400 (PDF not supported)
  it("13. GET /download?format=pdf -> 400 (PDF not supported)", async () => {
    const poster = await Poster.create({
      userId: userA._id,
      templateId: templateVictory._id,
      formData: validFormData,
      uploadedPhotoUrls: getValidPhotosForUser(userA._id.toString()),
      status: "completed",
      stage: "done",
      exports: { png: { url: "/api/storage/test.png", width: 1800, height: 2400, bytes: 100 } },
      generatedPublicId: "test_pub_id",
      variationSeed: 0,
      consentAcceptedAt: new Date(),
    });

    const res = await request(app)
      .get(`/api/posters/${poster._id}/download?format=pdf`)
      .set("Cookie", `${COOKIE_NAME}=${tokenA}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("UNSUPPORTED_FORMAT");
  });

  // 14. GET /download on non-completed → 409
  it("14. GET /download on non-completed -> 409", async () => {
    const poster = await Poster.create({
      userId: userA._id,
      templateId: templateVictory._id,
      formData: validFormData,
      uploadedPhotoUrls: getValidPhotosForUser(userA._id.toString()),
      status: "generating",
      stage: "rendering",
      variationSeed: 0,
      consentAcceptedAt: new Date(),
    });

    const res = await request(app)
      .get(`/api/posters/${poster._id}/download?format=png`)
      .set("Cookie", `${COOKIE_NAME}=${tokenA}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("POSTER_NOT_READY");
  });

  // 15. GET /download on completed → 200, correct headers, PNG magic bytes
  it("15. GET /download on completed -> 200, correct headers, PNG magic bytes", async () => {
    const poster = await Poster.create({
      userId: userA._id,
      templateId: templateVictory._id,
      formData: validFormData,
      uploadedPhotoUrls: getValidPhotosForUser(userA._id.toString()),
      status: "completed",
      stage: "done",
      exports: { png: { url: "/api/storage/test.png", width: 1800, height: 2400, bytes: mockPngBuffer.length } },
      generatedPublicId: "test_pub_id",
      variationSeed: 0,
      consentAcceptedAt: new Date(),
    });

    const storedBytes = await sharp({
      create: { width: 64, height: 64, channels: 3, background: { r: 1, g: 2, b: 3 } },
    })
      .png()
      .toBuffer();
    memStore.set("test_pub_id", storedBytes);

    const res = await request(app)
      .get(`/api/posters/${poster._id}/download?format=png`)
      .set("Cookie", `${COOKIE_NAME}=${tokenA}`)
      .buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on("data", (c: Buffer) => chunks.push(c));
        r.on("end", () => cb(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("image/png");
    expect(res.headers["content-disposition"]).toMatch(/attachment; filename="prochar-victory-day-classic-\d{4}-\d{2}-\d{2}\.png"/);
    const body = res.body as Buffer;
    expect(body.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))).toBe(true);
    expect(body.equals(storedBytes)).toBe(true); // exact round-trip of stored bytes
  });

  // 16. DELETE removes poster + deletes storage assets (mock storage asserts delete called)
  it("16. DELETE removes poster + deletes storage assets", async () => {
    const poster = await Poster.create({
      userId: userA._id,
      templateId: templateVictory._id,
      formData: validFormData,
      uploadedPhotoUrls: getValidPhotosForUser(userA._id.toString()),
      generatedPublicId: "gen_photo_123",
      status: "completed",
      stage: "done",
      variationSeed: 0,
      consentAcceptedAt: new Date(),
    });

    await GenerationLog.create({
      posterId: poster._id,
      userId: userA._id,
      attempt: 0,
      promptVersion: "v1",
      geminiPromptUsed: "prompt",
      latencyMs: 100,
      geminiLatencyMs: 50,
      renderLatencyMs: 50,
      cacheHit: false,
      usedFallback: false,
      success: true,
      createdAt: new Date(),
    });

    const res = await request(app)
      .delete(`/api/posters/${poster._id}`)
      .set("Cookie", `${COOKIE_NAME}=${tokenA}`);

    expect(res.status).toBe(204);

    const checkPoster = await Poster.findById(poster._id);
    expect(checkPoster).toBeNull();

    const checkLog = await GenerationLog.find({ posterId: poster._id });
    expect(checkLog).toHaveLength(0);

    expect(mockStorageDelete).toHaveBeenCalledWith("gen_photo_123");
    expect(mockStorageDelete).toHaveBeenCalledWith(`posters/uploads/${userA._id}/photo1.webp`);
  });

  // 17. DELETE while generating → 409
  it("17. DELETE while generating -> 409", async () => {
    const poster = await Poster.create({
      userId: userA._id,
      templateId: templateVictory._id,
      formData: validFormData,
      uploadedPhotoUrls: getValidPhotosForUser(userA._id.toString()),
      status: "generating",
      stage: "rendering",
      variationSeed: 0,
      consentAcceptedAt: new Date(),
    });

    const res = await request(app)
      .delete(`/api/posters/${poster._id}`)
      .set("Cookie", `${COOKIE_NAME}=${tokenA}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  // 18. Stuck-job recovery: manually create a poster with status generating and updatedAt 10 min ago, boot recovery, verify status: failed
  it("18. Stuck-job recovery: marks posters stuck > 5m as failed without incrementing retryCount", async () => {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    const poster = await Poster.create({
      userId: userA._id,
      templateId: templateVictory._id,
      formData: validFormData,
      uploadedPhotoUrls: getValidPhotosForUser(userA._id.toString()),
      status: "generating",
      stage: "rendering",
      retryCount: 1,
      maxRetries: 3,
      variationSeed: 0,
      consentAcceptedAt: new Date(),
    });

    // Force updatedAt to 10 minutes ago
    await Poster.updateOne({ _id: poster._id }, { $set: { updatedAt: tenMinAgo } }, { timestamps: false });

    await recoverStuckJobs();

    const recovered = await Poster.findById(poster._id);
    expect(recovered?.status).toBe("failed");
    expect(recovered?.error?.code).toBe("JOB_INTERRUPTED");
    expect(recovered?.retryCount).toBe(1); // Per FR-R3: does NOT increment retryCount
  });

  // 19. Rate limit: 6th POST /posters within a minute → 429 with Retry-After
  it("19. Rate limit: 6th POST /posters within a minute -> 429", async () => {
    const prevDisabled = env.RATE_LIMIT_DISABLED;
    (env as { RATE_LIMIT_DISABLED: boolean }).RATE_LIMIT_DISABLED = false;
    try {
      await runRateLimitScenario();
    } finally {
      (env as { RATE_LIMIT_DISABLED: boolean }).RATE_LIMIT_DISABLED = prevDisabled;
    }
  });

  async function runRateLimitScenario() {
    // Make 5 requests under limit
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post("/api/posters")
        .set("Cookie", `${COOKIE_NAME}=${tokenA}`)
        .send({
          templateId: templateVictory._id.toString(),
          formData: validFormData,
          photos: getValidPhotosForUser(userA._id.toString()),
          consent: true,
        });
    }

    // 6th request must be rate limited
    const sixthRes = await request(app)
      .post("/api/posters")
      .set("Cookie", `${COOKIE_NAME}=${tokenA}`)
      .send({
        templateId: templateVictory._id.toString(),
        formData: validFormData,
        photos: getValidPhotosForUser(userA._id.toString()),
        consent: true,
      });

    expect(sixthRes.status).toBe(429);
    expect(sixthRes.headers).toHaveProperty("retry-after");
  }

  // 20. (Item C) Override from test 19 is cleaned up: limits are disabled again
  it("20. rate-limit override from test 19 is restored (limits disabled again)", async () => {
    expect(env.RATE_LIMIT_DISABLED).toBe(true);
    for (let i = 0; i < 7; i++) {
      const r = await request(app)
        .post("/api/posters")
        .set("Cookie", `${COOKIE_NAME}=${tokenB}`)
        .send({});
      expect(r.status).toBe(400); // validation error, never 429
    }
  });

  // 21. (Item A3) PhotoItemSchema URL allow-list
  it("21. PhotoItemSchema: local + Cloudinary URLs pass; malicious URLs fail", () => {
    const ok = (url: string) => PhotoItemSchema.safeParse({ url, publicId: "p" }).success;
    expect(ok("/api/storage/posters/uploads/u1/a.webp")).toBe(true);
    expect(ok("https://res.cloudinary.com/demo/image/upload/a.webp")).toBe(true);
    expect(ok("http://evil.com/x.jpg")).toBe(false);
    expect(ok("https://evil.com/x.jpg")).toBe(false);
    expect(ok("https://res.cloudinary.com.evil.com/x.jpg")).toBe(false);
    expect(ok("javascript:alert(1)")).toBe(false);
    expect(ok("file:///etc/passwd")).toBe(false);
    expect(ok("/etc/passwd")).toBe(false);
    expect(ok("/api/storage/../../etc/passwd")).toBe(false);
  });

  // 22. (Item A3) Malicious URL rejected at the route; nothing is fetched
  it("22. POST /posters with http://evil.com url -> 400 and no server-side fetch", async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockClear();
    const res = await request(app)
      .post("/api/posters")
      .set("Cookie", `${COOKIE_NAME}=${tokenA}`)
      .send({
        templateId: templateVictory._id.toString(),
        formData: validFormData,
        photos: [
          {
            url: "http://evil.com/x.jpg",
            publicId: `posters/uploads/${userA._id}/photo1.webp`,
          },
        ],
        consent: true,
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // 23. (Item A4) Ownership is enforced on publicId; url is never trusted and is server-derived
  it("23. ownership uses publicId; stored url is derived from publicId, not the client url", async () => {
    const ownPid = `posters/uploads/${userA._id}/photo1.webp`;
    const otherPid = `posters/uploads/${userB._id}/photo1.webp`;

    // A's publicId but a URL pointing at B's asset: accepted, URL ignored
    const okRes = await request(app)
      .post("/api/posters")
      .set("Cookie", `${COOKIE_NAME}=${tokenA}`)
      .send({
        templateId: templateVictory._id.toString(),
        formData: validFormData,
        photos: [{ url: `/api/storage/${otherPid}`, publicId: ownPid }],
        consent: true,
      });
    expect(okRes.status).toBe(202);
    const doc = await Poster.findById(okRes.body.id);
    expect(doc!.uploadedPhotoUrls[0].publicId).toBe(ownPid);
    expect(doc!.uploadedPhotoUrls[0].url).toBe(`/api/storage/${ownPid}`);

    // A's URL but B's publicId: rejected on publicId ownership
    const badRes = await request(app)
      .post("/api/posters")
      .set("Cookie", `${COOKIE_NAME}=${tokenA}`)
      .send({
        templateId: templateVictory._id.toString(),
        formData: validFormData,
        photos: [{ url: `/api/storage/${ownPid}`, publicId: otherPid }],
        consent: true,
      });
    expect(badRes.status).toBe(403);
    expect(badRes.body.error.code).toBe("PHOTO_NOT_OWNED");
  });
});
