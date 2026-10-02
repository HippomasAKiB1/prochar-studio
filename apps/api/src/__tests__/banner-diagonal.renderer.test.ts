import { describe, it, expect } from "vitest";
import { SEED_TEMPLATES_DATA } from "../scripts/seed-data.js";
import {
  TemplateLayoutConfigSchema,
  TemplateLayoutConfig,
  PosterFormData,
  LayoutPlan,
} from "@prochar/shared";
import { renderBannerDiagonal } from "../services/render/banner-diagonal.renderer.js";

describe("Banner-Diagonal Renderer (Chunk 4.6)", () => {
  const campaignRaw = SEED_TEMPLATES_DATA.find((t) => t.slug === "campaign-bold")!;
  const campaignTemplate: TemplateLayoutConfig = TemplateLayoutConfigSchema.parse(
    campaignRaw.layoutConfig
  );

  const fixtureFormData: PosterFormData = {
    name: "নমুনা নাম",
    designation: "সাধারণ সম্পাদক",
    partyOrOrganization: "নমুনা সংগঠন",
    union: "নমুনা ইউনিয়ন",
    thana: "নমুনা থানা",
    district: "নমুনা জেলা",
    creditLine: "",
    occasionType: "campaign",
    headline: "আপনার পাশে, আপনার সাথে",
    subtext: "সবার জন্য একটি ভালো আগামী",
  };

  const fallbackPlan: LayoutPlan = {
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

  const placeholderUri = "data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==";

  it("renders campaign-bold and includes both designationOrgBody and designationOrg with identical text", () => {
    const html = renderBannerDiagonal(campaignTemplate, fixtureFormData, fallbackPlan, [
      placeholderUri,
    ]);

    expect(html).toContain('data-slot-id="designationOrgBody"');
    expect(html).toContain('data-slot-id="designationOrg"');

    // Extract text contents for both slots
    const bodyMatch = html.match(
      /data-slot-id="designationOrgBody"[^>]*>[\s\S]*?<span class="text-content">([\s\S]*?)<\/span>/
    );
    const footerMatch = html.match(
      /data-slot-id="designationOrg"[^>]*>[\s\S]*?<span class="text-content">([\s\S]*?)<\/span>/
    );

    expect(bodyMatch).not.toBeNull();
    expect(footerMatch).not.toBeNull();
    expect(bodyMatch![1]).toBe("সাধারণ সম্পাদক · নমুনা সংগঠন");
    expect(footerMatch![1]).toBe("সাধারণ সম্পাদক · নমুনা সংগঠন");
    expect(bodyMatch![1]).toBe(footerMatch![1]);
  });

  it("renders candidate name, headline, subtext, and footer slots correctly", () => {
    const html = renderBannerDiagonal(campaignTemplate, fixtureFormData, fallbackPlan, [
      placeholderUri,
    ]);

    expect(html).toContain('data-slot-id="name"');
    expect(html).toContain('data-slot-id="headline"');
    expect(html).toContain('class="text-content"');
    expect(html).toContain('data-slot-id="subtext"');
    expect(html).toContain('data-slot-id="credit"');
    expect(html).toContain('data-slot-id="location"');
    expect(html).toContain('data-photo-id="center"');
    expect(html).toContain("<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'");
  });

  it("renders SVG asset layers for diagonal band and headline slant", () => {
    const html = renderBannerDiagonal(campaignTemplate, fixtureFormData, fallbackPlan, [
      placeholderUri,
    ]);

    expect(html).toContain('id="band"');
    expect(html).toContain('id="head-block"');
  });

  it("escapes user-supplied text nodes properly", () => {
    const maliciousFormData: PosterFormData = {
      ...fixtureFormData,
      headline: "প্রার্থী <script>alert('vote')</script>",
    };

    const html = renderBannerDiagonal(campaignTemplate, maliciousFormData, fallbackPlan, [
      placeholderUri,
    ]);

    expect(html).toContain("প্রার্থী &lt;script&gt;alert(&#39;vote&#39;)&lt;&#x2F;script&gt;");
    expect(html).not.toContain("<script>alert('vote')</script>");
  });
});
