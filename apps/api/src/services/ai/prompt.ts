/**
 * Prompt Builder & Response Schema for Gemini Layout Generation (GEMINI_SPEC §2, §3, §4)
 */

export const PROMPT_VERSION = "v1";

/**
 * Verbatim system instruction per GEMINI_SPEC §2.
 */
export function buildSystemInstruction(): string {
  return "You are a layout assistant for Bangladeshi political posters. Return JSON only, matching the schema. Do not output text for the poster.";
}

export interface TemplateSlotPromptInfo {
  id: string;
  shape: string;
  w: number;
  h: number;
}

export interface DefaultPalettePromptInfo {
  background: string;
  primary: string;
  secondary: string;
  accent: string;
}

export interface BuildUserPromptInput {
  occasionType: string;
  tone: string;
  photoCount: number;
  templateSlots: TemplateSlotPromptInfo[];
  allowedDecorations: string[];
  defaultPalette: DefaultPalettePromptInfo;
  contrastRules: string;
  variationSeed: number;
}

/**
 * Builds user prompt matching exact handlebars template structure in GEMINI_SPEC §3.
 */
export function buildUserPrompt(input: BuildUserPromptInput): string {
  const slotsLines = input.templateSlots
    .map(
      (slot) =>
        `- Slot ID: ${slot.id}, Shape: ${slot.shape}, Dimensions: ${slot.w}x${slot.h}`
    )
    .join("\n");

  const decorationsStr = input.allowedDecorations
    .map((dec) => `"${dec}"`)
    .join(", ");

  return `Occasion: ${input.occasionType}
Tone: ${input.tone}
Photo Count: ${input.photoCount}
Template Slots Available:
${slotsLines}

Allowed Decoration Keys:
[${decorationsStr}]

Palette Constraints:
- Default Background: ${input.defaultPalette.background}
- Default Primary: ${input.defaultPalette.primary}
- Default Secondary: ${input.defaultPalette.secondary}
- Default Accent: ${input.defaultPalette.accent}
- Contrast Requirement: All color pairs in [${input.contrastRules}] must satisfy WCAG contrast ratio >= 4.5.
- Note for condolence occasions: Keep palette solemn, muted, or monochrome.

Variation Seed: ${input.variationSeed}

Analyze the provided photo(s) and return an optimal layout plan strictly adhering to the JSON schema.`;
}

/**
 * Exact responseSchema for Gemini layout output per GEMINI_SPEC §4.
 */
export const LAYOUT_PLAN_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    photos: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          index: { type: "INTEGER" },
          focal: {
            type: "OBJECT",
            properties: {
              x: { type: "NUMBER" },
              y: { type: "NUMBER" },
            },
            required: ["x", "y"],
          },
          zoom: { type: "NUMBER" },
        },
        required: ["index", "focal", "zoom"],
      },
    },
    slotOrder: {
      type: "ARRAY",
      items: { type: "INTEGER" },
    },
    colors: {
      type: "OBJECT",
      properties: {
        primary: { type: "STRING" },
        secondary: { type: "STRING" },
        accent: { type: "STRING" },
        textOnPrimary: { type: "STRING" },
        textOnLight: { type: "STRING" },
      },
      required: [
        "primary",
        "secondary",
        "accent",
        "textOnPrimary",
        "textOnLight",
      ],
    },
    decorations: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
    decorationIntensity: {
      type: "STRING",
      enum: ["low", "medium", "high"],
    },
    headlineTier: {
      type: "STRING",
      enum: ["large", "xlarge"],
    },
  },
  required: [
    "photos",
    "colors",
    "decorations",
    "decorationIntensity",
    "headlineTier",
  ],
};
