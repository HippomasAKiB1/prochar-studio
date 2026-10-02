import fs from "fs";
import path from "path";

export interface FontFamilyRequest {
  family: string;
  weight: number;
}

const FAMILY_MAP: Record<string, string> = {
  "Hind Siliguri": "hind-siliguri",
  "Noto Sans Bengali": "noto-sans-bengali",
  "Noto Serif Bengali": "noto-serif-bengali",
  "Tiro Bangla": "tiro-bangla",
};

// In-memory cache for generated @font-face CSS
const fontCssCache = new Map<string, string>();

/**
 * Finds the directory path for an installed @fontsource package.
 */
function resolveFontsourcePackageDir(packageId: string): string {
  const possiblePaths = [
    path.resolve(process.cwd(), "node_modules/@fontsource", packageId),
    path.resolve(process.cwd(), "apps/api/node_modules/@fontsource", packageId),
    path.resolve(process.cwd(), "../../node_modules/@fontsource", packageId),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  // Fallback to the first path if none exist (will trigger FONT_ASSET_MISSING on file read)
  return possiblePaths[0];
}

/**
 * Generates concatenated, base64-inlined @font-face CSS blocks for requested fonts.
 * Caches the result in memory per unique set of (family, weight) requests.
 */
export function getFontFaceCss(families: FontFamilyRequest[]): string {
  if (!families || families.length === 0) {
    return "";
  }

  // Create deterministic cache key (sorted)
  const cacheKey = [...families]
    .map((f) => `${f.family}:${f.weight}`)
    .sort()
    .join(",");

  const cached = fontCssCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const generatedBlocks: string[] = [];

  for (const { family, weight } of families) {
    const packageId = FAMILY_MAP[family];
    if (!packageId) {
      throw new Error(`FONT_ASSET_MISSING: ${family} ${weight} (unknown font family '${family}')`);
    }

    const packageDir = resolveFontsourcePackageDir(packageId);
    const cssPath = path.join(packageDir, `${weight}.css`);

    if (!fs.existsSync(cssPath)) {
      throw new Error(`FONT_ASSET_MISSING: ${family} ${weight} ${cssPath}`);
    }

    const cssContent = fs.readFileSync(cssPath, "utf8");

    // Match blocks with their preceding comments:
    // e.g. /* hind-siliguri-bengali-700-normal */ \n @font-face { ... }
    const blockRegex = /(\/\*[^*]*\*\/)\s*(@font-face\s*\{[^}]+\})/gi;
    let match: RegExpExecArray | null;

    while ((match = blockRegex.exec(cssContent)) !== null) {
      const comment = match[1];
      let blockBody = match[2];

      const isBengali = /bengali/i.test(comment);
      const isLatin = /latin/i.test(comment) && !/latin-ext/i.test(comment);

      // Keep only bengali and latin subsets
      if (!isBengali && !isLatin) {
        continue;
      }

      // Extract woff2 filename
      // e.g. src: url(./files/hind-siliguri-bengali-700-normal.woff2) format('woff2')
      const woff2Match = blockBody.match(/url\(["']?\.\/files\/([^"')]+?\.woff2)["']?\)/i);
      if (!woff2Match) {
        throw new Error(
          `FONT_ASSET_MISSING: ${family} ${weight} (could not extract woff2 url from ${cssPath})`
        );
      }

      const woff2FileName = woff2Match[1];
      const woff2Path = path.join(packageDir, "files", woff2FileName);

      if (!fs.existsSync(woff2Path)) {
        throw new Error(`FONT_ASSET_MISSING: ${family} ${weight} ${woff2Path}`);
      }

      const woff2Base64 = fs.readFileSync(woff2Path).toString("base64");

      // Rewrite src: property to base64 data URI while preserving unicode-range and font-display
      blockBody = blockBody.replace(
        /src:\s*[^;]+;/i,
        `src: url("data:font/woff2;base64,${woff2Base64}") format("woff2");`
      );

      generatedBlocks.push(`${comment}\n${blockBody}`);
    }
  }

  const finalCss = generatedBlocks.join("\n\n");
  fontCssCache.set(cacheKey, finalCss);
  return finalCss;
}

/**
 * Resets the in-memory font cache (primarily for unit test isolation).
 */
export function clearFontCssCache(): void {
  fontCssCache.clear();
}
