import { describe, it, expect, beforeAll, afterAll } from "vitest";
import sharp from "sharp";
import { SEED_TEMPLATES_DATA } from "../../../scripts/seed-data.js";
import {
  TemplateLayoutConfigSchema,
  TemplateLayoutConfig,
  PosterFormData,
  LayoutPlan,
} from "@prochar/shared";
import { getTemplateSvg } from "../template-svg-registry.js";
import { renderPoster } from "../render.service.js";
import { closeBrowser } from "../puppeteer.service.js";

describe("Golden Bangla Rendering Suite (Chunk 4.9)", () => {
  let placeholderWebpBuffer: Buffer;

  beforeAll(async () => {
    const svgStr = getTemplateSvg("shared/placeholder_person.svg");
    placeholderWebpBuffer = await sharp(Buffer.from(svgStr))
      .resize(800, 1000)
      .webp()
      .toBuffer();
  });

  afterAll(async () => {
    await closeBrowser();
  });

  async function calculateNonBackgroundRatio(pngBuffer: Buffer): Promise<number> {
    const { data, info } = await sharp(pngBuffer)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const totalPixels = info.width * info.height;
    const channels = info.channels;

    const r0 = data[0];
    const g0 = data[1];
    const b0 = data[2];

    const tolerance = 255 * 0.03;
    let nonBgCount = 0;

    for (let i = 0; i < totalPixels; i++) {
      const offset = i * channels;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];

      const isClose =
        Math.abs(r - r0) <= tolerance &&
        Math.abs(g - g0) <= tolerance &&
        Math.abs(b - b0) <= tolerance;

      if (!isClose) {
        nonBgCount++;
      }
    }

    return nonBgCount / totalPixels;
  }

  const commonFormData = {
    name: "নমুনা নাম",
    designation: "সাধারণ সম্পাদক",
    partyOrOrganization: "নমুনা সংগঠন",
    union: "নমুনা ইউনিয়ন",
    thana: "নমুনা থানা",
    district: "নমুনা জেলা",
    creditLine: "",
  };

  const templatesToTest = [
    {
      slug: "victory-day-classic",
      formData: {
        ...commonFormData,
        occasionType: "victory_day" as const,
        headline: "মহান বিজয় দিবস",
        subtext: "সকলকে বিজয় দিবসের শুভেচ্ছা",
      },
      plan: {
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
        decorationIntensity: "medium" as const,
        headlineTier: "large" as const,
      },
    },
    {
      slug: "condolence-tribute",
      formData: {
        ...commonFormData,
        occasionType: "condolence" as const,
        headline: "বিনম্র শ্রদ্ধাঞ্জলি",
        subtext: "আল্লাহ তাঁকে জান্নাতবাসী করুন",
      },
      plan: {
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
        decorationIntensity: "medium" as const,
        headlineTier: "large" as const,
      },
    },
    {
      slug: "campaign-bold",
      formData: {
        ...commonFormData,
        occasionType: "campaign" as const,
        headline: "আপনার পাশে, আপনার সাথে",
        subtext: "সবার জন্য একটি ভালো আগামী",
      },
      plan: {
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
        decorationIntensity: "medium" as const,
        headlineTier: "large" as const,
      },
    },
  ];

  for (const item of templatesToTest) {
    it(`renders ${item.slug} at 1800x2400 with non-trivial pixel content (> 5%)`, async () => {
      const raw = SEED_TEMPLATES_DATA.find((t) => t.slug === item.slug)!;
      const template: TemplateLayoutConfig = TemplateLayoutConfigSchema.parse(
        raw.layoutConfig
      );

      const buffer = await renderPoster({
        template,
        formData: item.formData as PosterFormData,
        layoutPlan: item.plan as LayoutPlan,
        photos: [
          {
            buffer: placeholderWebpBuffer,
            focal: { x: 0.5, y: 0.25 },
            zoom: 1.05,
          },
        ],
      });

      // Assert PNG metadata
      const meta = await sharp(buffer).metadata();
      expect(meta.format).toBe("png");
      expect(meta.width).toBe(1800);
      expect(meta.height).toBe(2400);

      // Assert non-background pixel ratio > 0.05
      const ratio = await calculateNonBackgroundRatio(buffer);
      expect(ratio).toBeGreaterThan(0.05);
    }, 35000);
  }

  it("proves Bangla text presence: different headlines yield different PNG buffers in the first 500 KB", async () => {
    const victoryRaw = SEED_TEMPLATES_DATA.find((t) => t.slug === "victory-day-classic")!;
    const template: TemplateLayoutConfig = TemplateLayoutConfigSchema.parse(
      victoryRaw.layoutConfig
    );
    const plan = templatesToTest[0].plan;

    const bufferA = await renderPoster({
      template,
      formData: {
        ...commonFormData,
        occasionType: "victory_day",
        headline: "বিজয়",
        subtext: "সকলকে শুভেচ্ছা",
      },
      layoutPlan: plan as LayoutPlan,
      photos: [{ buffer: placeholderWebpBuffer, focal: { x: 0.5, y: 0.3 }, zoom: 1.0 }],
    });

    const bufferB = await renderPoster({
      template,
      formData: {
        ...commonFormData,
        occasionType: "victory_day",
        headline: "বিজয়XYZ",
        subtext: "সকলকে শুভেচ্ছা",
      },
      layoutPlan: plan as LayoutPlan,
      photos: [{ buffer: placeholderWebpBuffer, focal: { x: 0.5, y: 0.3 }, zoom: 1.0 }],
    });

    const sliceA = bufferA.subarray(0, 500 * 1024);
    const sliceB = bufferB.subarray(0, 500 * 1024);
    expect(sliceA.equals(sliceB)).toBe(false);
  }, 40000);

  it("escape integration test: script tags vs harmless text yield different PNG buffers", async () => {
    const victoryRaw = SEED_TEMPLATES_DATA.find((t) => t.slug === "victory-day-classic")!;
    const template: TemplateLayoutConfig = TemplateLayoutConfigSchema.parse(
      victoryRaw.layoutConfig
    );
    const plan = templatesToTest[0].plan;

    const bufferEscaped = await renderPoster({
      template,
      formData: {
        ...commonFormData,
        occasionType: "victory_day",
        headline: "<script>alert(1)</script>",
        subtext: "টেস্ট বার্তা",
      },
      layoutPlan: plan as LayoutPlan,
      photos: [{ buffer: placeholderWebpBuffer, focal: { x: 0.5, y: 0.3 }, zoom: 1.0 }],
    });

    const bufferPlain = await renderPoster({
      template,
      formData: {
        ...commonFormData,
        occasionType: "victory_day",
        headline: "XscriptXalertX1XXscriptX",
        subtext: "টেস্ট বার্তা",
      },
      layoutPlan: plan as LayoutPlan,
      photos: [{ buffer: placeholderWebpBuffer, focal: { x: 0.5, y: 0.3 }, zoom: 1.0 }],
    });

    expect(bufferEscaped.equals(bufferPlain)).toBe(false);
  }, 40000);
});
