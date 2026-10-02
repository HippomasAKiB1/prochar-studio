import fs from "node:fs";
import path from "node:path";

const svgCache = new Map<string, string>();

/**
 * Resolves the root directory for template assets using module-relative resolution.
 * Does not depend on process.cwd().
 */
export function getAssetsRootDir(): string {
  const directPath = path.resolve(__dirname, "../../../assets/templates");
  if (fs.existsSync(directPath)) {
    return directPath;
  }

  // Walk up to locate assets/templates if directory nesting varies
  let curr = __dirname;
  for (let i = 0; i < 6; i++) {
    const candidate = path.resolve(curr, "assets/templates");
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    const candidateApi = path.resolve(curr, "apps/api/assets/templates");
    if (fs.existsSync(candidateApi)) {
      return candidateApi;
    }
    const parent = path.dirname(curr);
    if (parent === curr) break;
    curr = parent;
  }

  return directPath;
}

/**
 * Reads an SVG template asset from disk and caches in memory after first read.
 * Throws SVG_ASSET_MISSING if the file cannot be found.
 */
export function getTemplateSvg(assetPath: string): string {
  const normalized = assetPath.replace(/^\/+|\\/g, "/");
  if (svgCache.has(normalized)) {
    return svgCache.get(normalized)!;
  }

  const baseDir = getAssetsRootDir();
  const fullPath = path.resolve(baseDir, normalized);

  if (!fs.existsSync(fullPath)) {
    throw new Error(
      `SVG_ASSET_MISSING: ${assetPath} (resolved to ${fullPath})`
    );
  }

  const content = fs.readFileSync(fullPath, "utf8").trim();
  svgCache.set(normalized, content);
  return content;
}

/**
 * Clears the in-memory SVG cache (useful in tests or hot-reloading).
 */
export function clearTemplateSvgCache(): void {
  svgCache.clear();
}
