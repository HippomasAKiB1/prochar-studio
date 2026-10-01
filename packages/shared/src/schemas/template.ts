import { z } from "zod";

export const OccasionTypeEnum = z.enum([
  "victory_day",
  "condolence",
  "campaign",
  "greetings",
  "eid_festival",
]);

export type OccasionType = z.infer<typeof OccasionTypeEnum>;

export const OCCASION_LABELS: Record<OccasionType, { bn: string; en: string }> = {
  victory_day: { bn: "বিজয় দিবস", en: "Victory Day" },
  condolence: { bn: "শোক/স্মরণ", en: "Condolence / Tribute" },
  campaign: { bn: "নির্বাচনী প্রচার", en: "Campaign" },
  greetings: { bn: "শুভেচ্ছা", en: "Greetings" },
  eid_festival: { bn: "ঈদ/উৎসব", en: "Eid / Festival" },
};

export const TokenEnum = z.enum([
  "$background",
  "$primary",
  "$secondary",
  "$accent",
  "$textOnPrimary",
  "$textOnLight",
]);
export type Token = z.infer<typeof TokenEnum>;

export const HexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
export type Hex = `#${string}`;

export const TierEnum = z.enum(["low", "medium", "high"]);
export type Tier = z.infer<typeof TierEnum>;

export const RectLayerSchema = z.object({
  id: z.string(),
  type: z.literal("rect"),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  fill: TokenEnum,
});

export const FrameLayerSchema = z.object({
  id: z.string(),
  type: z.literal("frame"),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  stroke: z.object({
    width: z.number(),
    color: TokenEnum,
  }),
});

export const AssetLayerSchema = z.object({
  id: z.string(),
  type: z.literal("asset"),
  asset: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});

export const LayerSchema = z.discriminatedUnion("type", [
  RectLayerSchema,
  FrameLayerSchema,
  AssetLayerSchema,
]);
export type Layer = z.infer<typeof LayerSchema>;

export const PhotoSlotShapeEnum = z.enum(["arch", "circle", "rounded", "rect"]);

export const PhotoSlotSchema = z.object({
  id: z.string(),
  shape: PhotoSlotShapeEnum,
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  z: z.number().int().min(0).max(9),
  radius: z.number().optional(),
  border: z.object({
    width: z.number(),
    color: TokenEnum,
  }),
  filter: z.enum(["grayscale(0.85)"]).optional(),
});
export type PhotoSlot = z.infer<typeof PhotoSlotSchema>;

export const FontFamilyEnum = z.enum([
  "Hind Siliguri",
  "Noto Sans Bengali",
  "Noto Serif Bengali",
  "Tiro Bangla",
]);
export type FontFamily = z.infer<typeof FontFamilyEnum>;

export const FontWeightEnum = z.union([
  z.literal(400),
  z.literal(500),
  z.literal(600),
  z.literal(700),
]);
export type FontWeight = z.infer<typeof FontWeightEnum>;

export const TextSlotSourceEnum = z.enum([
  "headline",
  "subtext",
  "name",
  "designationOrg",
  "location",
  "credit",
]);
export type TextSlotSource = z.infer<typeof TextSlotSourceEnum>;

export const TextSlotSchema = z.object({
  id: z.string(),
  source: TextSlotSourceEnum,
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  fontFamily: FontFamilyEnum,
  fontWeight: FontWeightEnum,
  minFont: z.number(),
  maxFont: z.number(),
  maxLines: z.number().int().positive(),
  lineHeight: z.number(),
  align: z.enum(["left", "center", "right"]),
  valign: z.enum(["top", "middle"]),
  color: TokenEnum,
  truncate: z.boolean().optional(),
});
export type TextSlot = z.infer<typeof TextSlotSchema>;

export const DecorationPlacementSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  flipX: z.boolean().optional(),
  flipY: z.boolean().optional(),
});
export type DecorationPlacement = z.infer<typeof DecorationPlacementSchema>;

export const DecorationSchema = z.object({
  key: z.string(),
  asset: z.string(),
  layer: z.enum(["bg", "mid", "fg"]),
  opacity: z.number().min(0).max(1),
  minIntensity: TierEnum,
  placements: z.array(DecorationPlacementSchema),
});
export type Decoration = z.infer<typeof DecorationSchema>;

export const ColorSchemeKeyEnum = z.enum([
  "background",
  "primary",
  "secondary",
  "accent",
  "textOnPrimary",
  "textOnLight",
]);
export type ColorSchemeKey = z.infer<typeof ColorSchemeKeyEnum>;

export const TemplateColorSchemeSchema = z.object({
  background: HexColorSchema,
  primary: HexColorSchema,
  secondary: HexColorSchema,
  accent: HexColorSchema,
  textOnPrimary: HexColorSchema,
  textOnLight: HexColorSchema,
});
export type TemplateColorScheme = z.infer<typeof TemplateColorSchemeSchema>;

export const ContrastPairSchema = z.object({
  fg: ColorSchemeKeyEnum,
  bg: ColorSchemeKeyEnum,
  min: z.number(),
});
export type ContrastPair = z.infer<typeof ContrastPairSchema>;

export const TemplateFooterSchema = z.object({
  preset: z.literal("standard-v1"),
  fill: TokenEnum,
  topRule: z.object({
    height: z.number(),
    color: TokenEnum,
  }),
});
export type TemplateFooter = z.infer<typeof TemplateFooterSchema>;

export const TemplateLayoutConfigSchema = z.object({
  schemaVersion: z.literal(1),
  canvas: z.object({
    width: z.literal(600),
    height: z.literal(800),
  }),
  layoutFamily: z.enum(["triple-top", "memorial-arch", "banner-diagonal"]),
  colorScheme: TemplateColorSchemeSchema,
  contrastPairs: z.array(ContrastPairSchema),
  layers: z.array(LayerSchema),
  photoSlots: z.array(PhotoSlotSchema),
  photoAssignment: z.object({
    "1": z.array(z.string()),
    "2": z.array(z.string()),
    "3": z.array(z.string()),
  }),
  textSlots: z.array(TextSlotSchema),
  footer: TemplateFooterSchema,
  decorations: z.array(DecorationSchema),
  aiAllowedDecorations: z.array(z.string()),
  maxPhotos: z.literal(3),
});
export type TemplateLayoutConfig = z.infer<typeof TemplateLayoutConfigSchema>;

/**
 * Standard footer slots for preset 'standard-v1' as defined in SEED_TEMPLATES §3.
 */
export const STANDARD_FOOTER_SLOTS: TextSlot[] = [
  {
    id: "credit",
    source: "credit",
    x: 24,
    y: 706,
    w: 552,
    h: 32,
    fontFamily: "Hind Siliguri",
    fontWeight: 700,
    minFont: 12,
    maxFont: 24,
    maxLines: 1,
    lineHeight: 1.3,
    align: "left",
    valign: "middle",
    color: "$textOnPrimary",
  },
  {
    id: "designationOrg",
    source: "designationOrg",
    x: 24,
    y: 740,
    w: 552,
    h: 34,
    fontFamily: "Hind Siliguri",
    fontWeight: 500,
    minFont: 11,
    maxFont: 17,
    maxLines: 2,
    lineHeight: 1.3,
    align: "left",
    valign: "middle",
    color: "$textOnPrimary",
  },
  {
    id: "location",
    source: "location",
    x: 24,
    y: 776,
    w: 552,
    h: 18,
    fontFamily: "Hind Siliguri",
    fontWeight: 400,
    minFont: 10,
    maxFont: 13,
    maxLines: 1,
    lineHeight: 1.3,
    align: "left",
    valign: "middle",
    color: "$textOnPrimary",
  },
];

/**
 * Expands the standard footer preset by appending standard footer text slots if not already present.
 */
export function expandStandardFooterSlots(textSlots: TextSlot[]): TextSlot[] {
  const existingIds = new Set(textSlots.map((s) => s.id));
  const newSlots = [...textSlots];
  for (const slot of STANDARD_FOOTER_SLOTS) {
    if (!existingIds.has(slot.id)) {
      newSlots.push(slot);
    }
  }
  return newSlots;
}
