import { describe, it, expect, afterAll } from "vitest";
import sharp from "sharp";
import { getFontFaceCss } from "../services/render/fonts.service.js";
import {
  renderHtmlToPng,
  closeBrowser,
} from "../services/render/puppeteer.service.js";

describe("Puppeteer Service (Chunk 4.7)", () => {
  afterAll(async () => {
    await closeBrowser();
  });

  it("renders minimal HTML to print-ready 1800x2400 PNG buffer", async () => {
    const fontCss = getFontFaceCss([{ family: "Hind Siliguri", weight: 700 }]);
    const nonce = "TEST_NONCE_12345";

    const minimalHtml = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { width: 600px; height: 800px; margin: 0; background: #FFF8E7; overflow: hidden; }
    .text { font-family: 'Hind Siliguri', sans-serif; font-weight: 700; font-size: 36px; color: #006A4E; }
    ${fontCss}
  </style>
</head>
<body>
  <div class="text">শুভ বিজয় দিবস</div>
  <script nonce="${nonce}"></script>
</body>
</html>`;

    const pngBuffer = await renderHtmlToPng(
      minimalHtml,
      nonce,
      [],
      [{ family: "Hind Siliguri", weight: 700 }]
    );

    // Assert buffer starts with PNG magic bytes (0x89, 'P', 'N', 'G')
    expect(pngBuffer[0]).toBe(0x89);
    expect(pngBuffer[1]).toBe(0x50); // P
    expect(pngBuffer[2]).toBe(0x4e); // N
    expect(pngBuffer[3]).toBe(0x47); // G

    // Assert exact raster dimensions via sharp
    const metadata = await sharp(pngBuffer).metadata();
    expect(metadata.format).toBe("png");
    expect(metadata.width).toBe(1800);
    expect(metadata.height).toBe(2400);
  }, 30000);

  it("throws FONT_CHECK_EMPTY when fontsToCheck is empty or omitted", async () => {
    const nonce = "TEST_NONCE_EMPTY";
    const minimalHtml = `<!DOCTYPE html><html><body><script nonce="${nonce}"></script></body></html>`;
    await expect(renderHtmlToPng(minimalHtml, nonce, [], [])).rejects.toThrow(
      "FONT_CHECK_EMPTY"
    );
  }, 15000);
});
