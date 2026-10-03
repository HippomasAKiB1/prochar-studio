import fs from "fs";
import path from "path";
import { logger } from "../../config/logger.js";

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

let fontsRootLogged = false;

/**
 * Resolves the directory of an installed @fontsource package deterministically via Node module
 * resolution (never process.cwd(), which differs between the seed script and the server).
 */
function resolveFontsourcePackageDir(family: string, packageId: string, weight: number): string {
  let cssPath: string;
  try {
    cssPath = require.resolve(`@fontsource/${packageId}/${weight}.css`);
  } catch {
    throw new Error(
      `FONT_ASSET_MISSING: ${family} ${weight} (@fontsource/${packageId}/${weight}.css not resolvable)`
    );
  }
  const dir = path.dirname(cssPath);
  if (!fontsRootLogged) {
    fontsRootLogged = true;
    logger.debug({ fontsRoot: dir }, "fonts root resolved");
  }
  return dir;
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

    const packageDir = resolveFontsourcePackageDir(family, packageId, weight);
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
