# GEMINI_SPEC.md — AI Layout Planning Specification

> **Authority & Context:** This document specifies the Gemini AI integration for Prochar Studio (PRD §8, SEED_TEMPLATES §1–8).  
> Gemini is utilized solely for creative layout intelligence (photo focal centering, zoom recommendation, palette adaptation, and decoration selection). The AI **never** generates or alters user Bangla text.

---

## 1. Model ID and SDK Version

- **SDK Package:** `@google/genai`
- **SDK Exact Version:** `2.25.0`
- **Model ID:** `gemini-2.5-flash` (configurable via `GEMINI_MODEL` environment variable)
- **Important Note:** *Verify model name in Google AI docs on build day; if changed, update this file and `.env.example` together.*

---

## 2. System Instruction (Verbatim)

```text
You are a layout assistant for Bangladeshi political posters. Return JSON only, matching the schema. Do not output text for the poster.
```

---

## 3. User Prompt Template

```handlebars
Occasion: {{occasionType}}
Tone: {{tone}}
Photo Count: {{photoCount}}
Template Slots Available:
{{#each templateSlots}}
- Slot ID: {{this.id}}, Shape: {{this.shape}}, Dimensions: {{this.w}}x{{this.h}}
{{/each}}

Allowed Decoration Keys:
[{{#each allowedDecorations}}"{{this}}"{{#unless @last}}, {{/unless}}{{/each}}]

Palette Constraints:
- Default Background: {{defaultPalette.background}}
- Default Primary: {{defaultPalette.primary}}
- Default Secondary: {{defaultPalette.secondary}}
- Default Accent: {{defaultPalette.accent}}
- Contrast Requirement: All color pairs in [{{contrastRules}}] must satisfy WCAG contrast ratio >= 4.5.
- Note for condolence occasions: Keep palette solemn, muted, or monochrome.

Variation Seed: {{variationSeed}}

Analyze the provided photo(s) and return an optimal layout plan strictly adhering to the JSON schema.
```

---

## 4. Exact Gemini `responseSchema`

The `responseSchema` passed in the `generationConfig` of the `@google/genai` SDK:

```json
{
  "type": "OBJECT",
  "properties": {
    "photos": {
      "type": "ARRAY",
      "items": {
        "type": "OBJECT",
        "properties": {
          "index": { "type": "INTEGER" },
          "focal": {
            "type": "OBJECT",
            "properties": {
              "x": { "type": "NUMBER" },
              "y": { "type": "NUMBER" }
            },
            "required": ["x", "y"]
          },
          "zoom": { "type": "NUMBER" }
        },
        "required": ["index", "focal", "zoom"]
      }
    },
    "slotOrder": {
      "type": "ARRAY",
      "items": { "type": "INTEGER" }
    },
    "colors": {
      "type": "OBJECT",
      "properties": {
        "primary": { "type": "STRING" },
        "secondary": { "type": "STRING" },
        "accent": { "type": "STRING" },
        "textOnPrimary": { "type": "STRING" },
        "textOnLight": { "type": "STRING" }
      },
      "required": ["primary", "secondary", "accent", "textOnPrimary", "textOnLight"]
    },
    "decorations": {
      "type": "ARRAY",
      "items": { "type": "STRING" }
    },
    "decorationIntensity": {
      "type": "STRING",
      "enum": ["low", "medium", "high"]
    },
    "headlineTier": {
      "type": "STRING",
      "enum": ["large", "xlarge"]
    }
  },
  "required": [
    "photos",
    "colors",
    "decorations",
    "decorationIntensity",
    "headlineTier"
  ]
}
```

---

## 5. Zod Validator & Safety Clamping Logic

The raw JSON returned by Gemini is parsed, validated, and clamped before being applied to the renderer.

```ts
import { z } from "zod";

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

export const RawLayoutPlanSchema = z.object({
  photos: z.array(
    z.object({
      index: z.number().int().min(0).max(2),
      focal: z.object({
        x: z.number().min(0).max(1),
        y: z.number().min(0).max(1),
      }),
      zoom: z.number().min(1.0).max(1.6),
    })
  ).max(3),
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
function getLuminance(hex: string): number {
  const rgb = hex
    .replace("#", "")
    .match(/.{2}/g)!
    .map((x) => parseInt(x, 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

export function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Validates and clamps Gemini plan against template rules.
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
    const fgColor = (resolvedColors as any)[pair.fg] || (ctx.template.colorScheme as any)[pair.fg];
    const bgColor = (resolvedColors as any)[pair.bg] || (ctx.template.colorScheme as any)[pair.bg];
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
```

---

## 6. Timeout, Retry & Deterministic Fallback Strategy

### 6.1 Call Pipeline & Pseudocode
```ts
export async function generateLayoutPlanWithFallback(
  input: GenerationInput,
  ctx: ClampContext
): Promise<{ plan: RawLayoutPlan; aiAssisted: boolean; latencyMs: number }> {
  const startTime = Date.now();
  const TIMEOUT_MS = 20000; // 20s hard timeout

  // Attempt 1
  try {
    const rawResult = await callGeminiWithTimeout(input, TIMEOUT_MS);
    const plan = validateAndClampPlan(rawResult, ctx);
    return { plan, aiAssisted: true, latencyMs: Date.now() - startTime };
  } catch (err: any) {
    // Immediate fallback on safety block or invalid unparseable JSON
    if (isSafetyBlock(err) || isFatalSchemaError(err)) {
      return { plan: getFallbackPlan(ctx.template.slug), aiAssisted: false, latencyMs: Date.now() - startTime };
    }

    // On 5xx or timeout: 1 retry with jitter (200ms - 500ms)
    try {
      await sleep(200 + Math.random() * 300);
      const rawResult = await callGeminiWithTimeout(input, TIMEOUT_MS);
      const plan = validateAndClampPlan(rawResult, ctx);
      return { plan, aiAssisted: true, latencyMs: Date.now() - startTime };
    } catch (retryErr) {
      // Exceeded retries -> fallback to template defaults
      return { plan: getFallbackPlan(ctx.template.slug), aiAssisted: false, latencyMs: Date.now() - startTime };
    }
  }
}
```

### 6.2 Full Fallback Plan Structure per Layout Family

When AI generation is bypassed or fails, the deterministic fallback plan is constructed using template defaults with `headlineTier: "large"` and `decorationIntensity: "medium"`:

```ts
export function getFallbackPlan(templateSlug: string): RawLayoutPlan {
  switch (templateSlug) {
    case "victory-day-classic":
      return {
        photos: [
          { index: 0, focal: { x: 0.5, y: 0.25 }, zoom: 1.05 },
          { index: 1, focal: { x: 0.5, y: 0.30 }, zoom: 1.0 },
          { index: 2, focal: { x: 0.5, y: 0.30 }, zoom: 1.0 },
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
          { index: 1, focal: { x: 0.5, y: 0.30 }, zoom: 1.0 },
          { index: 2, focal: { x: 0.5, y: 0.30 }, zoom: 1.0 },
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
          { index: 1, focal: { x: 0.5, y: 0.30 }, zoom: 1.0 },
          { index: 2, focal: { x: 0.5, y: 0.30 }, zoom: 1.0 },
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
```

---

## 7. AI Cache Key Derivation

To conserve Gemini token quota and minimize latency, template-level schemes are cached in MongoDB (`AiCache` collection).

- **Prompt Version Constant:**
  ```ts
  export const PROMPT_VERSION = "v1";
  ```
- **Derivation Algorithm:**
  ```ts
  import crypto from "crypto";

  export function getAiCacheKey(params: {
    templateId: string;
    occasionType: string;
    variationSeed: number;
  }): string {
    const variationBucket = Math.floor(params.variationSeed / 10);
    const raw = `${params.templateId}:${params.occasionType}:${PROMPT_VERSION}:${variationBucket}`;
    return crypto.createHash("sha256").update(raw).digest("hex");
  }
  ```
- **TTL:** 30 days index on `expiresAt`.

---

## 8. GenerationLog Telemetry Shape (PRD §9.4)

Each generation attempt writes a telemetry record to `GenerationLog`:

```ts
export interface IGenerationLog {
  posterId: string;
  userId: string;
  promptVersion: string;          // e.g. "v1"
  geminiPromptUsed: string;       // Full resolved prompt string
  tokensUsed: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;              // Total pipeline duration (request to upload)
  geminiLatencyMs: number;        // AI invocation duration
  renderLatencyMs: number;        // Puppeteer capture duration
  cacheHit: boolean;              // True if scheme retrieved from AiCache
  usedFallback: boolean;          // True if deterministic fallback plan was used
  success: boolean;               // Overall pipeline completion flag
  errorCode?: string;             // Optional failure code (e.g. FONT_LOAD_FAILED)
  createdAt: Date;
}
```
