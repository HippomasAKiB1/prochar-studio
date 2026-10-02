import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { validateSvgSafety } from "@prochar/shared";
import { getTemplateSvg } from "../services/render/template-svg-registry.js";

const TEMPLATE_ASSETS = [
  "shared/placeholder_person.svg",
  "victory-day-classic/paddy.svg",
  "victory-day-classic/doves.svg",
  "victory-day-classic/flag_wave.svg",
  "victory-day-classic/floral_border_a.svg",
  "victory-day-classic/sunburst_rays.svg",
  "condolence-tribute/dove_single.svg",
  "condolence-tribute/divider_line.svg",
  "condolence-tribute/corner_ornament.svg",
  "campaign-bold/diagonal_band.svg",
  "campaign-bold/headline_block_slant.svg",
  "campaign-bold/halftone_dots.svg",
  "campaign-bold/chevron_stripe.svg",
  "campaign-bold/rays_burst.svg",
];

describe("Template SVG Assets (Chunk 3.4)", () => {
  const assetsDir = path.resolve(process.cwd(), "apps/api/assets/templates");

  it("has all 14 asset files on disk", () => {
    for (const relPath of TEMPLATE_ASSETS) {
      const fullPath = path.join(assetsDir, relPath);
      expect(fs.existsSync(fullPath), `Asset '${relPath}' should exist`).toBe(true);
    }
  });

  it.each(TEMPLATE_ASSETS)("asset '%s' is < 40KB and passes SVG safety validation", (relPath) => {
    const fullPath = path.join(assetsDir, relPath);
    const content = fs.readFileSync(fullPath, "utf8");
    const stat = fs.statSync(fullPath);

    expect(stat.size).toBeLessThan(40 * 1024);

    const baseName = path.basename(relPath, ".svg");
    const safety = validateSvgSafety(content, baseName);
    expect(safety.ok, `Safety failure for ${relPath}: ${safety.reasons.join("; ")}`).toBe(true);
    expect(safety.reasons).toHaveLength(0);
  });

  it("throws SVG_ASSET_MISSING when requesting a nonexistent asset", () => {
    expect(() => getTemplateSvg("nonexistent.svg")).toThrow("SVG_ASSET_MISSING: nonexistent.svg");
  });
});
