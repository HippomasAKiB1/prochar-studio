import { describe, it, expect } from "vitest";
import {
  PROMPT_VERSION,
  buildSystemInstruction,
  buildUserPrompt,
  LAYOUT_PLAN_RESPONSE_SCHEMA,
} from "../prompt.js";

describe("Prompt Builder (Chunk 4.11)", () => {
  it("exports PROMPT_VERSION 'v1'", () => {
    expect(PROMPT_VERSION).toBe("v1");
  });

  it("builds exact system instruction matching GEMINI_SPEC §2", () => {
    expect(buildSystemInstruction()).toBe(
      "You are a layout assistant for Bangladeshi political posters. Return JSON only, matching the schema. Do not output text for the poster."
    );
  });

  it("builds user prompt with exact substitutions", () => {
    const prompt = buildUserPrompt({
      occasionType: "victory_day",
      tone: "triumphant",
      photoCount: 1,
      templateSlots: [{ id: "center", shape: "rounded", w: 170, h: 214 }],
      allowedDecorations: ["paddy", "doves"],
      defaultPalette: {
        background: "#FFF8E7",
        primary: "#006A4E",
        secondary: "#D61F31",
        accent: "#F7C948",
      },
      contrastRules: "textOnPrimary vs primary, textOnLight vs background",
      variationSeed: 42,
    });

    expect(prompt).toContain("Occasion: victory_day");
    expect(prompt).toContain("Tone: triumphant");
    expect(prompt).toContain("Photo Count: 1");
    expect(prompt).toContain("- Slot ID: center, Shape: rounded, Dimensions: 170x214");
    expect(prompt).toContain('Allowed Decoration Keys:\n["paddy", "doves"]');
    expect(prompt).toContain("- Default Background: #FFF8E7");
    expect(prompt).toContain("Variation Seed: 42");
    expect(prompt).toContain(
      "Analyze the provided photo(s) and return an optimal layout plan strictly adhering to the JSON schema."
    );
  });

  it("has valid response schema structure", () => {
    expect(LAYOUT_PLAN_RESPONSE_SCHEMA.type).toBe("OBJECT");
    expect(LAYOUT_PLAN_RESPONSE_SCHEMA.required).toEqual([
      "photos",
      "colors",
      "decorations",
      "decorationIntensity",
      "headlineTier",
    ]);
  });
});
