import fs from "fs";
import path from "path";
import { TemplateLayoutConfig, validateSvgSafety } from "@prochar/shared";

export interface LintResult {
  ok: boolean;
  errors: string[];
}

/**
 * Helper to compute WCAG relative luminance from a 6-digit hex color (#RRGGBB).
 */
export function getRelativeLuminance(hex: string): number {
  const cleanHex = hex.replace(/^#/, "");
  if (cleanHex.length !== 6) {
    throw new Error(`Invalid hex color for luminance calculation: ${hex}`);
  }
  const r8 = parseInt(cleanHex.slice(0, 2), 16) / 255;
  const g8 = parseInt(cleanHex.slice(2, 4), 16) / 255;
  const b8 = parseInt(cleanHex.slice(4, 6), 16) / 255;

  const toLinear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  const rLinear = toLinear(r8);
  const gLinear = toLinear(g8);
  const bLinear = toLinear(b8);

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Helper to compute WCAG contrast ratio between two hex colors.
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getRelativeLuminance(hex1);
  const lum2 = getRelativeLuminance(hex2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * 1. Bounds Lint
 * Every layer, photoSlot, textSlot, and decoration placement must lie within 0..600 × 0..800.
 */
export function lintBounds(config: TemplateLayoutConfig): LintResult {
  const errors: string[] = [];
  const W = config.canvas.width;
  const H = config.canvas.height;

  const checkBounds = (item: { x: number; y: number; w: number; h: number }, desc: string) => {
    if (item.x < 0 || item.y < 0 || item.x + item.w > W || item.y + item.h > H) {
      errors.push(
        `${desc} at (${item.x}, ${item.y}, ${item.w}x${item.h}) extends outside canvas bounds (0..${W} x 0..${H})`
      );
    }
  };

  config.layers.forEach((layer) => checkBounds(layer, `Layer '${layer.id}'`));
  config.photoSlots.forEach((slot) => checkBounds(slot, `PhotoSlot '${slot.id}'`));
  config.textSlots.forEach((slot) => checkBounds(slot, `TextSlot '${slot.id}'`));

  config.decorations.forEach((dec) => {
    dec.placements.forEach((placement, idx) => {
      checkBounds(placement, `Decoration '${dec.key}' placement #${idx + 1}`);
    });
  });

  return { ok: errors.length === 0, errors };
}

/**
 * 2. No Overlap Lint
 * For each photo count (1/2/3), the assigned photo slots do not overlap each other.
 */
export function lintNoOverlap(config: TemplateLayoutConfig): LintResult {
  const errors: string[] = [];
  const slotMap = new Map(config.photoSlots.map((s) => [s.id, s]));

  const counts: Array<"1" | "2" | "3"> = ["1", "2", "3"];
  for (const count of counts) {
    const assignedIds = config.photoAssignment[count] || [];
    for (let i = 0; i < assignedIds.length; i++) {
      for (let j = i + 1; j < assignedIds.length; j++) {
        const idA = assignedIds[i];
        const idB = assignedIds[j];
        const slotA = slotMap.get(idA);
        const slotB = slotMap.get(idB);

        if (slotA && slotB) {
          const overlap = !(
            slotA.x + slotA.w <= slotB.x ||
            slotB.x + slotB.w <= slotA.x ||
            slotA.y + slotA.h <= slotB.y ||
            slotB.y + slotB.h <= slotA.y
          );
          if (overlap) {
            errors.push(
              `Photo count '${count}' has overlapping photo slots: '${idA}' and '${idB}'`
            );
          }
        }
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * 3. Assignment Valid Lint
 * Every id in photoAssignment exists in photoSlots; arrays have length 1/2/3 respectively.
 */
export function lintAssignmentValid(config: TemplateLayoutConfig): LintResult {
  const errors: string[] = [];
  const validSlotIds = new Set(config.photoSlots.map((s) => s.id));

  const expectedLengths: Record<"1" | "2" | "3", number> = { "1": 1, "2": 2, "3": 3 };
  for (const [key, expectedLen] of Object.entries(expectedLengths) as Array<
    ["1" | "2" | "3", number]
  >) {
    const list = config.photoAssignment[key];
    if (!Array.isArray(list)) {
      errors.push(`photoAssignment['${key}'] must be an array`);
      continue;
    }
    if (list.length !== expectedLen) {
      errors.push(
        `photoAssignment['${key}'] must have length ${expectedLen}, got ${list.length}`
      );
    }
    for (const slotId of list) {
      if (!validSlotIds.has(slotId)) {
        errors.push(
          `photoAssignment['${key}'] references unknown photo slot id '${slotId}'`
        );
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * 4. Circle Squares Lint
 * If shape === "circle" then width must equal height (w === h).
 */
export function lintCircleSquares(config: TemplateLayoutConfig): LintResult {
  const errors: string[] = [];
  for (const slot of config.photoSlots) {
    if (slot.shape === "circle" && slot.w !== slot.h) {
      errors.push(
        `PhotoSlot '${slot.id}' has shape 'circle' but w (${slot.w}) !== h (${slot.h})`
      );
    }
  }
  return { ok: errors.length === 0, errors };
}

/**
 * 5. Contrast Lint
 * Default palette passes every contrastPairs entry via WCAG relative luminance.
 */
export function lintContrast(config: TemplateLayoutConfig): LintResult {
  const errors: string[] = [];
  const scheme = config.colorScheme;

  for (const pair of config.contrastPairs) {
    const fgHex = scheme[pair.fg];
    const bgHex = scheme[pair.bg];
    if (!fgHex || !bgHex) {
      errors.push(`Missing color in colorScheme for contrast pair: fg=${pair.fg}, bg=${pair.bg}`);
      continue;
    }

    const ratio = getContrastRatio(fgHex, bgHex);
    // Allow slight floating point tolerance (0.01)
    if (ratio < pair.min - 0.01) {
      errors.push(
        `Contrast pair fg '${pair.fg}' (${fgHex}) on bg '${pair.bg}' (${bgHex}) ratio ${ratio.toFixed(2)} is below minimum required ${pair.min}`
      );
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * 6. Assets Exist & Safe Lint
 * Every asset path exists on disk AND passes SVG safety validator.
 */
export function lintAssetsExistAndSafe(
  config: TemplateLayoutConfig,
  assetsRootDir: string = path.resolve(process.cwd(), "apps/api/assets/templates")
): LintResult {
  const errors: string[] = [];
  const assetPaths = new Set<string>();

  for (const layer of config.layers) {
    if (layer.type === "asset") {
      assetPaths.add(layer.asset);
    }
  }

  for (const dec of config.decorations) {
    assetPaths.add(dec.asset);
  }

  for (const relAsset of assetPaths) {
    const fullPath = path.resolve(assetsRootDir, relAsset);
    if (!fs.existsSync(fullPath)) {
      errors.push(`Asset file '${relAsset}' does not exist on disk at '${fullPath}'`);
      continue;
    }

    try {
      const content = fs.readFileSync(fullPath, "utf8");
      const baseName = path.basename(relAsset, ".svg");
      const safetyResult = validateSvgSafety(content, baseName);
      if (!safetyResult.ok) {
        errors.push(
          `Asset file '${relAsset}' failed SVG safety checks: ${safetyResult.reasons.join("; ")}`
        );
      }
    } catch (err: unknown) {
      errors.push(
        `Failed to read or parse asset '${relAsset}': ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * 7. Decoration Keys Lint
 * aiAllowedDecorations set must equal decorations[].key set.
 */
export function lintDecorationKeys(config: TemplateLayoutConfig): LintResult {
  const errors: string[] = [];
  const allowedSet = new Set(config.aiAllowedDecorations);
  const decorationKeys = new Set(config.decorations.map((d) => d.key));

  for (const key of allowedSet) {
    if (!decorationKeys.has(key)) {
      errors.push(`aiAllowedDecorations contains key '${key}' which is not in decorations[]`);
    }
  }

  for (const key of decorationKeys) {
    if (!allowedSet.has(key)) {
      errors.push(`decorations[] contains key '${key}' which is not in aiAllowedDecorations`);
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * 8. Footer Clear Lint
 * No text slot other than standard footer slots intersects y >= 700.
 */
export function lintFooterClear(config: TemplateLayoutConfig): LintResult {
  const errors: string[] = [];
  const standardFooterIds = new Set(["credit", "designationOrg", "location"]);

  for (const slot of config.textSlots) {
    const isFooterSlot = standardFooterIds.has(slot.id) && slot.y >= 700;
    if (!isFooterSlot) {
      if (slot.y + slot.h > 700) {
        errors.push(
          `Non-footer TextSlot '${slot.id}' intersects footer region y >= 700 (slot y=${slot.y}, h=${slot.h}, bottom=${slot.y + slot.h})`
        );
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

// TODO(#P4-FIT-LINT): Implement stress rendering fit lint using Puppeteer renderer in Phase 4.

/**
 * Runs all 8 pure template geometry, schema, asset, and contrast lints.
 */
export function lintAll(
  config: TemplateLayoutConfig,
  options?: { assetsRootDir?: string }
): LintResult {
  const allErrors: string[] = [];

  const lints = [
    lintBounds(config),
    lintNoOverlap(config),
    lintAssignmentValid(config),
    lintCircleSquares(config),
    lintContrast(config),
    lintAssetsExistAndSafe(config, options?.assetsRootDir),
    lintDecorationKeys(config),
    lintFooterClear(config),
  ];

  for (const res of lints) {
    if (!res.ok) {
      allErrors.push(...res.errors);
    }
  }

  return {
    ok: allErrors.length === 0,
    errors: allErrors,
  };
}
