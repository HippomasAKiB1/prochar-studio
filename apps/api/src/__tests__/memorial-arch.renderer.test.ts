import { describe, it, expect } from "vitest";
import { SEED_TEMPLATES_DATA } from "../scripts/seed-data.js";
import {
  TemplateLayoutConfigSchema,
  TemplateLayoutConfig,
  PosterFormData,
  LayoutPlan,
} from "@prochar/shared";
import { renderMemorialArch } from "../services/render/memorial-arch.renderer.js";

describe("Memorial-Arch Renderer (Chunk 4.5)", () => {
  const condolenceRaw = SEED_TEMPLATES_DATA.find((t) => t.slug === "condolence-tribute")!;
  const condolenceTemplate: TemplateLayoutConfig = TemplateLayoutConfigSchema.parse(
    condolenceRaw.layoutConfig
  );

  const fixtureFormData: PosterFormData = {
    name: "নমুনা নাম",
    designation: "সাধারণ সম্পাদক",
    partyOrOrganization: "নমুনা সংগঠন",
    union: "নমুনা ইউনিয়ন",
    thana: "নমুনা থানা",
    district: "নমুনা জেলা",
    creditLine: "",
    occasionType: "condolence",
    headline: "বিনম্র শ্রদ্ধাঞ্জলি",
    subtext: "আল্লাহ তাঁকে জান্নাতবাসী করুন",
  };

  const fallbackPlan: LayoutPlan = {
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

  const placeholderUri = "data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==";

  it("renders condolence-tribute and includes all required text slots and photo slots", () => {
    const html = renderMemorialArch(condolenceTemplate, fixtureFormData, fallbackPlan, [
      placeholderUri,
    ]);

    expect(html).toContain('data-slot-id="headline"');
    expect(html).toContain('class="text-content"');
    expect(html).toContain('data-slot-id="subtext"');
    expect(html).toContain('data-slot-id="credit"');
    expect(html).toContain('data-slot-id="designationOrg"');
    expect(html).toContain('data-slot-id="location"');
    expect(html).toContain('data-photo-id="center"');
    expect(html).toContain("<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'");
  });

  it("applies grayscale(0.85) filter to condolence photo slots", () => {
    const html = renderMemorialArch(condolenceTemplate, fixtureFormData, fallbackPlan, [
      placeholderUri,
    ]);

    expect(html).toContain("filter: grayscale(0.85);");
  });

  it("applies scaleX and scaleY transforms to corner ornaments", () => {
    const html = renderMemorialArch(condolenceTemplate, fixtureFormData, fallbackPlan, [
      placeholderUri,
    ]);

    expect(html).toContain("transform: scaleX(-1);");
    expect(html).toContain("transform: scaleY(-1);");
    expect(html).toContain("transform: scale(-1, -1);");
  });

  it("applies arch border radii for arch shaped photo slots", () => {
    const html = renderMemorialArch(condolenceTemplate, fixtureFormData, fallbackPlan, [
      placeholderUri,
    ]);

    // Center photo slot in condolence-tribute has w: 230 -> halfW = 115px
    expect(html).toContain("border-top-left-radius:115px;");
    expect(html).toContain("border-top-right-radius:115px;");
  });

  it("escapes user-supplied text nodes properly", () => {
    const maliciousFormData: PosterFormData = {
      ...fixtureFormData,
      headline: "শ্রদ্ধাঞ্জলি <script>alert(1)</script>",
    };

    const html = renderMemorialArch(condolenceTemplate, maliciousFormData, fallbackPlan, [
      placeholderUri,
    ]);

    expect(html).toContain("শ্রদ্ধাঞ্জলি &lt;script&gt;alert(1)&lt;&#x2F;script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
  });
});
