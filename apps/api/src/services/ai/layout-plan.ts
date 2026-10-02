import { z } from "zod";

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

/**
 * RawLayoutPlan Zod Schema exactly as specified in GEMINI_SPEC §5.
 */
export const RawLayoutPlanSchema = z.object({
  photos: z
    .array(
      z.object({
        index: z.number().int().min(0).max(2),
        focal: z.object({
          x: z.number().min(0).max(1),
          y: z.number().min(0).max(1),
        }),
        zoom: z.number().min(1.0).max(1.6),
      })
    )
    .max(3),
  slotOrder: z.array(z.number().int().min(0).max(2)).max(3).optional(),
  colors: z.object({
    primary: z.string().regex(HEX_COLOR_REGEX),
    secondary: z.string().regex(HEX_COLOR_REGEX),
    accent: z.string().regex(HEX_COLOR_REGEX),
    textOnPrimary: z.string().regex(HEX_COLOR_REGEX),
    textOnLight: z.string().regex(HEX_COLOR_REGEX),
  }),
  decorations: z.array(z.string()).max(6),
  decorationIntensity: z.enum(["low", "medium", "high"]),
  headlineTier: z.enum(["large", "xlarge"]),
});

export type RawLayoutPlan = z.infer<typeof RawLayoutPlanSchema>;

export interface ClampContext {
  template: {
    slug: string;
    colorScheme: {
      background: string;
      primary: string;
      secondary: string;
      accent: string;
      textOnPrimary: string;
      textOnLight: string;
    };
    contrastPairs: { fg: string; bg: string; min: number }[];
    aiAllowedDecorations: string[];
  };
}

/**
 * Calculates relative luminance for WCAG contrast computation.
 */
export function getLuminance(hex: string): number {
  const cleaned = hex.replace("#", "");
  const rgb = [
    parseInt(cleaned.slice(0, 2), 16) / 255,
    parseInt(cleaned.slice(2, 4), 16) / 255,
    parseInt(cleaned.slice(4, 6), 16) / 255,
  ].map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

/**
 * Calculates WCAG 2 contrast ratio between two hex colors.
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Validates and clamps Gemini plan against template rules per GEMINI_SPEC §5.
 */
export function validateAndClampPlan(raw: unknown, ctx: ClampContext): RawLayoutPlan {
  const parsed = RawLayoutPlanSchema.parse(raw);

  // 1. Clamp photo focal coordinates and zoom
  const clampedPhotos = parsed.photos.map((p) => ({
    index: p.index,
    focal: {
      x: Math.min(1.0, Math.max(0.0, p.focal.x)),
      y: Math.min(1.0, Math.max(0.0, p.focal.y)),
    },
    zoom: Math.min(1.6, Math.max(1.0, p.zoom)),
  }));

  // 2. Validate WCAG contrast against template contrastPairs
  let resolvedColors = { ...parsed.colors };
  let contrastFailed = false;

  for (const pair of ctx.template.contrastPairs) {
    const fgColor =
      (resolvedColors as any)[pair.fg] || (ctx.template.colorScheme as any)[pair.fg];
    const bgColor =
      (resolvedColors as any)[pair.bg] || (ctx.template.colorScheme as any)[pair.bg];
    if (getContrastRatio(fgColor, bgColor) < pair.min) {
      contrastFailed = true;
      break;
    }
  }

  // If contrast check fails, fallback to template default colorScheme
  if (contrastFailed) {
    resolvedColors = {
      primary: ctx.template.colorScheme.primary,
      secondary: ctx.template.colorScheme.secondary,
      accent: ctx.template.colorScheme.accent,
      textOnPrimary: ctx.template.colorScheme.textOnPrimary,
      textOnLight: ctx.template.colorScheme.textOnLight,
    };
  }

  // 3. Filter decorations to strictly allowed subset
  const allowedSet = new Set(ctx.template.aiAllowedDecorations);
  const filteredDecorations = parsed.decorations.filter((d) => allowedSet.has(d));

  return {
    photos: clampedPhotos,
    slotOrder: parsed.slotOrder,
    colors: resolvedColors,
    decorations: filteredDecorations,
    decorationIntensity: parsed.decorationIntensity,
    headlineTier: parsed.headlineTier,
  };
}

/**
 * Returns deterministic fallback layout plan per template slug per GEMINI_SPEC §6.2.
 */
export function getFallbackPlan(templateSlug: string): RawLayoutPlan {
  switch (templateSlug) {
    case "victory-day-classic":
      return {
        photos: [
          { index: 0, focal: { x: 0.5, y: 0.25 }, zoom: 1.05 },
          { index: 1, focal: { x: 0.5, y: 0.3 }, zoom: 1.0 },
          { index: 2, focal: { x: 0.5, y: 0.3 }, zoom: 1.0 },
        ],
        colors: {
          primary: "#006A4E",
          secondary: "#D61F31",
          accent: "#F7C948",
          textOnPrimary: "#FFFFFF",
          textOnLight: "#1A1A1A",
        },
        decorations: ["paddy", "doves", "flag_wave", "floral_border_a"],
        decorationIntensity: "medium",
        headlineTier: "large",
      };

    case "condolence-tribute":
      return {
        photos: [
          { index: 0, focal: { x: 0.5, y: 0.25 }, zoom: 1.0 },
          { index: 1, focal: { x: 0.5, y: 0.3 }, zoom: 1.0 },
          { index: 2, focal: { x: 0.5, y: 0.3 }, zoom: 1.0 },
        ],
        colors: {
          primary: "#1C1C1C",
          secondary: "#6B6B6B",
          accent: "#9A8B5A",
          textOnPrimary: "#F7F5F0",
          textOnLight: "#1C1C1C",
        },
        decorations: ["corner_ornament", "dove_single", "divider_line"],
        decorationIntensity: "medium",
        headlineTier: "large",
      };

    case "campaign-bold":
    default:
      return {
        photos: [
          { index: 0, focal: { x: 0.5, y: 0.25 }, zoom: 1.1 },
          { index: 1, focal: { x: 0.5, y: 0.3 }, zoom: 1.0 },
          { index: 2, focal: { x: 0.5, y: 0.3 }, zoom: 1.0 },
        ],
        colors: {
          primary: "#14213D",
          secondary: "#D61F31",
          accent: "#F2B705",
          textOnPrimary: "#FFFFFF",
          textOnLight: "#14213D",
        },
        decorations: ["halftone_dots", "chevron_stripe"],
        decorationIntensity: "medium",
        headlineTier: "large",
      };
  }
}
