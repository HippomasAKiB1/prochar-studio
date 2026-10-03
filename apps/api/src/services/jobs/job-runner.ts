import sharp from "sharp";
import crypto from "node:crypto";
import { Types } from "mongoose";
import { Poster, IPosterDocument } from "../../models/Poster.js";
import { GenerationLog } from "../../models/GenerationLog.js";
import { Template } from "../../models/Template.js";
import { generateLayoutPlan } from "../ai/gemini.service.js";
import { renderPoster } from "../render/render.service.js";
import { getStorageProvider } from "../storage/index.js";
import { resolveInsideRoot } from "../storage/local.provider.js";
import { assertUserOwnsPublicId } from "@prochar/shared";
import { logger } from "../../config/logger.js";
import { PROMPT_VERSION } from "../ai/prompt.js";
// Type alias for p-limit's LimitFunction (avoid type-only ESM import issue)
type LimitFunction = <T>(fn: () => Promise<T> | T) => Promise<T>;

// Concurrency semaphores (process-wide, per PRD §5.9)
// p-limit v5 is ESM-only — must be dynamically imported.
let _geminiLimit: LimitFunction;
let _renderLimit: LimitFunction;

async function getSemaphores(): Promise<{ geminiLimit: LimitFunction; renderLimit: LimitFunction }> {
  if (!_geminiLimit || !_renderLimit) {
    const { default: pLimit } = await import("p-limit");
    _geminiLimit = pLimit(2);
    _renderLimit = pLimit(2);
  }
  return { geminiLimit: _geminiLimit, renderLimit: _renderLimit };
}

// Export accessors for tests
export async function getGeminiLimit(): Promise<LimitFunction> {
  const s = await getSemaphores();
  return s.geminiLimit;
}
export async function getRenderLimit(): Promise<LimitFunction> {
  const s = await getSemaphores();
  return s.renderLimit;
}

// ---------------------------------------------------------------------------
// Error code mapping
// ---------------------------------------------------------------------------
function mapErrorToCode(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message;
    if (msg.includes("FONT_LOAD_FAILED")) return "RENDER_FONT_FAILED";
    if (msg.includes("RENDER_TIMEOUT")) return "RENDER_TIMEOUT";
    if (msg.includes("TEXT_OVERFLOW_AT_MIN")) return "TEXT_OVERFLOW";
    if (msg.includes("PHOTO_UNREADABLE") || msg.includes("PHOTO_DECODE_FAILED"))
      return "PHOTO_UNREADABLE";
    if (msg.includes("OWNERSHIP_VIOLATION")) return "OWNERSHIP_VIOLATION";
    if (/cloudinary|upload|storage/i.test(msg)) return "STORAGE_ERROR";
  }
  return "INTERNAL";
}

function safeMessageForUser(code: string): string {
  const messages: Record<string, string> = {
    AI_TIMEOUT: "AI পরিষেবা সাড়া দিতে সময় নিচ্ছে। পোস্টার তৈরি হয়নি।",
    PHOTO_UNREADABLE: "আপলোড করা ছবি পড়া যায়নি। অন্য ছবি দিয়ে আবার চেষ্টা করুন।",
    RENDER_FONT_FAILED: "ফন্ট লোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
    RENDER_TIMEOUT: "পোস্টার তৈরি করতে অতিরিক্ত সময় লেগেছে। আবার চেষ্টা করুন।",
    TEXT_OVERFLOW: "লেখাটি নির্দিষ্ট স্থানে এঁটে যায়নি। অনুগ্রহ করে ছোট করুন।",
    STORAGE_ERROR: "ছবি সংরক্ষণ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।",
    OWNERSHIP_VIOLATION: "ছবির মালিকানা যাচাই করা যায়নি।",
    INTERNAL: "একটি অভ্যন্তরীণ ত্রুটি ঘটেছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
  };
  return messages[code] ?? messages["INTERNAL"];
}

// ---------------------------------------------------------------------------
// Storage upload with 2 retries
// ---------------------------------------------------------------------------
async function uploadWithRetry(
  buffer: Buffer,
  folder: string,
  publicId: string
): Promise<{ url: string; publicId: string }> {
  const storage = getStorageProvider();
  const delays = [100, 400];

  let lastErr: unknown;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      const result = await storage.upload(buffer, { folder, publicId });
      return result;
    } catch (err) {
      lastErr = err;
      if (attempt < delays.length) {
        await new Promise((r) => setTimeout(r, delays[attempt]));
      }
    }
  }
  throw lastErr;
}

// ---------------------------------------------------------------------------
// Render with 1 retry on fresh page
// ---------------------------------------------------------------------------
async function renderWithRetry(params: Parameters<typeof renderPoster>[0]): Promise<Buffer> {
  try {
    return await renderPoster(params);
  } catch (err) {
    logger.warn({ err }, "render attempt 1 failed, retrying on fresh page");
    return await renderPoster(params);
  }
}

// ---------------------------------------------------------------------------
// Fetch photo bytes (local or remote)
// ---------------------------------------------------------------------------
async function fetchPhotoBuffer(url: string, publicId: string): Promise<Buffer> {
  if (url.startsWith("/api/storage/")) {
    // Local storage: read the file from disk
    const storage = getStorageProvider();
    const fs = await import("node:fs/promises");
    const localStorageWithDir = storage as unknown as { getBaseDir?: () => string };
    const baseDir =
      typeof localStorageWithDir.getBaseDir === "function"
        ? localStorageWithDir.getBaseDir()
        : "./apps/api/.local-storage";
    return await fs.readFile(resolveInsideRoot(baseDir, publicId));
  }
  // Remote (Cloudinary): URL is derived from the trusted publicId, never from stored/client url
  const remoteUrl = getStorageProvider().getUrl(publicId);
  const response = await fetch(remoteUrl);
  if (!response.ok) throw new Error(`HTTP ${response.status} fetching photo`);
  const ab = await response.arrayBuffer();
  return Buffer.from(ab);
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------
async function generatePosterPipeline(posterId: string, attempt: number): Promise<void> {
  const pipelineStart = Date.now();
  let poster: IPosterDocument | null = null;
  let geminiLatencyMs = 0;
  let renderLatencyMs = 0;
  let usedFallback = false;
  let cacheHit = false;
  let promptUsed = "";
  let tokensUsed:
    | { promptTokens: number; completionTokens: number; totalTokens: number }
    | undefined;

  try {
    // Step 1: Load poster, verify status
    poster = await Poster.findById(posterId);
    if (!poster || poster.status !== "generating") {
      logger.warn({ posterId }, "Pipeline aborted: poster not in generating state");
      return;
    }

    const userId = poster.userId.toString();
    const { geminiLimit, renderLimit } = await getSemaphores();

    // Step 2: Update stage → analyzing
    await Poster.updateOne({ _id: poster._id }, { stage: "analyzing" });

    // Step 3: Load template
    const template = await Template.findById(poster.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    // Step 3b: Verify photo ownership (defensive check)
    for (const photo of poster.uploadedPhotoUrls) {
      if (!assertUserOwnsPublicId(photo.publicId, userId)) {
        throw new Error(`OWNERSHIP_VIOLATION: publicId ${photo.publicId}`);
      }
    }

    // Step 4: Normalise photos via sharp (resize longest side 1024, re-encode webp)
    const photoBuffers: Buffer[] = [];
    for (const photo of poster.uploadedPhotoUrls) {
      let rawBuffer: Buffer;
      try {
        rawBuffer = await fetchPhotoBuffer(photo.url, photo.publicId);
      } catch (err) {
        logger.error({ err, publicId: photo.publicId }, "Failed to fetch photo");
        throw new Error(`PHOTO_UNREADABLE: ${photo.publicId}`);
      }

      try {
        const normalised = await sharp(rawBuffer)
          .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
          .webp({ quality: 85 })
          .toBuffer();
        photoBuffers.push(normalised);
      } catch (err) {
        logger.error({ err, publicId: photo.publicId }, "Failed to normalise photo");
        throw new Error(`PHOTO_UNREADABLE: sharp decode failed for ${photo.publicId}`);
      }
    }

    // Step 5: Gemini layout plan (semaphore-limited)
    const geminiStart = Date.now();
    const layoutResult = await geminiLimit(() =>
      generateLayoutPlan({
        template,
        formData: {
          occasionType: poster!.formData.occasionType,
          headline: poster!.formData.headline,
          name: poster!.formData.name,
        },
        photos: photoBuffers,
        variationSeed: poster!.variationSeed,
      })
    );
    geminiLatencyMs = Date.now() - geminiStart;
    usedFallback = !layoutResult.aiAssisted;
    cacheHit = layoutResult.cacheHit;
    promptUsed = `variationSeed=${poster.variationSeed} occasionType=${poster.formData.occasionType}`;

    // Persist layoutPlan and aiAssisted immediately
    await Poster.updateOne(
      { _id: poster._id },
      {
        layoutPlan: layoutResult.plan as unknown as Record<string, unknown>,
        aiAssisted: layoutResult.aiAssisted,
      }
    );

    // Step 6: Update stage → rendering
    await Poster.updateOne({ _id: poster._id }, { stage: "rendering" });

    // Step 7: Render poster (semaphore-limited, 1 retry)
    const renderStart = Date.now();
    const pngBuffer = await renderLimit(() =>
      renderWithRetry({
        template: template.layoutConfig,
        formData: {
          name: poster!.formData.name,
          designation: poster!.formData.designation,
          partyOrOrganization: poster!.formData.partyOrOrganization,
          union: poster!.formData.union,
          thana: poster!.formData.thana,
          district: poster!.formData.district,
          occasionType: poster!.formData.occasionType as Parameters<
            typeof renderPoster
          >[0]["formData"]["occasionType"],
          headline: poster!.formData.headline,
          subtext: poster!.formData.subtext,
          creditLine: poster!.formData.creditLine,
        },
        layoutPlan: layoutResult.plan,
        photos: photoBuffers.map((buf, idx) => {
          const photoPlan = layoutResult.plan.photos.find((p) => p.index === idx);
          return {
            buffer: buf,
            focal: photoPlan?.focal,
            zoom: photoPlan?.zoom,
          };
        }),
      })
    );
    renderLatencyMs = Date.now() - renderStart;

    // Step 8: Update stage → uploading
    await Poster.updateOne({ _id: poster._id }, { stage: "uploading" });

    // Step 9: Upload PNG to storage (with retries)
    const generatedUuid = crypto.randomUUID();
    const folder = `posters/generated/${userId}`;
    const genPublicId = `${folder}/${generatedUuid}`;
    const uploadResult = await uploadWithRetry(pngBuffer, folder, genPublicId);

    // Step 10: Update poster to completed
    await Poster.updateOne(
      { _id: poster._id },
      {
        status: "completed",
        stage: "done",
        generatedImageUrl: uploadResult.url,
        generatedPublicId: uploadResult.publicId,
        "exports.png": {
          url: uploadResult.url,
          width: 1800,
          height: 2400,
          bytes: pngBuffer.length,
        },
      }
    );

    // Step 11: Write GenerationLog entry
    await GenerationLog.create({
      posterId: new Types.ObjectId(posterId),
      userId: poster.userId,
      attempt,
      promptVersion: PROMPT_VERSION,
      geminiPromptUsed: promptUsed,
      tokensUsed,
      latencyMs: Date.now() - pipelineStart,
      geminiLatencyMs,
      renderLatencyMs,
      cacheHit,
      usedFallback,
      success: true,
    });

    logger.info(
      { posterId, latencyMs: Date.now() - pipelineStart },
      "Poster generation completed"
    );
  } catch (err: unknown) {
    const code = mapErrorToCode(err);
    const message = safeMessageForUser(code);

    logger.error({ err, posterId, code }, "Poster generation failed");

    const capturedPoster = poster;
    if (capturedPoster) {
      await Poster.updateOne(
        { _id: capturedPoster._id },
        { status: "failed", error: { code, message } }
      ).catch((dbErr) => {
        logger.error({ dbErr, posterId }, "Failed to update poster error state");
      });
    }

    // Write failed GenerationLog
    try {
      if (capturedPoster) {
        await GenerationLog.create({
          posterId: new Types.ObjectId(posterId),
          userId: capturedPoster.userId,
          attempt,
          promptVersion: PROMPT_VERSION,
          geminiPromptUsed: promptUsed,
          latencyMs: Date.now() - pipelineStart,
          geminiLatencyMs,
          renderLatencyMs,
          cacheHit,
          usedFallback,
          success: false,
          errorCode: code,
        });
      }
    } catch (logErr) {
      logger.error({ logErr, posterId }, "Failed to write GenerationLog failure entry");
    }
  }
}

// ---------------------------------------------------------------------------
// Public: enqueue a generation (fire-and-forget)
// ---------------------------------------------------------------------------
export function enqueueGeneration(posterId: string, attempt: number): void {
  // Fire-and-forget async IIFE; caller has already responded 202
  void (async () => {
    try {
      await generatePosterPipeline(posterId, attempt);
    } catch (err) {
      logger.error({ err, posterId }, "Unexpected uncaught error in generatePosterPipeline");
    }
  })();
}
