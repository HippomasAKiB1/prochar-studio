import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import {
  getAiCacheKey,
  getCachedScheme,
  setCachedScheme,
  CachedSchemeValue,
} from "../cache.js";
import { AiCache } from "../../../models/AiCache.js";

let mongoServer: MongoMemoryServer;

describe("AI Cache Service (Chunk 4.13)", () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await AiCache.deleteMany({});
  });

  it("getAiCacheKey with same inputs produces identical hash", () => {
    const key1 = getAiCacheKey({
      templateId: "t123",
      occasionType: "victory_day",
      variationSeed: 42,
    });
    const key2 = getAiCacheKey({
      templateId: "t123",
      occasionType: "victory_day",
      variationSeed: 42,
    });
    expect(key1).toBe(key2);
    expect(key1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("verifies /10 bucketing boundaries (0 & 9 match, 9 & 10 differ, 10 & 19 match)", () => {
    const key0 = getAiCacheKey({
      templateId: "t123",
      occasionType: "victory_day",
      variationSeed: 0,
    });
    const key9 = getAiCacheKey({
      templateId: "t123",
      occasionType: "victory_day",
      variationSeed: 9,
    });
    const key10 = getAiCacheKey({
      templateId: "t123",
      occasionType: "victory_day",
      variationSeed: 10,
    });
    const key19 = getAiCacheKey({
      templateId: "t123",
      occasionType: "victory_day",
      variationSeed: 19,
    });

    // seed 0 and seed 9 -> same key (bucket 0)
    expect(key0).toBe(key9);
    // seed 9 and seed 10 -> different keys (bucket 0 vs bucket 1)
    expect(key9).not.toBe(key10);
    // seed 10 and seed 19 -> same key (bucket 1)
    expect(key10).toBe(key19);
  });

  it("different variationSeed within same /10 bucket produces same key", () => {
    const key1 = getAiCacheKey({
      templateId: "t123",
      occasionType: "victory_day",
      variationSeed: 12,
    });
    const key2 = getAiCacheKey({
      templateId: "t123",
      occasionType: "victory_day",
      variationSeed: 18,
    });
    expect(key1).toBe(key2);
  });

  it("different variationSeed across /10 buckets produces different key", () => {
    const key1 = getAiCacheKey({
      templateId: "t123",
      occasionType: "victory_day",
      variationSeed: 15,
    });
    const key2 = getAiCacheKey({
      templateId: "t123",
      occasionType: "victory_day",
      variationSeed: 25,
    });
    expect(key1).not.toBe(key2);
  });

  it("setCachedScheme then getCachedScheme round-trips correctly", async () => {
    const key = "test-hash-key-roundtrip";
    const sampleScheme: CachedSchemeValue = {
      colors: {
        primary: "#006A4E",
        secondary: "#D61F31",
        accent: "#F7C948",
        textOnPrimary: "#FFFFFF",
        textOnLight: "#1A1A1A",
      },
      decorations: ["paddy", "doves"],
      decorationIntensity: "medium",
    };

    await setCachedScheme(key, sampleScheme, 30);
    const retrieved = await getCachedScheme(key);

    expect(retrieved).not.toBeNull();
    expect(retrieved?.colors).toEqual(sampleScheme.colors);
    expect(retrieved?.decorations).toEqual(sampleScheme.decorations);
    expect(retrieved?.decorationIntensity).toBe("medium");
  });

  it("expired entry returns null", async () => {
    const key = "test-hash-expired";
    const sampleScheme: CachedSchemeValue = {
      colors: {
        primary: "#006A4E",
        secondary: "#D61F31",
        accent: "#F7C948",
        textOnPrimary: "#FFFFFF",
        textOnLight: "#1A1A1A",
      },
      decorations: ["paddy"],
      decorationIntensity: "low",
    };

    // Store with expiresAt in the past
    const pastDate = new Date(Date.now() - 1000 * 60 * 60);
    await AiCache.create({
      key,
      value: sampleScheme,
      expiresAt: pastDate,
    });

    const retrieved = await getCachedScheme(key);
    expect(retrieved).toBeNull();
  });
});
