import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import sharp from "sharp";
import crypto from "node:crypto";
import { requireAuth } from "../middleware/auth.middleware.js";
import { uploadLimiter } from "../middleware/rate-limit.js";
import { getStorageProvider } from "../services/storage/index.js";
import { logger } from "../config/logger.js";

export const uploadRouter = Router();

// Configure Multer: in-memory, max 3 files, max 5 MB per file
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
    files: 3,
  },
});

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Custom multer error wrapper to convert multer errors to clean JSON responses
 */
function handleMulter(req: Request, res: Response, next: NextFunction) {
  upload.array("photos", 3)(req, res, (err: unknown) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          res.status(413).json({
            error: "FILE_TOO_LARGE",
            message: "File exceeds maximum allowed size of 5 MB",
          });
          return;
        }
        if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") {
          res.status(400).json({
            error: "TOO_MANY_FILES",
            message: "Maximum 3 files allowed per request",
          });
          return;
        }
        res.status(400).json({
          error: "UPLOAD_ERROR",
          message: err.message,
        });
        return;
      }
      res.status(400).json({
        error: "UPLOAD_ERROR",
        message: err instanceof Error ? err.message : "Upload processing failed",
      });
      return;
    }
    next();
  });
}

/**
 * POST /api/upload
 * Multi-file photo upload with magic-byte sniffing, EXIF stripping, and WebP 88 re-encoding.
 */
uploadRouter.post(
  "/",
  requireAuth,
  uploadLimiter,
  handleMulter,
  async (req: Request, res: Response): Promise<void> => {
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files || files.length === 0) {
      res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "At least one photo file must be provided under field 'photos'",
      });
      return;
    }

    const userId = req.user!._id.toString();
    const storage = getStorageProvider();
    const processedPhotos = [];

    // Step 2: Validate magic-byte sniff for every file
    const { fileTypeFromBuffer } = await import("file-type");
    for (const file of files) {
      const detected = await fileTypeFromBuffer(file.buffer);
      if (!detected || !ALLOWED_MIME_TYPES.has(detected.mime)) {
        res.status(422).json({
          error: "UNPROCESSABLE_ENTITY",
          message: `Unsupported or invalid file format for '${file.originalname}'. Only JPEG, PNG, and WebP images are allowed.`,
        });
        return;
      }
    }

    // Step 3, 4, 5: Sharp processing & storage upload
    try {
      for (const file of files) {
        // 3. sharp rotate() (auto-EXIF-orient), resize longest side to 2400 max, without .withMetadata() (EXIF/GPS stripped)
        // 4. Re-encode to WebP quality 88
        const { data: outputBuffer, info } = await sharp(file.buffer)
          .rotate()
          .resize({
            width: 2400,
            height: 2400,
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({ quality: 88 })
          .toBuffer({ resolveWithObject: true });

        // 5. StorageProvider.upload with folder posters/uploads/{userId}/
        const fileUuid = crypto.randomUUID();
        const publicId = `posters/uploads/${userId}/${fileUuid}`;
        const folder = `posters/uploads/${userId}`;

        const uploadResult = await storage.upload(outputBuffer, {
          folder,
          publicId,
        });

        processedPhotos.push({
          url: uploadResult.url,
          publicId: uploadResult.publicId,
          width: info.width,
          height: info.height,
        });
      }

      // Response 201: { photos: [{ url, publicId, width, height }] }
      res.status(201).json({ photos: processedPhotos });
    } catch (err: unknown) {
      logger.error({ err }, "Image processing error in upload");
      res.status(422).json({
        error: "IMAGE_PROCESSING_FAILED",
        message: "Failed to process image buffer. The file may be corrupted.",
      });
    }
  }
);
