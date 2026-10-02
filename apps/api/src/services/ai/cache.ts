import crypto from "node:crypto";
import { AiCache } from "../../models/AiCache.js";
import { PROMPT_VERSION } from "./prompt.js";

export interface CachedSchemeValue {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    textOnPrimary: string;
    textOnLight: string;
  };
  decorations: string[];
  decorationIntensity: "low" | "medium" | "high";
}

/**
 * Derives sha256 AI cache key based on template, occasion, prompt version, and 10-bucket variation seed.
 */
export function getAiCacheKey(params: {
  templateId: string;
  occasionType: string;
  variationSeed: number;
}): string {
  const variationBucket = Math.floor(params.variationSeed / 10);
  const rawKey = `${params.templateId}:${params.occasionType}:${PROMPT_VERSION}:${variationBucket}`;
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

/**
 * Retrieves unexpired cached color and decoration scheme from MongoDB. Returns null on miss.
 */
export async function getCachedScheme(
  key: string
): Promise<CachedSchemeValue | null> {
  const entry = await AiCache.findOne({
    key,
    expiresAt: { $gt: new Date() },
  }).lean();

  if (!entry) return null;
  return entry.value as CachedSchemeValue;
}

/**
 * Stores or updates cached color and decoration scheme in MongoDB with TTL (default 30 days).
 */
export async function setCachedScheme(
  key: string,
  value: CachedSchemeValue,
  ttlDays = 30
): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
  await AiCache.findOneAndUpdate(
    { key },
    { key, value, expiresAt },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );
}
