/* eslint-disable no-console */
import sharp from "sharp";
import { connectDb, disconnectDb } from "../config/db.js";
import { Template } from "../models/Template.js";
import { getStorageProvider } from "../services/storage/index.js";
import { renderPoster } from "../services/render/render.service.js";
import { closeBrowser } from "../services/render/puppeteer.service.js";
import { getFallbackPlan } from "../services/ai/layout-plan.js";
import { getTemplateSvg } from "../services/render/template-svg-registry.js";
import { env } from "../config/env.js";
import { PosterFormData } from "@prochar/shared";

/**
 * Fixture data per SEED_TEMPLATES §8
 */
export const THUMBNAIL_FIXTURES = {
  photosPerTemplate: {
    "victory-day-classic": 3,
    "condolence-tribute": 1,
    "campaign-bold": 2,
  } as Record<string, number>,
  common: {
    name: "নমুনা নাম",
    designation: "সাধারণ সম্পাদক",
    partyOrOrganization: "নমুনা সংগঠন",
    union: "নমুনা ইউনিয়ন",
    thana: "নমুনা থানা",
    district: "নমুনা জেলা",
    creditLine: "",
  },
  templates: {
    "victory-day-classic": {
      headline: "মহান বিজয় দিবস",
      subtext: "সকলকে বিজয় দিবসের শুভেচ্ছা",
      occasionType: "victory_day" as const,
    },
    "condolence-tribute": {
      headline: "বিনম্র শ্রদ্ধাঞ্জলি",
      subtext: "আল্লাহ তাঁকে জান্নাতবাসী করুন",
      occasionType: "condolence" as const,
    },
    "campaign-bold": {
      headline: "আপনার পাশে, আপনার সাথে",
      subtext: "সবার জন্য একটি ভালো আগামী",
      occasionType: "campaign" as const,
    },
  } as Record<string, { headline: string; subtext: string; occasionType: any }>,
};

export async function seedThumbnails(): Promise<{ updatedCount: number }> {
  console.log("[seed:thumbnails] Connecting to MongoDB...");
  await connectDb(env.MONGODB_URI);

  const storageProvider = getStorageProvider();
  let updatedCount = 0;

  try {
    const activeTemplates = await Template.find({ isActive: true });
    console.log(`[seed:thumbnails] Found ${activeTemplates.length} active templates.`);

    if (activeTemplates.length === 0) {
      console.warn("[seed:thumbnails] No active templates found. Did you run 'npm run seed' first?");
      return { updatedCount: 0 };
    }

    // Rasterize shared/placeholder_person.svg to 800x1000 WebP
    const svgStr = getTemplateSvg("shared/placeholder_person.svg");
    const placeholderWebp = await sharp(Buffer.from(svgStr))
      .resize(800, 1000)
      .webp()
      .toBuffer();

    for (const tpl of activeTemplates) {
      console.log(`[seed:thumbnails] Generating thumbnail for '${tpl.slug}'...`);

      const tplFixture =
        THUMBNAIL_FIXTURES.templates[tpl.slug] || {
          headline: "নমুনা শিরোনাম",
          subtext: "নমুনা বার্তা",
          occasionType: tpl.occasionType,
        };

      const formData: PosterFormData = {
        ...THUMBNAIL_FIXTURES.common,
        ...tplFixture,
      };

      const photoCount =
        THUMBNAIL_FIXTURES.photosPerTemplate[tpl.slug] ?? 1;

      const fallbackPlan = getFallbackPlan(tpl.slug);
      const photos = fallbackPlan.photos.slice(0, photoCount).map((p) => ({
        buffer: placeholderWebp,
        focal: p.focal,
        zoom: p.zoom,
      }));

      // Render 1800x2400 PNG buffer
      const pngBuffer = await renderPoster({
        template: tpl.layoutConfig,
        formData,
        layoutPlan: fallbackPlan,
        photos,
      });

      // Resize via sharp to 600x800 webp quality 80
      const thumbnailBuffer = await sharp(pngBuffer)
        .resize(600, 800)
        .webp({ quality: 80 })
        .toBuffer();

      // Upload to storage provider
      const uploadResult = await storageProvider.upload(thumbnailBuffer, {
        folder: "posters/thumbnails",
        publicId: `thumb-${tpl.slug}`,
      });

      // Idempotently update template
      tpl.thumbnailUrl = uploadResult.url;
      await tpl.save();

      console.log(
        `  -> Uploaded thumbnail for '${tpl.slug}': ${uploadResult.url}`
      );
      updatedCount++;
    }

    console.log(`[seed:thumbnails] Complete! Updated ${updatedCount} thumbnails.`);
    return { updatedCount };
  } finally {
    await closeBrowser().catch(() => {});
    await disconnectDb().catch(() => {});
  }
}

// Auto-run when executed directly as CLI script
const isMainModule =
  process.argv[1] &&
  (process.argv[1].endsWith("seed-thumbnails.ts") ||
    process.argv[1].endsWith("seed-thumbnails.js"));

if (isMainModule) {
  seedThumbnails()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error("[seed:thumbnails] Fatal error:", err);
      process.exit(1);
    });
}
