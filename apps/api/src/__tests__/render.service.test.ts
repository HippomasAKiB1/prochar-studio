import { describe, it, expect, afterAll } from "vitest";
import sharp from "sharp";
import { SEED_TEMPLATES_DATA } from "../scripts/seed-data.js";
import {
  TemplateLayoutConfigSchema,
  TemplateLayoutConfig,
  PosterFormData,
  LayoutPlan,
} from "@prochar/shared";
import { renderPoster } from "../services/render/render.service.js";
import { closeBrowser } from "../services/render/puppeteer.service.js";

describe("Render Service Orchestrator (Chunk 4.8)", () => {
  afterAll(async () => {
    await closeBrowser();
  });

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

  it("orchestrates full pipeline and outputs an 1800x2400 PNG buffer", async () => {
    const photoBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 4,
        background: { r: 100, g: 150, b: 200, alpha: 1 },
      },
    })
      .webp()
      .toBuffer();

    const resultBuffer = await renderPoster({
      template: victoryTemplate,
      formData: fixtureFormData,
      layoutPlan: fallbackPlan,
      photos: [{ buffer: photoBuffer, focal: { x: 0.5, y: 0.3 }, zoom: 1.05 }],
    });

    expect(resultBuffer).toBeInstanceOf(Buffer);
    expect(resultBuffer[0]).toBe(0x89);
    expect(resultBuffer[1]).toBe(0x50); // P
    expect(resultBuffer[2]).toBe(0x4e); // N
    expect(resultBuffer[3]).toBe(0x47); // G

    const metadata = await sharp(resultBuffer).metadata();
    expect(metadata.format).toBe("png");
    expect(metadata.width).toBe(1800);
    expect(metadata.height).toBe(2400);
  }, 35000);
});
