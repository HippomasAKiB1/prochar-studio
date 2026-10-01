import { z } from "zod";

export const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

export const FocalPointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

export const PhotoPlanSchema = z.object({
  index: z.number().int().min(0).max(2),
  focal: FocalPointSchema,
  zoom: z.number().min(1.0).max(1.6),
});

export const ColorSchemeSchema = z.object({
  primary: z.string().regex(HEX_COLOR_REGEX),
  secondary: z.string().regex(HEX_COLOR_REGEX),
  accent: z.string().regex(HEX_COLOR_REGEX),
  textOnPrimary: z.string().regex(HEX_COLOR_REGEX),
  textOnLight: z.string().regex(HEX_COLOR_REGEX),
});

export const LayoutPlanSchema = z.object({
  photos: z.array(PhotoPlanSchema).max(3),
  slotOrder: z.array(z.number().int().min(0).max(2)).max(3).optional(),
  colors: ColorSchemeSchema,
  decorations: z.array(z.string()).max(6),
  decorationIntensity: z.enum(["low", "medium", "high"]),
  headlineTier: z.enum(["large", "xlarge"]),
});

export type LayoutPlan = z.infer<typeof LayoutPlanSchema>;
export type PhotoPlan = z.infer<typeof PhotoPlanSchema>;
export type ColorScheme = z.infer<typeof ColorSchemeSchema>;
