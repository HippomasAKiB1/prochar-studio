import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import sharp from "sharp";
import { app } from "../app.js";
import { User } from "../models/User.js";
import { signToken, COOKIE_NAME } from "../services/auth.service.js";

let mongod: MongoMemoryServer;
let testUserId: string;
let authCookie: string;

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

  const user = await User.create({
    name: "আপলোড ব্যবহারকারী",
    email: "upload_user@example.com",
    passwordHash: "hash_12345",
    role: "user",
  });
  testUserId = user._id.toString();
  const token = signToken({ sub: testUserId, role: "user" });
  authCookie = `${COOKIE_NAME}=${token}`;
});

describe("POST /api/upload Endpoint", () => {
  it("rejects unauthorized requests -> 401", async () => {
    const res = await request(app).post("/api/upload");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("UNAUTHORIZED");
  });

  it("uploads valid JPEG -> 201, publicId starts with posters/uploads/{userId}/", async () => {
    const validJpeg = await sharp({
      create: {
        width: 200,
        height: 300,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .jpeg()
      .toBuffer();

    const res = await request(app)
      .post("/api/upload")
      .set("Cookie", [authCookie])
      .attach("photos", validJpeg, "test-photo.jpg");

    expect(res.status).toBe(201);
    expect(res.body.photos).toBeDefined();
    expect(res.body.photos.length).toBe(1);

    const photo = res.body.photos[0];
    expect(photo.url).toBeDefined();
    expect(photo.publicId).toBeDefined();
    expect(photo.publicId.startsWith(`posters/uploads/${testUserId}/`)).toBe(true);
    expect(photo.width).toBe(200);
    expect(photo.height).toBe(300);
  });

  it("rejects non-image file with spoofed extension (.txt renamed .jpg) -> 422", async () => {
    const fakeImageBuffer = Buffer.from("Hello, this is just a plain text file, not a real JPEG!");

    const res = await request(app)
      .post("/api/upload")
      .set("Cookie", [authCookie])
      .attach("photos", fakeImageBuffer, "innocent.jpg");

    expect(res.status).toBe(422);
    expect(res.body.error).toBe("UNPROCESSABLE_ENTITY");
  });

  it("rejects file exceeding 5 MB limit (6 MB file) -> 413 or 400", async () => {
    const largeBuffer = Buffer.alloc(6 * 1024 * 1024, 0);

    const res = await request(app)
      .post("/api/upload")
      .set("Cookie", [authCookie])
      .attach("photos", largeBuffer, "large_photo.jpg");

    expect([400, 413]).toContain(res.status);
  });

  it("rejects more than 3 files -> 400", async () => {
    const sampleBuffer = await sharp({
      create: { width: 50, height: 50, channels: 3, background: { r: 0, g: 255, b: 0 } },
    })
      .png()
      .toBuffer();

    const res = await request(app)
      .post("/api/upload")
      .set("Cookie", [authCookie])
      .attach("photos", sampleBuffer, "photo1.png")
      .attach("photos", sampleBuffer, "photo2.png")
      .attach("photos", sampleBuffer, "photo3.png")
      .attach("photos", sampleBuffer, "photo4.png");

    expect(res.status).toBe(400);
  });

  it("strips EXIF / GPS metadata from uploaded photo", async () => {
    // Generate JPEG with EXIF metadata
    const jpegWithExif = await sharp({
      create: {
        width: 150,
        height: 150,
        channels: 3,
        background: { r: 0, g: 0, b: 255 },
      },
    })
      .withMetadata({
        exif: {
          IFD0: {
            Make: "ProcharCameraBrand",
            Model: "ModelXYZ",
          },
        },
      })
      .jpeg()
      .toBuffer();

    // Verify metadata was attached in our test input
    const initialMeta = await sharp(jpegWithExif).metadata();
    expect(initialMeta.exif).toBeDefined();

    // Upload through our endpoint
    const res = await request(app)
      .post("/api/upload")
      .set("Cookie", [authCookie])
      .attach("photos", jpegWithExif, "with-exif.jpg");

    expect(res.status).toBe(201);
    const photo = res.body.photos[0];

    // Fetch the stored output via local storage route
    const fetchRes = await request(app).get(photo.url);
    expect(fetchRes.status).toBe(200);

    // Verify stripped output has NO exif metadata
    const processedMeta = await sharp(fetchRes.body).metadata();
    expect(processedMeta.exif).toBeUndefined();
    expect(processedMeta.format).toBe("webp");
  });
});
