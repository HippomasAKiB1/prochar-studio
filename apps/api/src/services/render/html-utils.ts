import { escapeHtml } from "@prochar/shared";
import type {
  Layer,
  PhotoSlot,
  TextSlot,
  Decoration,
  TemplateColorScheme,
  TemplateFooter,
  TemplateLayoutConfig,
  TextSlotSource,
} from "@prochar/shared";
import type { PosterFormData } from "@prochar/shared";
import { getTemplateSvg } from "./template-svg-registry.js";

/**
 * Resolves a token like "$primary" into the hex color from colorScheme.
 * Throws UNKNOWN_COLOR_TOKEN if token starts with "$" but has no matching key.
 */
export function resolveToken(token: string, colorScheme: Record<string, string>): string {
  if (token.startsWith("$")) {
    const key = token.slice(1);
    if (key in colorScheme) {
      return colorScheme[key];
    }
    throw new Error(`UNKNOWN_COLOR_TOKEN: ${token}`);
  }
  return token;
}

/**
 * Maps a token to its CSS variable representation.
 * "$primary" -> "var(--c-primary)"
 * "$background" -> "var(--c-background)"
 * "$secondary" -> "var(--c-secondary)"
 * "$accent" -> "var(--c-accent)"
 * "$textOnPrimary" -> "var(--c-on-primary)"
 * "$textOnLight" -> "var(--c-on-light)"
 */
export function tokenToCssVar(token: string): string {
  switch (token) {
    case "$background":
      return "var(--c-background)";
    case "$primary":
      return "var(--c-primary)";
    case "$secondary":
      return "var(--c-secondary)";
    case "$accent":
      return "var(--c-accent)";
    case "$textOnPrimary":
      return "var(--c-on-primary)";
    case "$textOnLight":
      return "var(--c-on-light)";
    default:
      if (token.startsWith("$")) {
        return `var(--c-${token.slice(1)})`;
      }
      return token;
  }
}

/**
 * Formats template.colorScheme as CSS custom properties for injection at :root or #canvas.
 */
export function colorSchemeToCssVars(colorScheme: TemplateColorScheme): string {
  return [
    `--c-background: ${colorScheme.background};`,
    `--c-primary: ${colorScheme.primary};`,
    `--c-secondary: ${colorScheme.secondary};`,
    `--c-accent: ${colorScheme.accent};`,
    `--c-on-primary: ${colorScheme.textOnPrimary};`,
    `--c-on-light: ${colorScheme.textOnLight};`,
  ].join(" ");
}

/**
 * Resolves derived text value for a text slot source from poster form data per SEED_TEMPLATES §2.
 */
export function resolveSourceText(
  source: TextSlotSource,
  formData: PosterFormData
): string {
  switch (source) {
    case "headline":
      return formData.headline || "";
    case "subtext":
      return formData.subtext || "";
    case "name":
      return formData.name || "";
    case "designationOrg": {
      const parts = [formData.designation, formData.partyOrOrganization].filter(Boolean);
      return parts.join(" · ");
    }
    case "location": {
      const parts = [formData.union, formData.thana, formData.district].filter(Boolean);
      return parts.join(", ");
    }
    case "credit": {
      let credit = formData.creditLine?.trim();
      if (!credit) {
        credit = `প্রচারে: ${formData.name || ""}`;
      } else if (!credit.startsWith("প্রচারে")) {
        credit = `প্রচারে: ${credit}`;
      }
      return credit;
    }
    default:
      return "";
  }
}

/**
 * Renders the layers[] array in index order (z-index: index) per RENDERER_SPEC §1.1 painter order.
 */
export function renderLayers(layers: Layer[]): string {
  return layers
    .map((layer, index) => {
      if (layer.type === "rect") {
        const bg = tokenToCssVar(layer.fill);
        return `<div id="${layer.id}" class="layer-rect" style="position:absolute; left:${layer.x}px; top:${layer.y}px; width:${layer.w}px; height:${layer.h}px; background:${bg}; z-index:${index};"></div>`;
      }
      if (layer.type === "frame") {
        const strokeColor = tokenToCssVar(layer.stroke.color);
        return `<div id="${layer.id}" class="layer-frame" style="position:absolute; left:${layer.x}px; top:${layer.y}px; width:${layer.w}px; height:${layer.h}px; border:${layer.stroke.width}px solid ${strokeColor}; z-index:${index}; pointer-events:none;"></div>`;
      }
      if (layer.type === "asset") {
        const svgContent = getTemplateSvg(layer.asset);
        return `<div id="${layer.id}" class="layer-asset" style="position:absolute; left:${layer.x}px; top:${layer.y}px; width:${layer.w}px; height:${layer.h}px; z-index:${index};">${svgContent}</div>`;
      }
      return "";
    })
    .join("\n");
}

/**
 * Renders a single photo slot container and inner img per RENDERER_SPEC §2.
 */
export function renderPhotoSlot(
  slot: PhotoSlot,
  dataUri: string,
  focal?: { x: number; y: number },
  zoom?: number,
  _colorScheme?: TemplateColorScheme
): string {
  const borderColor = tokenToCssVar(slot.border.color);
  const borderStyle = `border:${slot.border.width}px solid ${borderColor};`;

  let shapeStyle = "";
  if (slot.shape === "arch") {
    const halfW = Math.floor(slot.w / 2);
    shapeStyle = `border-top-left-radius:${halfW}px; border-top-right-radius:${halfW}px; border-bottom-left-radius:0; border-bottom-right-radius:0;`;
  } else if (slot.shape === "circle") {
    shapeStyle = "border-radius:50%;";
  } else if (slot.shape === "rounded") {
    shapeStyle = `border-radius:${slot.radius ?? 8}px;`;
  } else if (slot.shape === "rect") {
    shapeStyle = "border-radius:0;";
  }

  const focalX = Math.min(1.0, Math.max(0.0, focal?.x ?? 0.5));
  const focalY = Math.min(1.0, Math.max(0.0, focal?.y ?? 0.3));
  const zoomVal = Math.min(1.6, Math.max(1.0, zoom ?? 1.0));
  const filterStyle = slot.filter ? ` filter: ${slot.filter};` : "";
  const zIndex = 20 + slot.z;

  return `<div id="photo-${slot.id}" class="slot-photo" data-photo-id="${slot.id}" style="position:absolute; left:${slot.x}px; top:${slot.y}px; width:${slot.w}px; height:${slot.h}px; ${shapeStyle} ${borderStyle} z-index:${zIndex}; overflow:hidden;">` +
    `<img src="${dataUri}" style="width:100%; height:100%; object-fit:cover; display:block; object-position:${focalX * 100}% ${focalY * 100}%; transform:scale(${zoomVal}); transform-origin:${focalX * 100}% ${focalY * 100}%;${filterStyle}" alt="ছবি ${slot.id}">` +
    `</div>`;
}

const TIER_ORDER: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

/**
 * Renders a decoration with all its placements if current intensity is sufficient.
 */
export function renderDecoration(
  decoration: Decoration,
  intensity: "low" | "medium" | "high",
  _colorScheme: TemplateColorScheme,
  _template?: TemplateLayoutConfig
): string {
  const currentTier = TIER_ORDER[intensity] ?? 1;
  const minTier = TIER_ORDER[decoration.minIntensity] ?? 1;
  if (currentTier < minTier) {
    return "";
  }

  const svgContent = getTemplateSvg(decoration.asset);
  let zIndex = 40;
  if (decoration.layer === "bg") zIndex = 10;
  else if (decoration.layer === "fg") zIndex = 80;

  return decoration.placements
    .map((p) => {
      let transform = "";
      if (p.flipX && p.flipY) {
        transform = " transform: scale(-1, -1);";
      } else if (p.flipX) {
        transform = " transform: scaleX(-1);";
      } else if (p.flipY) {
        transform = " transform: scaleY(-1);";
      }

      return `<div class="decoration" data-decoration-key="${decoration.key}" style="position:absolute; left:${p.x}px; top:${p.y}px; width:${p.w}px; height:${p.h}px; z-index:${zIndex}; opacity:${decoration.opacity}; pointer-events:none;${transform}">\n` +
        `  ${svgContent}\n` +
        `</div>`;
    })
    .join("\n");
}

/**
 * Renders a single text slot container and inner text span.
 */
export function renderTextSlot(
  slot: TextSlot,
  resolvedText: string,
  _colorScheme: TemplateColorScheme,
  extraAttrs = ""
): string {
  if (slot.source === "subtext" && (!resolvedText || resolvedText.trim() === "")) {
    return "";
  }

  const colorVar = tokenToCssVar(slot.color);
  const justifyContent = slot.valign === "middle" ? "center" : "flex-start";
  const escaped = escapeHtml(resolvedText);

  return `<div id="text-${slot.id}" class="slot-text" data-slot-id="${slot.id}"${extraAttrs} style="position:absolute; left:${slot.x}px; top:${slot.y}px; width:${slot.w}px; height:${slot.h}px; z-index:60; display:flex; flex-direction:column; overflow:hidden; justify-content:${justifyContent}; text-align:${slot.align}; color:${colorVar}; font-family:'${slot.fontFamily}', sans-serif; font-weight:${slot.fontWeight};">` +
    `<span class="text-content">${escaped}</span>` +
    `</div>`;
}

/**
 * Renders the footer rectangle and top rule band (z-index: 50..51).
 */
export function renderFooter(
  footer: TemplateFooter,
  _template: TemplateLayoutConfig,
  _colorScheme: TemplateColorScheme
): string {
  const bg = tokenToCssVar(footer.fill);
  const ruleBg = tokenToCssVar(footer.topRule.color);
  const ruleH = footer.topRule.height;

  return `<div class="slot-footer-bg" style="position:absolute; left:0px; top:700px; width:600px; height:100px; background:${bg}; z-index:50;"></div>\n` +
    `<div class="slot-footer-rule" style="position:absolute; left:0px; top:700px; width:600px; height:${ruleH}px; background:${ruleBg}; z-index:51;"></div>`;
}

/**
 * Wraps head, body, CSS variables, and fontFaceCss into a complete HTML document with CSP meta tag and nonce'd fit script tag.
 */
export function wrapDocument(
  head: string,
  body: string,
  cssVars: string,
  fontFaceCss: string,
  nonce: string
): string {
  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { width: 600px; height: 800px; margin: 0; background: var(--c-background); overflow: hidden; }
    #canvas {
      position: relative; width: 600px; height: 800px; overflow: hidden;
      ${cssVars}
      background-color: var(--c-background);
    }
    .layer-rect { position: absolute; }
    .slot-photo { position: absolute; overflow: hidden; }
    .slot-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .decoration { position: absolute; pointer-events: none; }
    .decoration svg { width: 100%; height: 100%; display: block; }
    .slot-text { position: absolute; display: flex; flex-direction: column; overflow: hidden; }
    .slot-footer-bg { position: absolute; left: 0; top: 700px; width: 600px; height: 100px; z-index: 50; }
    .slot-footer-rule { position: absolute; left: 0; top: 700px; width: 600px; z-index: 51; }
    ${fontFaceCss}
  </style>
  ${head}
</head>
<body>
  ${body}
  <script nonce="${nonce}"></script>
</body>
</html>`;
}
