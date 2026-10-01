import { describe, it, expect } from "vitest";
import path from "path";
import { TemplateLayoutConfigSchema, expandStandardFooterSlots } from "@prochar/shared";
import { SEED_TEMPLATES_DATA } from "../scripts/seed-data.js";
import { lintAll } from "../services/lints/index.js";

describe("Seed Templates Data Verification", () => {
  const assetsRootDir = path.resolve(process.cwd(), "apps/api/assets/templates");

  it("has exactly 3 seed templates", () => {
    expect(SEED_TEMPLATES_DATA).toHaveLength(3);
  });

  it.each(SEED_TEMPLATES_DATA)(
    "template '$slug' parses with TemplateLayoutConfigSchema, expands footer, and passes all 8 lints",
    (tpl) => {
      // 1. Zod parse
      const parsedConfig = TemplateLayoutConfigSchema.parse(tpl.layoutConfig);
      expect(parsedConfig).toBeDefined();

      // 2. Expand standard footer slots
      const expandedTextSlots = expandStandardFooterSlots(parsedConfig.textSlots);
      const expandedConfig = {
        ...parsedConfig,
        textSlots: expandedTextSlots,
      };

      // 3. Run all 8 lints
      const lintResult = lintAll(expandedConfig, { assetsRootDir });
      expect(lintResult.ok, `Lints failed on ${tpl.slug}: ${lintResult.errors.join("; ")}`).toBe(true);
      expect(lintResult.errors).toHaveLength(0);
    }
  );
});
