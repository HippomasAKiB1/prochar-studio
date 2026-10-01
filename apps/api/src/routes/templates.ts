import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import { OccasionTypeEnum } from "@prochar/shared";
import { Template } from "../models/Template.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const templatesRouter = Router();

/**
 * GET /api/templates?occasion=<enum>
 * Returns list of active templates, optionally filtered by occasion.
 * Authentication required.
 */
templatesRouter.get("/", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { occasion } = req.query;

  const filter: Record<string, unknown> = { isActive: true };

  if (occasion !== undefined) {
    const parseResult = OccasionTypeEnum.safeParse(occasion);
    if (!parseResult.success) {
      res.status(400).json({
        error: "VALIDATION_ERROR",
        message: `Invalid occasion parameter '${occasion}'. Must be one of: ${OccasionTypeEnum.options.join(", ")}`,
      });
      return;
    }
    filter.occasionType = parseResult.data;
  }

  const templates = await Template.find(filter)
    .select("_id slug title titleEn occasionType thumbnailUrl")
    .sort({ createdAt: 1 })
    .lean();

  const response = templates.map((t) => ({
    id: t._id.toString(),
    slug: t.slug,
    title: t.title,
    titleEn: t.titleEn,
    occasionType: t.occasionType,
    thumbnailUrl: t.thumbnailUrl,
  }));

  res.status(200).json(response);
});

/**
 * GET /api/templates/:id
 * Returns a single active template by ID including layoutConfig.
 * Authentication required.
 */
templatesRouter.get("/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!id || typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Invalid template ID format",
    });
    return;
  }

  const template = await Template.findOne({ _id: id, isActive: true }).lean();

  if (!template) {
    res.status(404).json({
      error: "NOT_FOUND",
      message: "Template not found",
    });
    return;
  }

  res.status(200).json({
    id: template._id.toString(),
    slug: template.slug,
    title: template.title,
    titleEn: template.titleEn,
    occasionType: template.occasionType,
    thumbnailUrl: template.thumbnailUrl,
    layoutConfig: template.layoutConfig,
  });
});
