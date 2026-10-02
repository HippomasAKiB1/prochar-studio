import crypto from "node:crypto";
import type {
  TemplateLayoutConfig,
  PosterFormData,
  LayoutPlan,
  FontFamily,
  FontWeight,
} from "@prochar/shared";
import { expandStandardFooterSlots } from "@prochar/shared";
import { getFontFaceCss } from "./fonts.service.js";
import { TEXT_FIT_SCRIPT } from "./text-fit.script.js";
import {
  colorSchemeToCssVars,
  wrapDocument,
  resolveSourceText,
} from "./html-utils.js";
import { renderTripleTopCanvas } from "./triple-top.renderer.js";
import { renderMemorialArchCanvas } from "./memorial-arch.renderer.js";
import { renderBannerDiagonalCanvas } from "./banner-diagonal.renderer.js";
import {
  renderHtmlToPng,
  TextSlotFitConfig,
} from "./puppeteer.service.js";

export interface RenderPosterPhoto {
  buffer: Buffer;
  focal?: { x: number; y: number };
  zoom?: number;
}

export interface RenderPosterParams {
  template: TemplateLayoutConfig;
  formData: PosterFormData;
  layoutPlan: LayoutPlan;
  photos: RenderPosterPhoto[];
}

/**
 * Orchestrates template rendering, font inlining, HTML compilation, text fitting, and PNG rasterization.
 */
export async function renderPoster({
  template,
  formData,
  layoutPlan,
  photos,
}: RenderPosterParams): Promise<Buffer> {
  // 1. Build CSS var block from template.colorScheme
  const cssVars = colorSchemeToCssVars(template.colorScheme);

  // 2. Build fontFaceCss from union of fontFamily+fontWeight across all textSlots (deduped)
  const allTextSlots = expandStandardFooterSlots(template.textSlots);
  const fontMap = new Map<string, { family: FontFamily; weight: FontWeight }>();
  for (const slot of allTextSlots) {
    const key = `${slot.fontFamily}-${slot.fontWeight}`;
    if (!fontMap.has(key)) {
      fontMap.set(key, { family: slot.fontFamily, weight: slot.fontWeight });
    }
  }
  const fontFaceCss = getFontFaceCss(Array.from(fontMap.values()));

  // 3. Generate CSP nonce
  const nonce = crypto.randomBytes(16).toString("base64");

  // 4. Convert photo buffers to data:image/webp;base64 URIs
  const photoDataUris = photos.map(
    (p) => `data:image/webp;base64,${p.buffer.toString("base64")}`
  );

  // Merge photo focal & zoom into layoutPlan if provided on photo items
  const mergedPlan: LayoutPlan = {
    ...layoutPlan,
    photos: photos.map((p, idx) => {
      const existing = layoutPlan.photos.find((lp) => lp.index === idx);
      return {
        index: idx,
        focal: p.focal || existing?.focal || { x: 0.5, y: 0.3 },
        zoom: p.zoom || existing?.zoom || 1.0,
      };
    }),
  };

  // 5. Pick canvas renderer by layoutFamily
  let canvasHtml = "";
  switch (template.layoutFamily) {
    case "triple-top":
      canvasHtml = renderTripleTopCanvas(template, formData, mergedPlan, photoDataUris);
      break;
    case "memorial-arch":
      canvasHtml = renderMemorialArchCanvas(template, formData, mergedPlan, photoDataUris);
      break;
    case "banner-diagonal":
      canvasHtml = renderBannerDiagonalCanvas(template, formData, mergedPlan, photoDataUris);
      break;
    default:
      throw new Error(`UNKNOWN_LAYOUT_FAMILY: ${(template as TemplateLayoutConfig).layoutFamily}`);
  }

  // 6. Wrap in complete HTML document with CSP meta and nonce'd fit script tag
  const html = wrapDocument("", canvasHtml, cssVars, fontFaceCss, nonce, TEXT_FIT_SCRIPT);

  // 7. Prepare textSlotsWithOptions for binary search text fitting
  const textSlotsWithOptions: TextSlotFitConfig[] = [];
  for (const slot of allTextSlots) {
    const resolvedText = resolveSourceText(slot.source, formData);
    // If subtext is empty, it was omitted from the canvas, so skip fitting
    if (slot.source === "subtext" && (!resolvedText || resolvedText.trim() === "")) {
      continue;
    }

    textSlotsWithOptions.push({
      id: slot.id,
      options: {
        minFont: slot.minFont,
        maxFont: slot.maxFont,
        maxLines: slot.maxLines,
        lineHeight: slot.lineHeight,
        source: slot.source,
        headlineTier: mergedPlan.headlineTier,
        truncate: slot.truncate,
      },
    });
  }

  // 8. Render to 1800x2400 PNG buffer via Puppeteer service
  const requiredFonts = Array.from(fontMap.values());
  return renderHtmlToPng(html, nonce, textSlotsWithOptions, requiredFonts);
}
