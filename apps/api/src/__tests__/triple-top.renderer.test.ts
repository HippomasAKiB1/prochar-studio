import { describe, it, expect } from "vitest";
import { SEED_TEMPLATES_DATA } from "../scripts/seed-data.js";
import {
  TemplateLayoutConfigSchema,
  TemplateLayoutConfig,
  PosterFormData,
  LayoutPlan,
} from "@prochar/shared";
import { resolveToken } from "../services/render/html-utils.js";
import { renderTripleTop } from "../services/render/triple-top.renderer.js";

describe("HTML Utils & Triple-Top Renderer (Chunk 4.4)", () => {
  const victoryRaw = SEED_TEMPLATES_DATA.find((t) => t.slug === "victory-day-classic")!;
  const victoryTemplate: TemplateLayoutConfig = TemplateLayoutConfigSchema.parse(
    victoryRaw.layoutConfig
  );

  const fixtureFormData: PosterFormData = {
    name: "নমুনা নাম",
    designation: "সাধারণ সম্পাদক",
    partyOrOrganization: "নমুনা সংগঠন",
    union: "নমুনা ইউনিয়ন",
    thana: "নমুনা থানা",
    district: "নমুনা জেলা",
    creditLine: "",
    occasionType: "victory_day",
    headline: "মহান বিজয় দিবস",
    subtext: "সকলকে বিজয় দিবসের শুভেচ্ছা",
  };

  const fallbackPlan: LayoutPlan = {
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

  const placeholderUri = "data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==";

  describe("resolveToken", () => {
    it("resolves valid tokens from colorScheme", () => {
      expect(resolveToken("$primary", victoryTemplate.colorScheme)).toBe("#006A4E");
      expect(resolveToken("$accent", victoryTemplate.colorScheme)).toBe("#F7C948");
    });

    it("throws UNKNOWN_COLOR_TOKEN for undefined tokens", () => {
      expect(() => resolveToken("$unknownColor", victoryTemplate.colorScheme)).toThrow(
        "UNKNOWN_COLOR_TOKEN: $unknownColor"
      );
    });
  });

  describe("renderTripleTop", () => {
    it("renders victory-day-classic with 1 photo and checks all required slot attributes and tokens", () => {
      const html = renderTripleTop(victoryTemplate, fixtureFormData, fallbackPlan, [
        placeholderUri,
      ]);

      // Assert text slots
      expect(html).toContain('data-slot-id="headline"');
      expect(html).toContain('class="text-content"');
      expect(html).toContain('data-slot-id="subtext"');
      expect(html).toContain('data-slot-id="credit"');
      expect(html).toContain('data-slot-id="designationOrg"');
      expect(html).toContain('data-slot-id="location"');

      // Assert photo slot selection (1 photo -> center only)
      expect(html).toContain('data-photo-id="center"');
      expect(html).not.toContain('data-photo-id="left"');
      expect(html).not.toContain('data-photo-id="right"');

      // Assert CSS variables
      expect(html).toContain("var(--c-primary)");
      expect(html).toContain("var(--c-secondary)");
      expect(html).toContain("var(--c-accent)");

      // Assert CSP meta tag
      expect(html).toContain("<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'");
    });

    it("escapes malicious headline HTML (<script> tags)", () => {
      const maliciousFormData: PosterFormData = {
        ...fixtureFormData,
        headline: "<script>alert(1)</script>",
      };

      const html = renderTripleTop(victoryTemplate, maliciousFormData, fallbackPlan, [
        placeholderUri,
      ]);

      expect(html).toContain("&lt;script&gt;alert(1)&lt;&#x2F;script&gt;");
      expect(html).not.toContain("<script>alert(1)</script>");
    });

    it("differentiates headline tier via data attribute", () => {
      const planLarge: LayoutPlan = { ...fallbackPlan, headlineTier: "large" };
      const planXLarge: LayoutPlan = { ...fallbackPlan, headlineTier: "xlarge" };

      const htmlLarge = renderTripleTop(victoryTemplate, fixtureFormData, planLarge, [
        placeholderUri,
      ]);
      const htmlXLarge = renderTripleTop(victoryTemplate, fixtureFormData, planXLarge, [
        placeholderUri,
      ]);

      expect(htmlLarge).toContain('data-headline-tier="large"');
      expect(htmlXLarge).toContain('data-headline-tier="xlarge"');
      expect(htmlLarge).not.toEqual(htmlXLarge);
    });
  });
});
