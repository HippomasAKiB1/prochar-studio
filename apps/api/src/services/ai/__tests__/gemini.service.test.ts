import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { env } from "../../../config/env.js";
import { generateLayoutPlan } from "../gemini.service.js";
import { GeminiError } from "../gemini-client.js";
import { getFallbackPlan } from "../layout-plan.js";
import { AiCache } from "../../../models/AiCache.js";
import { getAiCacheKey, setCachedScheme } from "../cache.js";

// Mock gemini-client
vi.mock("../gemini-client.js", async () => {
  const actual = await vi.importActual<any>("../gemini-client.js");
  return {
    ...actual,
    callGeminiForLayout: vi.fn(),
  };
});

import { callGeminiForLayout } from "../gemini-client.js";

const callGeminiMock = vi.mocked(callGeminiForLayout);

let mongoServer: MongoMemoryServer;

describe("Gemini Service Integration (Chunk 4.14 / 4.17)", () => {
  const mockTemplate: any = {
    _id: new mongoose.Types.ObjectId(),
    slug: "victory-day-classic",
    title: "বিজয় দিবস",
    titleEn: "Victory Day",
    occasionType: "victory_day",
    isActive: true,
    layoutConfig: {
      schemaVersion: 1,
      canvas: { width: 600, height: 800 },
      layoutFamily: "triple-top",
      colorScheme: {
        background: "#FFF8E7",
        primary: "#006A4E",
        secondary: "#D61F31",
        accent: "#F7C948",
        textOnPrimary: "#FFFFFF",
        textOnLight: "#1A1A1A",
      },
      contrastPairs: [
        { fg: "textOnPrimary", bg: "primary", min: 4.5 },
        { fg: "textOnLight", bg: "background", min: 4.5 },
      ],
      layers: [],
      photoSlots: [
        {
          id: "center",
          shape: "rounded",
          x: 215,
          y: 36,
          w: 170,
          h: 214,
          z: 4,
          border: { width: 4, color: "$accent" },
        },
      ],
      photoAssignment: { "1": ["center"], "2": ["center"], "3": ["center"] },
      textSlots: [],
      footer: {
        preset: "standard-v1",
        fill: "$primary",
        topRule: { height: 4, color: "$accent" },
      },
      decorations: [],
      aiAllowedDecorations: ["paddy", "doves"],
      maxPhotos: 3,
    },
  };

  const sampleFormData = {
    occasionType: "victory_day",
    headline: "মহান বিজয় দিবস",
    name: "নমুনা নাম",
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    await AiCache.deleteMany({});
  });

  it("scenario 1: With AI_PROVIDER=mock returns fallback-equivalent plan, aiAssisted=true, cacheHit=false", async () => {
    (env as any).AI_PROVIDER = "mock";

    const result = await generateLayoutPlan({
      template: mockTemplate,
      formData: sampleFormData,
      photos: [Buffer.from("dummy-photo")],
      variationSeed: 42,
    });

    expect(result.aiAssisted).toBe(true);
    expect(result.cacheHit).toBe(false);
    expect(result.plan.headlineTier).toBe("large");
    expect(result.plan.decorationIntensity).toBe("medium");
    expect(callGeminiMock).not.toHaveBeenCalled();
  });

  it("scenario 2: With mocked GeminiError('TIMEOUT') twice -> fallback plan returned, aiAssisted=false", async () => {
    (env as any).AI_PROVIDER = "gemini";
    callGeminiMock.mockRejectedValue(new GeminiError("TIMEOUT", "Request timed out"));

    const result = await generateLayoutPlan({
      template: mockTemplate,
      formData: sampleFormData,
      photos: [Buffer.from("dummy-photo")],
      variationSeed: 42,
    });

    expect(result.aiAssisted).toBe(false);
    expect(result.cacheHit).toBe(false);
    expect(result.plan).toEqual(getFallbackPlan("victory-day-classic"));
    // Initial attempt + 1 retry = 2 calls
    expect(callGeminiMock).toHaveBeenCalledTimes(2);
  });

  it("scenario 3: With mocked GeminiError('SAFETY_BLOCK') -> immediate fallback, no retry (called once)", async () => {
    (env as any).AI_PROVIDER = "gemini";
    callGeminiMock.mockRejectedValue(new GeminiError("SAFETY_BLOCK", "Blocked by safety"));

    const result = await generateLayoutPlan({
      template: mockTemplate,
      formData: sampleFormData,
      photos: [Buffer.from("dummy-photo")],
      variationSeed: 42,
    });

    expect(result.aiAssisted).toBe(false);
    expect(result.cacheHit).toBe(false);
    expect(result.plan).toEqual(getFallbackPlan("victory-day-classic"));
    // Immediate fallback without retry
    expect(callGeminiMock).toHaveBeenCalledTimes(1);
  });

  it("scenario 4: Cache hit seeds AiCache entry, verifies getCachedScheme path, Gemini never called", async () => {
    (env as any).AI_PROVIDER = "gemini";

    const cacheKey = getAiCacheKey({
      templateId: mockTemplate._id.toString(),
      occasionType: "victory_day",
      variationSeed: 55,
    });

    await setCachedScheme(cacheKey, {
      colors: {
        primary: "#006A4E",
        secondary: "#D61F31",
        accent: "#F7C948",
        textOnPrimary: "#FFFFFF",
        textOnLight: "#1A1A1A",
      },
      decorations: ["paddy", "doves"],
      decorationIntensity: "high",
    });

    const result = await generateLayoutPlan({
      template: mockTemplate,
      formData: sampleFormData,
      photos: [Buffer.from("dummy-photo")],
      variationSeed: 55,
    });

    expect(result.aiAssisted).toBe(true);
    expect(result.cacheHit).toBe(true);
    expect(result.plan.decorationIntensity).toBe("high");
    expect(result.plan.decorations).toEqual(["paddy", "doves"]);
    expect(callGeminiMock).not.toHaveBeenCalled();
  });

  it("scenario 5: Cache miss writes to AiCache after successful Gemini call", async () => {
    (env as any).AI_PROVIDER = "gemini";

    const geminiRawPlan = {
      photos: [{ index: 0, focal: { x: 0.45, y: 0.28 }, zoom: 1.15 }],
      colors: {
        primary: "#006A4E",
        secondary: "#D61F31",
        accent: "#F7C948",
        textOnPrimary: "#FFFFFF",
        textOnLight: "#1A1A1A",
      },
      decorations: ["paddy"],
      decorationIntensity: "medium",
      headlineTier: "large",
    };

    callGeminiMock.mockResolvedValueOnce(geminiRawPlan);

    const result = await generateLayoutPlan({
      template: mockTemplate,
      formData: sampleFormData,
      photos: [Buffer.from("dummy-photo")],
      variationSeed: 91,
    });

    expect(result.aiAssisted).toBe(true);
    expect(result.cacheHit).toBe(false);
    expect(callGeminiMock).toHaveBeenCalledTimes(1);

    // Verify written to AiCache
    const cacheKey = getAiCacheKey({
      templateId: mockTemplate._id.toString(),
      occasionType: "victory_day",
      variationSeed: 91,
    });

    const cachedEntry = await AiCache.findOne({ key: cacheKey });
    expect(cachedEntry).not.toBeNull();
    expect(cachedEntry?.value.colors.primary).toBe("#006A4E");
    expect(cachedEntry?.value.decorations).toEqual(["paddy"]);
  });
});
