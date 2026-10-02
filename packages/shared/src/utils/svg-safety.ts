/**
 * SVG Safety Validator for Prochar Studio
 * Enforces strict element allow-list, prohibits external hrefs/scripts/event handlers/styles,
 * rejects hardcoded hex colors (must use var(--c-*) or currentColor), and enforces id prefixing.
 */

export const ALLOWED_SVG_ELEMENTS = new Set([
  "svg",
  "g",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "defs",
  "pattern",
  "clippath",
  "use",
]);

export interface SvgSafetyResult {
  ok: boolean;
  reasons: string[];
}

/**
 * Validates the safety and styling constraints of SVG content.
 * @param svgContent Raw SVG markup string
 * @param baseName Optional base name of the asset file (e.g. "paddy" or "placeholder_person")
 */
export function validateSvgSafety(svgContent: string, baseName?: string): SvgSafetyResult {
  const reasons: string[] = [];

  if (!svgContent || typeof svgContent !== "string") {
    return { ok: false, reasons: ["Empty or invalid SVG content"] };
  }

  // 1. Check for forbidden script or style blocks
  if (/<script\b/i.test(svgContent)) {
    reasons.push("Forbidden <script> element detected");
  }
  if (/<style\b/i.test(svgContent)) {
    reasons.push("Forbidden <style> element detected");
  }
  if (/<foreignobject\b/i.test(svgContent)) {
    reasons.push("Forbidden <foreignObject> element detected");
  }
  if (/<image\b/i.test(svgContent)) {
    reasons.push("Forbidden <image> element detected");
  }

  // 2. Check for event handlers: on* attributes (e.g., onload, onclick, onerror)
  const onEventMatch = svgContent.match(/\b(on[a-zA-Z]+)\s*=/i);
  if (onEventMatch) {
    reasons.push(`Forbidden event handler attribute "${onEventMatch[1]}" detected`);
  }

  // 3. Extract and validate all XML/SVG elements against allow-list
  const elementTagRegex = /<\/?([a-zA-Z0-9:-]+)/g;
  let tagMatch: RegExpExecArray | null;
  while ((tagMatch = elementTagRegex.exec(svgContent)) !== null) {
    const rawTag = tagMatch[1];
    // Strip XML namespace prefix if present (e.g., svg:path -> path)
    const tagName = rawTag.includes(":") ? rawTag.split(":").pop()! : rawTag;
    const lowerTag = tagName.toLowerCase();

    // Skip xml declaration or comments or doctype handled separately
    if (lowerTag.startsWith("?") || lowerTag.startsWith("!")) {
      continue;
    }

    if (!ALLOWED_SVG_ELEMENTS.has(lowerTag)) {
      if (!reasons.some((r) => r.includes(`<${tagName}>`))) {
        reasons.push(`Forbidden element <${tagName}> detected`);
      }
    }
  }

  // 4. Validate href and xlink:href attributes: only internal fragment identifiers "#id" are permitted
  const hrefRegex = /\b(?:href|xlink:href)\s*=\s*["']([^"']*)["']/gi;
  let hrefMatch: RegExpExecArray | null;
  while ((hrefMatch = hrefRegex.exec(svgContent)) !== null) {
    const hrefVal = hrefMatch[1];
    if (!hrefVal.startsWith("#")) {
      reasons.push(
        `Forbidden external or non-fragment href "${hrefVal}" detected; only internal "#id" is allowed`
      );
    }
  }

  // 5. Enforce no hardcoded hex colors (#RGB, #RRGGBB, #RRGGBBAA).
  // Colors must use CSS variables like var(--c-*) or currentColor.
  // Exception: shared/placeholder_person.svg uses concrete hex colors
  // because it is rasterized standalone by sharp (not inlined into Puppeteer HTML).
  if (baseName !== "placeholder_person") {
    const maskedForHexCheck = svgContent
      .replace(/\b(?:href|xlink:href)\s*=\s*["']#[^"']*["']/gi, 'href=""')
      .replace(/url\(\s*#[^)]*\s*\)/gi, "url()");

    const hexColorRegex = /#([0-9A-Fa-f]{8}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{3})\b/g;
    const hexMatch = maskedForHexCheck.match(hexColorRegex);
    if (hexMatch) {
      reasons.push(
        `Forbidden hardcoded hex color(s) detected: ${hexMatch.slice(0, 3).join(", ")}. Colors must use var(--c-*) or currentColor.`
      );
    }
  }

  // 6. Validate id attribute prefix if baseName is provided
  if (baseName) {
    const expectedPrefix = `${baseName}-`;
    const idRegex = /\bid\s*=\s*["']([^"']*)["']/gi;
    let idMatch: RegExpExecArray | null;
    while ((idMatch = idRegex.exec(svgContent)) !== null) {
      const idVal = idMatch[1];
      if (!idVal.startsWith(expectedPrefix)) {
        reasons.push(
          `Element id "${idVal}" does not start with expected prefix "${expectedPrefix}"`
        );
      }
    }
  }

  return {
    ok: reasons.length === 0,
    reasons,
  };
}
