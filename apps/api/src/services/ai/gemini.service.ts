import fs from "node:fs";
import path from "node:path";
import { env } from "../../config/env.js";
import { ITemplateDocument } from "../../models/Template.js";
import { callGeminiForLayout, GeminiError } from "./gemini-client.js";
import {
  buildSystemInstruction,
  buildUserPrompt,
  LAYOUT_PLAN_RESPONSE_SCHEMA,
} from "./prompt.js";
import {
  RawLayoutPlan,
  validateAndClampPlan,
  getFallbackPlan,
  ClampContext,
} from "./layout-plan.js";
import { getAiCacheKey, getCachedScheme, setCachedScheme } from "./cache.js";

export type TemplateDoc = ITemplateDocument;

export interface GenerateLayoutPlanInput {
  template: TemplateDoc;
  formData: { occasionType: string; headline: string; name: string };
  photos: Buffer[];
  variationSeed: number;
}

export interface GenerateLayoutPlanOutput {
  plan: RawLayoutPlan;
  aiAssisted: boolean;
  cacheHit: boolean;
  geminiLatencyMs: number;
  tokensUsed?: number;
}

function getToneForOccasion(occasionType: string): string {
  switch (occasionType) {
    case "condolence":
      return "solemn, respectful, tribute";
    case "victory_day":
      return "patriotic, celebratory, historic";
    case "campaign":
    default:
      return "bold, energetic, leadership";
  }
}

function loadMockFixture(occasionType: string, templateSlug: string): RawLayoutPlan {
  try {
    const fixturePath = path.resolve(__dirname, "../../../fixtures/gemini-mock.json");
    if (fs.existsSync(fixturePath)) {
      const content = fs.readFileSync(fixturePath, "utf8");
      const data = JSON.parse(content);
      if (data[occasionType]) {
        return data[occasionType];
      }
    }
  } catch {
    // ignore read error and use fallback
  }
  return getFallbackPlan(templateSlug);
}

/**
 * Orchestrator for AI layout generation with mock support, caching, retries, and fallback.
 */
export async function generateLayoutPlan(
  input: GenerateLayoutPlanInput
): Promise<GenerateLayoutPlanOutput> {
  const startTime = Date.now();
  const { template, formData, photos, variationSeed } = input;

  // 1. Compute cache key
  const templateId = template._id ? template._id.toString() : template.slug;
  const cacheKey = getAiCacheKey({
    templateId,
    occasionType: formData.occasionType,
    variationSeed,
  });

  // 2. Try cache hit
  try {
    const cached = await getCachedScheme(cacheKey);
    if (cached) {
      // Build plan with fallback focal points for user photos (focal analysis is per-user)
      const photoPlans = (photos.length > 0 ? photos : [null]).map((_, idx) => ({
        index: idx,
        focal: { x: 0.5, y: 0.3 },
        zoom: 1.0,
      }));

      const plan: RawLayoutPlan = {
        photos: photoPlans,
        colors: cached.colors,
        decorations: cached.decorations,
        decorationIntensity: cached.decorationIntensity,
        headlineTier: "large",
      };

      return {
        plan,
        aiAssisted: true,
        cacheHit: true,
        geminiLatencyMs: Date.now() - startTime,
      };
    }
  } catch {
    // Cache read failure shouldn't block generation, proceed to cache miss
  }

  // 3. If AI_PROVIDER === "mock", return mock fixture and populate cache
  if (env.AI_PROVIDER === "mock") {
    const mockPlan = loadMockFixture(formData.occasionType, template.slug);
    await setCachedScheme(cacheKey, {
      colors: mockPlan.colors,
      decorations: mockPlan.decorations,
      decorationIntensity: mockPlan.decorationIntensity,
    }).catch(() => {});

    return {
      plan: mockPlan,
      aiAssisted: true,
      cacheHit: false,
      geminiLatencyMs: Date.now() - startTime,
    };
  }

  // 4. Cache miss: prepare prompt
  const clampCtx: ClampContext = {
    template: {
      slug: template.slug,
      colorScheme: template.layoutConfig.colorScheme,
      contrastPairs: template.layoutConfig.contrastPairs,
      aiAllowedDecorations: template.layoutConfig.aiAllowedDecorations,
    },
  };

  const systemInstruction = buildSystemInstruction();
  const userPrompt = buildUserPrompt({
    occasionType: formData.occasionType,
    tone: getToneForOccasion(formData.occasionType),
    photoCount: photos.length,
    templateSlots: template.layoutConfig.photoSlots.map((s) => ({
      id: s.id,
      shape: s.shape,
      w: s.w,
      h: s.h,
    })),
    allowedDecorations: template.layoutConfig.aiAllowedDecorations,
    defaultPalette: template.layoutConfig.colorScheme,
    contrastRules: template.layoutConfig.contrastPairs
      .map((p) => `${p.fg} vs ${p.bg}`)
      .join(", "),
    variationSeed,
  });

  const callWithTimeout = () =>
    callGeminiForLayout({
      systemInstruction,
      userPrompt,
      photos,
      responseSchema: LAYOUT_PLAN_RESPONSE_SCHEMA,
      timeoutMs: env.GEMINI_TIMEOUT_MS,
    });

  let rawResult: unknown = null;

  try {
    rawResult = await callWithTimeout();
  } catch (err: unknown) {
    if (err instanceof GeminiError) {
      // Immediate fallback on safety block or invalid JSON
      if (err.code === "SAFETY_BLOCK" || err.code === "INVALID_JSON") {
        return {
          plan: getFallbackPlan(template.slug),
          aiAssisted: false,
          cacheHit: false,
          geminiLatencyMs: Date.now() - startTime,
        };
      }

      // Retry once with 200-500ms jitter on timeout, rate-limited, or server error
      if (
        err.code === "TIMEOUT" ||
        err.code === "SERVER_ERROR" ||
        err.code === "RATE_LIMITED"
      ) {
        try {
          const jitterMs = 200 + Math.random() * 300;
          await new Promise((resolve) => setTimeout(resolve, jitterMs));
          rawResult = await callWithTimeout();
        } catch {
          return {
            plan: getFallbackPlan(template.slug),
            aiAssisted: false,
            cacheHit: false,
            geminiLatencyMs: Date.now() - startTime,
          };
        }
      }
    } else {
      return {
        plan: getFallbackPlan(template.slug),
        aiAssisted: false,
        cacheHit: false,
        geminiLatencyMs: Date.now() - startTime,
      };
    }
  }

  // 5. On success: validate and clamp
  try {
    const plan = validateAndClampPlan(rawResult, clampCtx);

    // Cache the color and decoration portion
    await setCachedScheme(cacheKey, {
      colors: plan.colors,
      decorations: plan.decorations,
      decorationIntensity: plan.decorationIntensity,
    }).catch(() => {
      // ignore cache write error
    });

    return {
      plan,
      aiAssisted: true,
      cacheHit: false,
      geminiLatencyMs: Date.now() - startTime,
    };
  } catch {
    // If validation fails unexpectedly, fallback
    return {
      plan: getFallbackPlan(template.slug),
      aiAssisted: false,
      cacheHit: false,
      geminiLatencyMs: Date.now() - startTime,
    };
  }
}
