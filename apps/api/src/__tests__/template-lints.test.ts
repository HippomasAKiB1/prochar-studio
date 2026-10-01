import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { TemplateLayoutConfig } from "@prochar/shared";
import {
  lintBounds,
  lintNoOverlap,
  lintAssignmentValid,
  lintCircleSquares,
  lintContrast,
  lintAssetsExistAndSafe,
  lintDecorationKeys,
  lintFooterClear,
  lintAll,
} from "../services/lints/index.js";

const basePassingConfig: TemplateLayoutConfig = {
  schemaVersion: 1,
  canvas: { width: 600, height: 800 },
  layoutFamily: "triple-top",
  colorScheme: {
    background: "#FFFFFF",
    primary: "#000000",
    secondary: "#333333",
    accent: "#666666",
    textOnPrimary: "#FFFFFF",
    textOnLight: "#000000",
  },
  contrastPairs: [
    { fg: "textOnPrimary", bg: "primary", min: 4.5 },
    { fg: "textOnLight", bg: "background", min: 4.5 },
  ],
  layers: [
    { id: "base", type: "rect", x: 0, y: 0, w: 600, h: 800, fill: "$background" },
  ],
  photoSlots: [
    {
      id: "center",
      shape: "arch",
      x: 200,
      y: 50,
      w: 200,
      h: 200,
      z: 4,
      border: { width: 4, color: "$accent" },
    },
    {
      id: "left",
      shape: "circle",
      x: 50,
      y: 50,
      w: 120,
      h: 120,
      z: 3,
      border: { width: 4, color: "$accent" },
    },
    {
      id: "right",
      shape: "circle",
      x: 430,
      y: 50,
      w: 120,
      h: 120,
      z: 3,
      border: { width: 4, color: "$accent" },
    },
  ],
  photoAssignment: {
    "1": ["center"],
    "2": ["left", "right"],
    "3": ["center", "left", "right"],
  },
  textSlots: [
    {
      id: "headline",
      source: "headline",
      x: 50,
      y: 300,
      w: 500,
      h: 100,
      fontFamily: "Hind Siliguri",
      fontWeight: 700,
      minFont: 24,
      maxFont: 64,
      maxLines: 2,
      lineHeight: 1.3,
      align: "center",
      valign: "middle",
      color: "$textOnLight",
    },
    {
      id: "credit",
      source: "credit",
      x: 24,
      y: 706,
      w: 552,
      h: 32,
      fontFamily: "Hind Siliguri",
      fontWeight: 700,
      minFont: 12,
      maxFont: 24,
      maxLines: 1,
      lineHeight: 1.3,
      align: "left",
      valign: "middle",
      color: "$textOnPrimary",
    },
  ],
  footer: {
    preset: "standard-v1",
    fill: "$primary",
    topRule: { height: 4, color: "$accent" },
  },
  decorations: [
    {
      key: "doves",
      asset: "test/doves.svg",
      layer: "mid",
      opacity: 1,
      minIntensity: "low",
      placements: [{ x: 50, y: 500, w: 100, h: 50 }],
    },
  ],
  aiAllowedDecorations: ["doves"],
  maxPhotos: 3,
};

describe("Template Geometry & Integrity Lints (Chunk 3.3)", () => {
  let tempAssetsDir: string;

  beforeAll(() => {
    tempAssetsDir = fs.mkdtempSync(path.join(os.tmpdir(), "prochar-test-assets-"));
    const testSubdir = path.join(tempAssetsDir, "test");
    fs.mkdirSync(testSubdir, { recursive: true });
    fs.writeFileSync(
      path.join(testSubdir, "doves.svg"),
      '<svg><path id="doves-1" d="M0 0" fill="var(--c-primary)"/></svg>',
      "utf8"
    );
  });

  afterAll(() => {
    fs.rmSync(tempAssetsDir, { recursive: true, force: true });
  });

  describe("1. Bounds Lint", () => {
    it("passes when all elements lie within 0..600 x 0..800", () => {
      const res = lintBounds(basePassingConfig);
      expect(res.ok).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it("fails when an element extends beyond canvas bounds", () => {
      const invalid = {
        ...basePassingConfig,
        textSlots: [
          ...basePassingConfig.textSlots,
          {
            id: "overflow-slot",
            source: "subtext" as const,
            x: 50,
            y: 750,
            w: 500,
            h: 100, // y + h = 850 > 800
            fontFamily: "Hind Siliguri" as const,
            fontWeight: 500 as const,
            minFont: 12,
            maxFont: 16,
            maxLines: 2,
            lineHeight: 1.3,
            align: "center" as const,
            valign: "middle" as const,
            color: "$textOnLight" as const,
          },
        ],
      };
      const res = lintBounds(invalid);
      expect(res.ok).toBe(false);
      expect(res.errors.some((e) => e.includes("overflow-slot"))).toBe(true);
    });
  });

  describe("2. No Overlap Lint", () => {
    it("passes when assigned photo slots do not overlap", () => {
      const res = lintNoOverlap(basePassingConfig);
      expect(res.ok).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it("fails when assigned slots for a count overlap", () => {
      const invalid = {
        ...basePassingConfig,
        photoSlots: [
          ...basePassingConfig.photoSlots,
          {
            id: "overlapping-slot",
            shape: "arch" as const,
            x: 55, // overlaps with 'left' (x=50, w=120)
            y: 55,
            w: 120,
            h: 120,
            z: 3,
            border: { width: 4, color: "$accent" as const },
          },
        ],
        photoAssignment: {
          ...basePassingConfig.photoAssignment,
          "2": ["left", "overlapping-slot"],
        },
      };
      const res = lintNoOverlap(invalid);
      expect(res.ok).toBe(false);
      expect(res.errors.some((e) => e.includes("overlapping photo slots"))).toBe(true);
    });
  });

  describe("3. Assignment Valid Lint", () => {
    it("passes when all slot IDs exist and array lengths are 1, 2, 3", () => {
      const res = lintAssignmentValid(basePassingConfig);
      expect(res.ok).toBe(true);
    });

    it("fails when an unknown slot ID is referenced or array length is incorrect", () => {
      const invalid = {
        ...basePassingConfig,
        photoAssignment: {
          "1": ["non-existent-slot"],
          "2": ["left"], // Length should be 2
          "3": ["center", "left", "right"],
        },
      };
      const res = lintAssignmentValid(invalid);
      expect(res.ok).toBe(false);
      expect(res.errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("4. Circle Squares Lint", () => {
    it("passes when circle slots have w === h", () => {
      const res = lintCircleSquares(basePassingConfig);
      expect(res.ok).toBe(true);
    });

    it("fails when circle slot has w !== h", () => {
      const invalid = {
        ...basePassingConfig,
        photoSlots: [
          {
            id: "bad-circle",
            shape: "circle" as const,
            x: 50,
            y: 50,
            w: 100,
            h: 120, // Not square
            z: 3,
            border: { width: 4, color: "$accent" as const },
          },
        ],
      };
      const res = lintCircleSquares(invalid);
      expect(res.ok).toBe(false);
      expect(res.errors.some((e) => e.includes("bad-circle"))).toBe(true);
    });
  });

  describe("5. Contrast Lint", () => {
    it("passes when contrast ratio satisfies min", () => {
      const res = lintContrast(basePassingConfig);
      expect(res.ok).toBe(true);
    });

    it("fails when contrast ratio is below min", () => {
      const invalid = {
        ...basePassingConfig,
        contrastPairs: [
          { fg: "secondary" as const, bg: "primary" as const, min: 7.0 }, // #333333 on #000000 has very low contrast
        ],
      };
      const res = lintContrast(invalid);
      expect(res.ok).toBe(false);
      expect(res.errors.some((e) => e.includes("below minimum required"))).toBe(true);
    });
  });

  describe("6. Assets Exist & Safe Lint", () => {
    it("passes when asset file exists and passes SVG safety", () => {
      const res = lintAssetsExistAndSafe(basePassingConfig, tempAssetsDir);
      expect(res.ok).toBe(true);
    });

    it("fails when asset file is missing or contains unsafe SVG", () => {
      const invalidMissing = {
        ...basePassingConfig,
        decorations: [
          {
            ...basePassingConfig.decorations[0],
            asset: "test/missing-file.svg",
          },
        ],
      };
      const resMissing = lintAssetsExistAndSafe(invalidMissing, tempAssetsDir);
      expect(resMissing.ok).toBe(false);
      expect(resMissing.errors.some((e) => e.includes("does not exist on disk"))).toBe(true);

      // Unsafe SVG
      fs.writeFileSync(
        path.join(tempAssetsDir, "test/unsafe.svg"),
        "<svg><script>alert(1)</script></svg>",
        "utf8"
      );
      const invalidUnsafe = {
        ...basePassingConfig,
        decorations: [
          {
            ...basePassingConfig.decorations[0],
            asset: "test/unsafe.svg",
          },
        ],
      };
      const resUnsafe = lintAssetsExistAndSafe(invalidUnsafe, tempAssetsDir);
      expect(resUnsafe.ok).toBe(false);
      expect(resUnsafe.errors.some((e) => e.includes("failed SVG safety checks"))).toBe(true);
    });
  });

  describe("7. Decoration Keys Lint", () => {
    it("passes when aiAllowedDecorations matches decorations[].key", () => {
      const res = lintDecorationKeys(basePassingConfig);
      expect(res.ok).toBe(true);
    });

    it("fails when aiAllowedDecorations and decorations[].key mismatch", () => {
      const invalid = {
        ...basePassingConfig,
        aiAllowedDecorations: ["doves", "extra_key"],
      };
      const res = lintDecorationKeys(invalid);
      expect(res.ok).toBe(false);
      expect(res.errors.some((e) => e.includes("extra_key"))).toBe(true);
    });
  });

  describe("8. Footer Clear Lint", () => {
    it("passes when non-footer slots do not intersect y >= 700", () => {
      const res = lintFooterClear(basePassingConfig);
      expect(res.ok).toBe(true);
    });

    it("fails when non-footer slot intersects y >= 700", () => {
      const invalid = {
        ...basePassingConfig,
        textSlots: [
          ...basePassingConfig.textSlots,
          {
            id: "encroaching-headline",
            source: "headline" as const,
            x: 50,
            y: 650,
            w: 500,
            h: 60, // 650 + 60 = 710 > 700
            fontFamily: "Hind Siliguri" as const,
            fontWeight: 700 as const,
            minFont: 20,
            maxFont: 40,
            maxLines: 2,
            lineHeight: 1.3,
            align: "center" as const,
            valign: "middle" as const,
            color: "$textOnLight" as const,
          },
        ],
      };
      const res = lintFooterClear(invalid);
      expect(res.ok).toBe(false);
      expect(res.errors.some((e) => e.includes("encroaching-headline"))).toBe(true);
    });
  });

  describe("lintAll aggregate", () => {
    it("returns ok: true when all lints pass", () => {
      const res = lintAll(basePassingConfig, { assetsRootDir: tempAssetsDir });
      expect(res.ok).toBe(true);
      expect(res.errors).toHaveLength(0);
    });
  });
});
