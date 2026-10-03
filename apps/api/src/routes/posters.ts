import { Router, Request, Response } from "express";
import { Types } from "mongoose";
import { CreatePosterRequestSchema, RegeneratePosterRequestSchema } from "@prochar/shared";
import { assertUserOwnsPublicId } from "@prochar/shared";
import { requireAuth } from "../middleware/auth.middleware.js";
import { posterCreateLimiter, posterDailyLimiter } from "../middleware/rate-limit.js";
import { Poster } from "../models/Poster.js";
import { GenerationLog } from "../models/GenerationLog.js";
import { Template } from "../models/Template.js";
import { enqueueGeneration } from "../services/jobs/job-runner.js";
import { getStorageProvider } from "../services/storage/index.js";
import { resolveInsideRoot } from "../services/storage/local.provider.js";
import { containsBlocklistedContent } from "../config/blocklist.js";
import { logger } from "../config/logger.js";

export const postersRouter = Router();

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

function isValidObjectId(id: string): boolean {
  return OBJECT_ID_REGEX.test(id);
}

// ============================================================================
// POST /api/posters — Create & enqueue poster generation
// ============================================================================
postersRouter.post(
  "/",
  requireAuth,
  posterCreateLimiter,
  posterDailyLimiter,
  async (req: Request, res: Response): Promise<void> => {
    // Validate body with Zod
    const parse = CreatePosterRequestSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "Invalid request body", details: parse.error.issues },
      });
      return;
    }

    const { templateId, formData, photos } = parse.data;
    const userId = req.user!._id.toString();

    // Photo ownership check (FR-U4, defensive)
    for (const photo of photos) {
      if (!assertUserOwnsPublicId(photo.publicId, userId)) {
        res.status(403).json({
          error: { code: "PHOTO_NOT_OWNED", message: "One or more photos do not belong to you." },
        });
        return;
      }
    }

    // Template existence + occasionType match
    if (!isValidObjectId(templateId)) {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "Invalid templateId format." },
      });
      return;
    }
    const template = await Template.findById(templateId);
    if (!template || !template.isActive) {
      res.status(422).json({
        error: { code: "VALIDATION_ERROR", message: "Template not found or not active." },
      });
      return;
    }
    if (template.occasionType !== formData.occasionType) {
      res.status(422).json({
        error: {
          code: "CONTENT_REJECTED",
          message: "Occasion type does not match the selected template.",
        },
      });
      return;
    }

    // Blocklist check on all text fields
    const textsToCheck = [
      formData.name,
      formData.designation,
      formData.partyOrOrganization,
      formData.union,
      formData.thana,
      formData.district,
      formData.headline,
      formData.subtext,
      formData.creditLine,
    ];
    if (containsBlocklistedContent(textsToCheck)) {
      res.status(422).json({
        error: {
          code: "CONTENT_REJECTED",
          message: "The submitted content contains prohibited terms and cannot be processed.",
        },
      });
      return;
    }

    // Create Poster document
    const poster = await Poster.create({
      userId: new Types.ObjectId(userId),
      templateId: new Types.ObjectId(templateId),
      formData,
      uploadedPhotoUrls: photos.map((p) => ({
        // url is derived server-side from the (ownership-verified) publicId; the client url is never trusted
        url: getStorageProvider().getUrl(p.publicId),
        publicId: p.publicId,
      })),
      status: "generating",
      stage: "queued",
      variationSeed: 0,
      consentAcceptedAt: new Date(),
    });

    // Fire and forget
    enqueueGeneration(poster._id.toString(), 0);

    res.status(202).json({
      id: poster._id.toString(),
      status: "generating",
      stage: "queued",
    });
  }
);

// ============================================================================
// GET /api/posters/user/:userId — Poster history (paginated)
// ============================================================================
postersRouter.get(
  "/user/:userId",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;
    const userIdStr = String(userId);
    const requestingUser = req.user!;

    // Authorization: must be own history or admin
    if (userIdStr !== requestingUser._id.toString() && requestingUser.role !== "admin") {
      res.status(403).json({
        error: { code: "FORBIDDEN", message: "Access denied." },
      });
      return;
    }

    if (!isValidObjectId(userIdStr)) {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "Invalid userId format." },
      });
      return;
    }

    // Pagination params (clamped)
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const rawLimit = parseInt(String(req.query.limit ?? "12"), 10) || 12;
    const limit = Math.min(50, Math.max(1, rawLimit));
    const skip = (page - 1) * limit;

    const query = { userId: new Types.ObjectId(userIdStr) };
    const [items, total] = await Promise.all([
      Poster.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("status stage generatedImageUrl formData retryCount maxRetries createdAt")
        .lean(),
      Poster.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      items: items.map((p) => ({
        id: (p._id as Types.ObjectId).toString(),
        status: p.status,
        stage: p.stage,
        generatedImageUrl: p.generatedImageUrl,
        headline: p.formData?.headline,
        occasionType: p.formData?.occasionType,
        createdAt: p.createdAt,
        retriesLeft: Math.max(0, (p.maxRetries ?? 3) - (p.retryCount ?? 0)),
      })),
      page,
      limit,
      total,
      totalPages,
    });
  }
);

// ============================================================================
// GET /api/posters/:id — Poll poster status
// ============================================================================
postersRouter.get("/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const idStr = String(id);

  if (!isValidObjectId(idStr)) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Invalid poster id format." },
    });
    return;
  }

  const poster = await Poster.findById(idStr).lean();

  // Ownership: not found or wrong user → 404 (do not leak existence)
  if (
    !poster ||
    (poster.userId.toString() !== req.user!._id.toString() && req.user!.role !== "admin")
  ) {
    res.status(404).json({
      error: { code: "NOT_FOUND", message: "Poster not found." },
    });
    return;
  }

  res.status(200).json({
    id: poster._id.toString(),
    status: poster.status,
    stage: poster.stage,
    generatedImageUrl: poster.generatedImageUrl,
    formData: poster.formData,
    retriesLeft: Math.max(0, poster.maxRetries - poster.retryCount),
    aiAssisted: poster.aiAssisted,
    error: poster.error ?? undefined,
  });
});

// ============================================================================
// POST /api/posters/:id/regenerate
// ============================================================================
postersRouter.post(
  "/:id/regenerate",
  requireAuth,
  posterCreateLimiter,
  posterDailyLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const idStr = String(id);

    if (!isValidObjectId(idStr)) {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "Invalid poster id format." },
      });
      return;
    }

    const poster = await Poster.findById(idStr);

    // Ownership check (404 to avoid leaking existence)
    if (
      !poster ||
      (poster.userId.toString() !== req.user!._id.toString() && req.user!.role !== "admin")
    ) {
      res.status(404).json({
        error: { code: "NOT_FOUND", message: "Poster not found." },
      });
      return;
    }

    // Already generating → 409
    if (poster.status === "generating") {
      res.status(409).json({
        error: { code: "CONFLICT", message: "Poster is already generating. Please wait." },
      });
      return;
    }

    // Retry limit reached → 403
    if (poster.retryCount >= poster.maxRetries) {
      res.status(403).json({
        error: { code: "RETRY_LIMIT_REACHED", message: "Maximum regenerations reached." },
      });
      return;
    }

    // Parse optional body overrides
    const parseResult = RegeneratePosterRequestSchema.safeParse(req.body ?? {});
    if (!parseResult.success) {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "Invalid regenerate request body.", details: parseResult.error.issues },
      });
      return;
    }

    const { formData: overrides, photoOrder } = parseResult.data ?? {};

    // Merge text-only formData overrides (whitelist: only fields in PosterFormDataSchema)
    if (overrides) {
      const allowedKeys = [
        "name", "designation", "partyOrOrganization", "union", "thana",
        "district", "occasionType", "headline", "subtext", "creditLine",
      ] as const;
      for (const key of allowedKeys) {
        const val = overrides[key as keyof typeof overrides];
        if (val !== undefined) {
          (poster.formData as unknown as Record<string, unknown>)[key] = val;
        }
      }
    }

    // Re-order photos if requested
    if (photoOrder && photoOrder.length > 0) {
      const reordered = photoOrder
        .filter((i) => i >= 0 && i < poster.uploadedPhotoUrls.length)
        .map((i) => poster.uploadedPhotoUrls[i]);
      if (reordered.length > 0) {
        poster.uploadedPhotoUrls = reordered;
      }
    }

    // Increment variationSeed + retryCount; reset status
    poster.variationSeed += 1;
    poster.retryCount += 1;
    poster.status = "generating";
    poster.stage = "queued";
    poster.error = null;

    await poster.save();

    enqueueGeneration(poster._id.toString(), poster.retryCount);

    res.status(202).json({
      id: poster._id.toString(),
      status: poster.status,
      stage: poster.stage,
      retriesLeft: Math.max(0, poster.maxRetries - poster.retryCount),
    });
  }
);

// ============================================================================
// GET /api/posters/:id/download?format=png
// ============================================================================
postersRouter.get(
  "/:id/download",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const idStr = String(id);
    const format = String(req.query.format ?? "");

    if (!isValidObjectId(idStr)) {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "Invalid poster id format." },
      });
      return;
    }

    // Format check: only PNG supported (PDF is P1)
    if (format !== "png") {
      res.status(400).json({
        error: {
          code: "UNSUPPORTED_FORMAT",
          message: "Only format=png is supported. PDF support is coming soon.",
        },
      });
      return;
    }

    const poster = await Poster.findById(idStr).populate<{ templateId: { slug: string } }>(
      "templateId",
      "slug"
    );

    // Ownership check
    if (
      !poster ||
      (poster.userId.toString() !== req.user!._id.toString() && req.user!.role !== "admin")
    ) {
      res.status(404).json({
        error: { code: "NOT_FOUND", message: "Poster not found." },
      });
      return;
    }

    // Status check
    if (poster.status !== "completed") {
      res.status(409).json({
        error: { code: "POSTER_NOT_READY", message: "Poster is not yet completed." },
      });
      return;
    }

    if (!poster.exports?.png?.url) {
      res.status(409).json({
        error: { code: "POSTER_NOT_READY", message: "Generated image not available." },
      });
      return;
    }

    // Build filename: prochar-{slug}-{YYYY-MM-DD}.png
    const slug =
      typeof poster.templateId === "object" && "slug" in poster.templateId
        ? (poster.templateId as { slug: string }).slug
        : "poster";
    const dateStr = poster.createdAt.toISOString().slice(0, 10);
    const filename = `prochar-${slug}-${dateStr}.png`;

    // Fetch the PNG buffer
    let pngBuffer: Buffer;
    try {
      const storage = getStorageProvider();
      const pngUrl = poster.exports.png.url;

      if (pngUrl.startsWith("/api/storage/")) {
        // Local storage: read from disk using generatedPublicId
        const fs = await import("node:fs/promises");
        const localStorageWithDir = storage as unknown as { getBaseDir?: () => string };
        const baseDir =
          typeof localStorageWithDir.getBaseDir === "function"
            ? localStorageWithDir.getBaseDir()
            : "./apps/api/.local-storage";
        pngBuffer = await fs.readFile(resolveInsideRoot(baseDir, poster.generatedPublicId!));
      } else {
        // Remote (Cloudinary, etc.): URL derived from server-held publicId
        const response = await fetch(storage.getUrl(poster.generatedPublicId!));
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const ab = await response.arrayBuffer();
        pngBuffer = Buffer.from(ab);
      }
    } catch (err) {
      logger.error({ err, posterId: id }, "Failed to fetch PNG for download");
      res.status(500).json({
        error: { code: "INTERNAL", message: "Failed to retrieve the poster file." },
      });
      return;
    }

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Length", pngBuffer.length);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );
    res.send(pngBuffer);
  }
);

// ============================================================================
// DELETE /api/posters/:id
// ============================================================================
postersRouter.delete("/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const idStr = String(id);

  if (!isValidObjectId(idStr)) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Invalid poster id format." },
    });
    return;
  }

  const poster = await Poster.findById(idStr);

  // Ownership check
  if (
    !poster ||
    (poster.userId.toString() !== req.user!._id.toString() && req.user!.role !== "admin")
  ) {
    res.status(404).json({
      error: { code: "NOT_FOUND", message: "Poster not found." },
    });
    return;
  }

  // Cannot delete while generating
  if (poster.status === "generating") {
    res.status(409).json({
      error: { code: "CONFLICT", message: "Cannot delete a poster while it is generating." },
    });
    return;
  }

  // Best-effort delete storage assets
  const storage = getStorageProvider();
  const assetPublicIds: string[] = [];

  if (poster.generatedPublicId) {
    assetPublicIds.push(poster.generatedPublicId);
  }
  for (const photo of poster.uploadedPhotoUrls) {
    if (photo.publicId) assetPublicIds.push(photo.publicId);
  }

  await Promise.allSettled(
    assetPublicIds.map(async (pid) => {
      try {
        await storage.delete(pid);
      } catch (err) {
        logger.warn({ err, publicId: pid }, "Failed to delete storage asset during poster delete");
      }
    })
  );

  // Delete poster + generation logs
  await Promise.all([
    Poster.deleteOne({ _id: poster._id }),
    GenerationLog.deleteMany({ posterId: poster._id }),
  ]);

  res.status(204).send();
});
