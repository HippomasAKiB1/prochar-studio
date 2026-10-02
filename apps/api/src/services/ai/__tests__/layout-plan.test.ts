import { describe, it, expect } from "vitest";
import { ZodError } from "zod";
import {
  validateAndClampPlan,
  getFallbackPlan,
  getContrastRatio,
  getLuminance,
  ClampContext,
} from "../layout-plan.js";

describe("Layout Plan Validator, Clamp & Fallback (Chunk 4.12)", () => {
  const mockContext: ClampContext = {
    template: {
      slug: "victory-day-classic",
      colorScheme: {
        background: "#FFF8E7",
        primary: "#006A4E",
        secondary: "#D61F31",
        accent: "#F7C948",
        textOnPrimary: "#FFFFFF",
        textOnLight: "#1A1A1A",
      },
      contrastPairs: [
        { fg: "textOnPrimary", bg: "primary", min: 4.5 },
        { fg: "textOnLight", bg: "background", min: 4.5 },
      ],
      aiAllowedDecorations: ["paddy", "doves", "flag_wave"],
    },
  };

  const validRawPlan = {
    photos: [{ index: 0, focal: { x: 0.5, y: 0.3 }, zoom: 1.2 }],
    colors: {
      primary: "#006A4E",
      secondary: "#D61F31",
      accent: "#F7C948",
      textOnPrimary: "#FFFFFF",
      textOnLight: "#1A1A1A",
    },
    decorations: ["paddy", "doves"],
    decorationIntensity: "medium",
    headlineTier: "large",
  };

  it("passes through valid plan unmodified", () => {
    const clamped = validateAndClampPlan(validRawPlan, mockContext);
    expect(clamped.photos[0].zoom).toBe(1.2);
    expect(clamped.photos[0].focal).toEqual({ x: 0.5, y: 0.3 });
    expect(clamped.decorations).toEqual(["paddy", "doves"]);
    expect(clamped.colors.primary).toBe("#006A4E");
  });

  it("asserts zoom range [1.0, 1.6] in schema: 0.9 throws, 1.0 passes, 1.6 passes, 1.7 throws, 2.5 throws", () => {
    // zoom = 0.9 throws
    expect(() =>
      validateAndClampPlan(
        {
          ...validRawPlan,
          photos: [{ index: 0, focal: { x: 0.5, y: 0.3 }, zoom: 0.9 }],
        },
        mockContext
      )
    ).toThrowError(ZodError);

    // zoom = 1.0 passes
    const plan10 = validateAndClampPlan(
      {
        ...validRawPlan,
        photos: [{ index: 0, focal: { x: 0.5, y: 0.3 }, zoom: 1.0 }],
      },
      mockContext
    );
    expect(plan10.photos[0].zoom).toBe(1.0);

    // zoom = 1.6 passes
    const plan16 = validateAndClampPlan(
      {
        ...validRawPlan,
        photos: [{ index: 0, focal: { x: 0.5, y: 0.3 }, zoom: 1.6 }],
      },
      mockContext
    );
    expect(plan16.photos[0].zoom).toBe(1.6);

    // zoom = 1.7 throws
    expect(() =>
      validateAndClampPlan(
        {
          ...validRawPlan,
          photos: [{ index: 0, focal: { x: 0.5, y: 0.3 }, zoom: 1.7 }],
        },
        mockContext
      )
    ).toThrowError(ZodError);

    // zoom = 2.5 throws
    expect(() =>
      validateAndClampPlan(
        {
          ...validRawPlan,
          photos: [{ index: 0, focal: { x: 0.5, y: 0.3 }, zoom: 2.5 }],
        },
        mockContext
      )
    ).toThrowError(ZodError);
  });

  it("asserts focal.x=-0.1 throws ZodError (out of range [0, 1])", () => {
    const raw = {
      ...validRawPlan,
      photos: [{ index: 0, focal: { x: -0.1, y: 0.3 }, zoom: 1.2 }],
    };
    expect(() => validateAndClampPlan(raw, mockContext)).toThrowError(ZodError);
  });

  it("throws ZodError on bad hex 'not-a-hex'", () => {
    const raw = {
      ...validRawPlan,
      colors: {
        ...validRawPlan.colors,
        primary: "not-a-hex",
      },
    };
    expect(() => validateAndClampPlan(raw, mockContext)).toThrowError(ZodError);
  });

  it("filters out decorations not in allowed list", () => {
    const raw = {
      ...validRawPlan,
      decorations: ["paddy", "unallowed_dec", "doves", "another_bad_dec"],
    };
    const clamped = validateAndClampPlan(raw, mockContext);
    expect(clamped.decorations).toEqual(["paddy", "doves"]);
  });

  it("replaces all colors with template defaults if contrast fails", () => {
    // #FFFFFF on #FFFFFE fails contrast < 4.5
    const raw = {
      ...validRawPlan,
      colors: {
        primary: "#FFFFFE",
        secondary: "#D61F31",
        accent: "#F7C948",
        textOnPrimary: "#FFFFFF",
        textOnLight: "#1A1A1A",
      },
    };
    const clamped = validateAndClampPlan(raw, mockContext);
    expect(clamped.colors.primary).toBe(mockContext.template.colorScheme.primary);
    expect(clamped.colors.secondary).toBe(mockContext.template.colorScheme.secondary);
    expect(clamped.colors.textOnPrimary).toBe(
      mockContext.template.colorScheme.textOnPrimary
    );
  });

  it("getFallbackPlan returns large headlineTier and medium decorationIntensity for all 3 slugs", () => {
    for (const slug of [
      "victory-day-classic",
      "condolence-tribute",
      "campaign-bold",
    ]) {
      const plan = getFallbackPlan(slug);
      expect(plan.headlineTier).toBe("large");
      expect(plan.decorationIntensity).toBe("medium");
      expect(plan.photos.length).toBe(3);
    }
  });

  it("getFallbackPlan returns campaign-bold fallback for unknown slug", () => {
    const plan = getFallbackPlan("completely-unknown-slug");
    const campaignPlan = getFallbackPlan("campaign-bold");
    expect(plan).toEqual(campaignPlan);
  });

  it("computes luminance and contrast ratio correctly", () => {
    const whiteLum = getLuminance("#FFFFFF");
    const blackLum = getLuminance("#000000");
    expect(whiteLum).toBeCloseTo(1, 2);
    expect(blackLum).toBeCloseTo(0, 2);

    const ratio = getContrastRatio("#FFFFFF", "#000000");
    expect(ratio).toBeCloseTo(21, 0);
  });
});
