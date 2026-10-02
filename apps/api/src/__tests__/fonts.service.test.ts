import { describe, it, expect, beforeEach } from "vitest";
import {
  getFontFaceCss,
  clearFontCssCache,
} from "../services/render/fonts.service.js";

describe("Fonts Service (Chunk 4.1)", () => {
  beforeEach(() => {
    clearFontCssCache();
  });

  it("getFontFaceCss([{ family: 'Hind Siliguri', weight: 700 }]) returns valid @font-face CSS with base64 and bengali unicode-range", () => {
    const css = getFontFaceCss([{ family: "Hind Siliguri", weight: 700 }]);

    expect(css).toContain("font-family: 'Hind Siliguri'");
    expect(css).toContain("data:font/woff2;base64,");
    expect(css).toContain("unicode-range:");
    expect(css).toContain("bengali");
    expect(css).toContain("font-weight: 700");
    // Ensure latin-ext was dropped
    expect(css).not.toContain("latin-ext");
  });

  it("same call twice returns identical cached string (reference equal)", () => {
    const req = [{ family: "Hind Siliguri", weight: 700 }];
    const first = getFontFaceCss(req);
    const second = getFontFaceCss(req);

    expect(first).toBe(second);
  });

  it("requesting 4 different weights returns blocks for all 4 weights", () => {
    const req = [
      { family: "Hind Siliguri", weight: 400 },
      { family: "Hind Siliguri", weight: 500 },
      { family: "Hind Siliguri", weight: 600 },
      { family: "Hind Siliguri", weight: 700 },
    ];
    const css = getFontFaceCss(req);

    expect(css).toContain("font-weight: 400");
    expect(css).toContain("font-weight: 500");
    expect(css).toContain("font-weight: 600");
    expect(css).toContain("font-weight: 700");
  });

  it("requesting an unsupported weight (e.g. Tiro Bangla 700) throws FONT_ASSET_MISSING", () => {
    expect(() =>
      getFontFaceCss([{ family: "Tiro Bangla", weight: 700 }])
    ).toThrow(/FONT_ASSET_MISSING: Tiro Bangla 700/);
  });

  it("verifies total base64 payload for a single family across all weights is under 2 MB", () => {
    // Test Hind Siliguri with all its 4 weights
    const req = [
      { family: "Hind Siliguri", weight: 400 },
      { family: "Hind Siliguri", weight: 500 },
      { family: "Hind Siliguri", weight: 600 },
      { family: "Hind Siliguri", weight: 700 },
    ];
    const css = getFontFaceCss(req);
    const byteSize = Buffer.byteLength(css, "utf8");

    // Must be under 2 MB (2 * 1024 * 1024 bytes)
    expect(byteSize).toBeLessThan(2 * 1024 * 1024);
  });
});
