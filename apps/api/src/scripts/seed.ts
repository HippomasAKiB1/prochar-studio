/* eslint-disable no-console */
import {
  TemplateLayoutConfigSchema,
  expandStandardFooterSlots,
  TemplateLayoutConfig,
} from "@prochar/shared";
import { connectDb, disconnectDb } from "../config/db.js";
import { Template } from "../models/Template.js";
import { User } from "../models/User.js";
import { hashPassword } from "../services/auth.service.js";
import { lintAll, getAssetsRootDir } from "../services/lints/index.js";
import { SEED_TEMPLATES_DATA } from "./seed-data.js";
import { env } from "../config/env.js";

export interface SeedOptions {
  uri?: string;
  assetsRootDir?: string;
  silent?: boolean;
}

export interface SeedResult {
  templatesCount: number;
  demoUserStatus: "created" | "existing_preserved";
}

/**
 * Executes the database seed procedure idempotently.
 */
export async function seedDatabase(options: SeedOptions = {}): Promise<SeedResult> {
  const uri = options.uri || env.MONGODB_URI;
  const assetsRootDir = options.assetsRootDir || getAssetsRootDir();
  const log = options.silent ? () => {} : console.log;

  log(`[seed] Connecting to MongoDB at ${uri.replace(/\/\/.*@/, "//***@")}...`);
  await connectDb(uri);

  let templatesCount = 0;

  try {
    // 2. Process each of the 3 templates
    for (const tpl of SEED_TEMPLATES_DATA) {
      log(`[seed] Processing template: ${tpl.slug}...`);

      // 2a. Parse with TemplateLayoutConfigSchema (Zod)
      const parsedConfig = TemplateLayoutConfigSchema.parse(tpl.layoutConfig);

      // 2b. Expand standard-v1 footer preset into textSlots
      const expandedTextSlots = expandStandardFooterSlots(parsedConfig.textSlots);
      const expandedConfig: TemplateLayoutConfig = {
        ...parsedConfig,
        textSlots: expandedTextSlots,
      };

      // 2c. Run every lint
      const lintResult = lintAll(expandedConfig, { assetsRootDir });
      if (!lintResult.ok) {
        console.error(
          `[seed] LINT FAILURE on template '${tpl.slug}':\n${lintResult.errors.map((e) => `  - ${e}`).join("\n")}`
        );
        process.exit(1);
      }

      // 2d. Upsert by slug
      const thumbnailUrl = `/api/templates/thumbnail/${tpl.slug}`;
      await Template.findOneAndUpdate(
        { slug: tpl.slug },
        {
          $set: {
            title: tpl.title,
            titleEn: tpl.titleEn,
            occasionType: tpl.occasionType,
            thumbnailUrl,
            layoutConfig: expandedConfig,
            isActive: tpl.isActive,
          },
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      );
      templatesCount++;
    }

    // 3. Create or update demo user idempotently (PRD §11 & Chunk 3.5: $setOnInsert for passwordHash)
    const demoEmail = "demo@prochar.studio";
    const existingDemoUser = await User.findOne({ email: demoEmail });
    const demoUserStatus: "created" | "existing_preserved" = existingDemoUser
      ? "existing_preserved"
      : "created";

    const passwordHash = await hashPassword("ProcharDemo2026!");
    await User.findOneAndUpdate(
      { email: demoEmail },
      {
        $set: { name: "Prochar Demo", role: "user" },
        $setOnInsert: { passwordHash },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    if (demoUserStatus === "created") {
      log("[seed] Demo user created: demo@prochar.studio");
    } else {
      log("[seed] Demo user exists; password hash preserved.");
    }

    log(`[seed] Complete! Upserted ${templatesCount} templates. Demo user: ${demoUserStatus}.`);
    return { templatesCount, demoUserStatus };
  } finally {
    // If running as CLI script, disconnect
    if (!options.uri) {
      await disconnectDb();
    }
  }
}

// Auto-run when executed directly as CLI script
const isMainModule =
  process.argv[1] &&
  (process.argv[1].endsWith("seed.ts") || process.argv[1].endsWith("seed.js"));

if (isMainModule) {
  seedDatabase()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error("[seed] Fatal error:", err);
      process.exit(1);
    });
}
