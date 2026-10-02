import type {
  TemplateLayoutConfig,
  PosterFormData,
  LayoutPlan,
} from "@prochar/shared";
import { expandStandardFooterSlots } from "@prochar/shared";
import {
  colorSchemeToCssVars,
  renderLayers,
  renderPhotoSlot,
  renderDecoration,
  renderTextSlot,
  renderFooter,
  resolveSourceText,
  wrapDocument,
} from "./html-utils.js";
import type { RenderOptions } from "./triple-top.renderer.js";

/**
 * Renders the #canvas container inner HTML for banner-diagonal layout family.
 */
export function renderBannerDiagonalCanvas(
  template: TemplateLayoutConfig,
  formData: PosterFormData,
  layoutPlan: LayoutPlan,
  photoDataUris: string[]
): string {
  const colorScheme = template.colorScheme;

  // BAND 1: layers[] (z: 0..9, e.g. diagonal_band.svg, headline_block_slant.svg)
  const layersHtml = renderLayers(template.layers);

  // BAND 2: bg decorations (z: 10, e.g. halftone_dots, rays_burst)
  const bgDecorations = template.decorations.filter(
    (d) => d.layer === "bg" && layoutPlan.decorations.includes(d.key)
  );
  const bgDecHtml = bgDecorations
    .map((d) => renderDecoration(d, layoutPlan.decorationIntensity, colorScheme, template))
    .join("\n");

  // BAND 3: photo slots (z: 20 + slot.z)
  const photoCount = photoDataUris.length;
  const assignedSlotIds =
    template.photoAssignment[String(photoCount) as "1" | "2" | "3"] || [];
  const photosHtml = assignedSlotIds
    .map((slotId, index) => {
      const slot = template.photoSlots.find((s) => s.id === slotId);
      if (!slot) return "";
      const photoPlan =
        layoutPlan.photos.find((p) => p.index === index) || layoutPlan.photos[index];
      const dataUri = photoDataUris[index];
      if (!dataUri) return "";
      return renderPhotoSlot(slot, dataUri, photoPlan?.focal, photoPlan?.zoom, colorScheme);
    })
    .filter(Boolean)
    .join("\n");

  // BAND 4: mid decorations (z: 40, e.g. chevron_stripe)
  const midDecorations = template.decorations.filter(
    (d) => d.layer === "mid" && layoutPlan.decorations.includes(d.key)
  );
  const midDecHtml = midDecorations
    .map((d) => renderDecoration(d, layoutPlan.decorationIntensity, colorScheme, template))
    .join("\n");

  // BAND 5: footer rect + top rule (z: 50..51)
  const footerHtml = renderFooter(template.footer, template, colorScheme);

  // BAND 6: text slots (z: 60)
  // Handles both body designationOrgBody and footer standard-v1 designationOrg seamlessly
  const allTextSlots = expandStandardFooterSlots(template.textSlots);
  const textHtml = allTextSlots
    .map((slot) => {
      const resolvedText = resolveSourceText(slot.source, formData);
      const extraAttrs =
        slot.source === "headline"
          ? ` data-headline-tier="${layoutPlan.headlineTier}"`
          : "";
      return renderTextSlot(slot, resolvedText, colorScheme, extraAttrs);
    })
    .filter(Boolean)
    .join("\n");

  // BAND 7: fg decorations (z: 80)
  const fgDecorations = template.decorations.filter(
    (d) => d.layer === "fg" && layoutPlan.decorations.includes(d.key)
  );
  const fgDecHtml = fgDecorations
    .map((d) => renderDecoration(d, layoutPlan.decorationIntensity, colorScheme, template))
    .join("\n");

  return `<div id="canvas">
    <!-- BAND 1: layers[] -->
${layersHtml}

    <!-- BAND 2: decorations layer:bg -->
${bgDecHtml}

    <!-- BAND 3: photo slots -->
${photosHtml}

    <!-- BAND 4: decorations layer:mid -->
${midDecHtml}

    <!-- BAND 5: footer rect + top rule -->
${footerHtml}

    <!-- BAND 6: text slots -->
${textHtml}

    <!-- BAND 7: decorations layer:fg -->
${fgDecHtml}
  </div>`;
}

/**
 * Pure deterministic renderer for banner-diagonal layout family (RENDERER_SPEC §1.4).
 * Signature: (template, formData, layoutPlan, photoDataUris) => string
 */
export function renderBannerDiagonal(
  template: TemplateLayoutConfig,
  formData: PosterFormData,
  layoutPlan: LayoutPlan,
  photoDataUris: string[],
  options?: RenderOptions
): string {
  const canvasHtml = renderBannerDiagonalCanvas(template, formData, layoutPlan, photoDataUris);
  const cssVars = colorSchemeToCssVars(template.colorScheme);
  const nonce = options?.nonce || "NONCE";
  const fontFaceCss = options?.fontFaceCss || "";
  const headExtra = options?.headExtra || "";

  return wrapDocument(headExtra, canvasHtml, cssVars, fontFaceCss, nonce);
}
