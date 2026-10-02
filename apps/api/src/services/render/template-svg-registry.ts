import fs from "node:fs";
import path from "node:path";

const svgCache = new Map<string, string>();

/**
 * Resolves the root directory for template assets dynamically across environments (repo root vs workspace cwd).
 */
export function getAssetsRootDir(): string {
  const cwd = process.cwd();
  if (fs.existsSync(path.resolve(cwd, "assets/templates"))) {
    return path.resolve(cwd, "assets/templates");
  }
  if (fs.existsSync(path.resolve(cwd, "apps/api/assets/templates"))) {
    return path.resolve(cwd, "apps/api/assets/templates");
  }
  return path.resolve(cwd, "apps/api/assets/templates");
}

/**
 * Reads an SVG template asset from disk and caches in memory after first read.
 */
export function getTemplateSvg(assetPath: string): string {
  const normalized = assetPath.replace(/^\/+|\\/g, "/");
  if (svgCache.has(normalized)) {
    return svgCache.get(normalized)!;
  }

  const baseDir = getAssetsRootDir();
  const fullPath = path.resolve(baseDir, normalized);

  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, "utf8").trim();
    svgCache.set(normalized, content);
    return content;
  }

  return "";
}

/**
 * Clears the in-memory SVG cache (useful in tests or hot-reloading).
 */
export function clearTemplateSvgCache(): void {
  svgCache.clear();
}
