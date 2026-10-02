/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { SEED_TEMPLATES_DATA } from "../src/scripts/seed-data.js";
import {
  TemplateLayoutConfigSchema,
  TemplateLayoutConfig,
  PosterFormData,
  LayoutPlan,
} from "@prochar/shared";
import { getTemplateSvg } from "../src/services/render/template-svg-registry.js";
import { renderPoster } from "../src/services/render/render.service.js";
import { closeBrowser } from "../src/services/render/puppeteer.service.js";

async function main() {
  const samplesDir = path.resolve(process.cwd(), "apps/api/.samples");
  if (!fs.existsSync(samplesDir)) {
    fs.mkdirSync(samplesDir, { recursive: true });
  }

  // 1. Prepare rasterized placeholder photo
  const svgStr = getTemplateSvg("shared/placeholder_person.svg");
  const placeholderWebp = await sharp(Buffer.from(svgStr))
    .resize(800, 1000)
    .webp()
    .toBuffer();

  const commonFormData = {
    name: "নমুনা নাম",
    designation: "সাধারণ সম্পাদক",
    partyOrOrganization: "নমুনা সংগঠন",
    union: "নমুনা ইউনিয়ন",
    thana: "নমুনা থানা",
    district: "নমুনা জেলা",
    creditLine: "",
  };

  const templatesToRender = [
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

  for (const item of templatesToRender) {
    console.log(`Rendering sample for ${item.slug}...`);
    const raw = SEED_TEMPLATES_DATA.find((t) => t.slug === item.slug)!;
    const template: TemplateLayoutConfig = TemplateLayoutConfigSchema.parse(
      raw.layoutConfig
    );

    const pngBuffer = await renderPoster({
      template,
      formData: item.formData as PosterFormData,
      layoutPlan: item.plan as LayoutPlan,
      photos: [
        {
          buffer: placeholderWebp,
          focal: { x: 0.5, y: 0.25 },
          zoom: 1.05,
        },
      ],
    });

    const outPath = path.join(samplesDir, `${item.slug}.png`);
    fs.writeFileSync(outPath, pngBuffer);
    console.log(`  -> Wrote ${outPath} (${pngBuffer.length} bytes)`);
  }

  await closeBrowser();
  console.log("All samples rendered successfully.");
}

main().catch((err) => {
  console.error("Error rendering samples:", err);
  process.exit(1);
});
