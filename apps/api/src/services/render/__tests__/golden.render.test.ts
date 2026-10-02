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

  function hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace("#", "");
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
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
    it(`renders ${item.slug} at 1800x2400 and verifies headline (>3%) and footer (>2%) text pixels`, async () => {
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

      // 1. Dimensions check
      const meta = await sharp(buffer).metadata();
      expect(meta.format).toBe("png");
      expect(meta.width).toBe(1800);
      expect(meta.height).toBe(2400);

      const { data, info } = await sharp(buffer)
        .raw()
        .toBuffer({ resolveWithObject: true });
      const px = (x: number, y: number) => {
        const i = (y * info.width + x) * info.channels;
        return [data[i], data[i + 1], data[i + 2]];
      };

      // 2. Assertion A: Headline text pixels > 3%
      const headSlot = template.textSlots.find((s) => s.id === "headline")!;
      const rx = headSlot.x * 3;
      const ry = headSlot.y * 3;
      const rw = headSlot.w * 3;
      const rh = headSlot.h * 3;
      const headTotal = rw * rh;

      // Headline block background colors
      let headBg = hexToRgb(template.colorScheme.secondary);
      if (item.slug === "condolence-tribute") {
        headBg = hexToRgb(template.colorScheme.background);
      }

      let headTextCount = 0;
      for (let y = ry; y < ry + rh; y++) {
        for (let x = rx; x < rx + rw; x++) {
          const [r, g, b] = px(x, y);
          if (
            Math.abs(r - headBg[0]) > 20 ||
            Math.abs(g - headBg[1]) > 20 ||
            Math.abs(b - headBg[2]) > 20
          ) {
            headTextCount++;
          }
        }
      }
      const headRatio = headTextCount / headTotal;
      expect(headRatio).toBeGreaterThan(0.03);

      // 3. Assertion B: Footer text pixels > 2%
      // Footer rect is at y=700, h=100 (logical) -> y=2100, h=300 (raster)
      const footTotal = 1800 * 300;
      const footBg = hexToRgb(template.colorScheme.primary);
      let footTextCount = 0;
      for (let y = 2100; y < 2400; y++) {
        for (let x = 0; x < 1800; x++) {
          const [r, g, b] = px(x, y);
          if (
            Math.abs(r - footBg[0]) > 20 ||
            Math.abs(g - footBg[1]) > 20 ||
            Math.abs(b - footBg[2]) > 20
          ) {
            footTextCount++;
          }
        }
      }
      const footRatio = footTextCount / footTotal;
      expect(footRatio).toBeGreaterThan(0.02);
    }, 40000);
  }

  // 4. Assertion C: Conjunct-render test
  it("conjunct-render test: 'ক্ষ' vs 'ক' yields PNG buffers differing by > 500 bytes", async () => {
    const victoryRaw = SEED_TEMPLATES_DATA.find((t) => t.slug === "victory-day-classic")!;
    const template: TemplateLayoutConfig = TemplateLayoutConfigSchema.parse(
      victoryRaw.layoutConfig
    );
    const plan = templatesToTest[0].plan;

    const bufferKsha = await renderPoster({
      template,
      formData: {
        ...commonFormData,
        occasionType: "victory_day",
        headline: "ক্ষ",
        subtext: "পরীক্ষামূলক বার্তা",
      },
      layoutPlan: plan as LayoutPlan,
      photos: [{ buffer: placeholderWebpBuffer, focal: { x: 0.5, y: 0.3 }, zoom: 1.0 }],
    });

    const bufferKa = await renderPoster({
      template,
      formData: {
        ...commonFormData,
        occasionType: "victory_day",
        headline: "ক",
        subtext: "পরীক্ষামূলক বার্তা",
      },
      layoutPlan: plan as LayoutPlan,
      photos: [{ buffer: placeholderWebpBuffer, focal: { x: 0.5, y: 0.3 }, zoom: 1.0 }],
    });

    let diffBytes = 0;
    const minLen = Math.min(bufferKsha.length, bufferKa.length);
    for (let i = 0; i < minLen; i++) {
      if (bufferKsha[i] !== bufferKa[i]) {
        diffBytes++;
      }
    }
    diffBytes += Math.abs(bufferKsha.length - bufferKa.length);

    expect(diffBytes).toBeGreaterThan(500);
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
