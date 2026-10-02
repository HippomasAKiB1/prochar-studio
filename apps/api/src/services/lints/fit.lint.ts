import sharp from "sharp";
import {
  TemplateLayoutConfig,
  PosterFormData,
  OccasionType,
} from "@prochar/shared";
import { renderPoster } from "../render/render.service.js";
import { getFallbackPlan } from "../ai/layout-plan.js";
import { getTemplateSvg } from "../render/template-svg-registry.js";

/**
 * Stress phrase words per SEED_TEMPLATES §7:
 * "স্বাধীনতা সংগ্রামী শ্রদ্ধাঞ্জলি দ্ধ ক্ষ ক্ষুদ্র "
 */
export const STRESS_WORDS = [
  "স্বাধীনতা",
  "সংগ্রামী",
  "শ্রদ্ধাঞ্জলি",
  "দ্ধ",
  "ক্ষ",
  "ক্ষুদ্র",
];

/**
 * Builds a worst-case stress string for a field by repeatedly appending whole words
 * from the stress phrase while total codepoint count <= maxLen.
 */
export function buildStressString(maxLen: number): string {
  const selected: string[] = [];
  let currentLen = 0;
  let idx = 0;

  while (true) {
    const word = STRESS_WORDS[idx % STRESS_WORDS.length];
    const wordLen = [...word].length;
    const nextLen = currentLen === 0 ? wordLen : currentLen + 1 + wordLen;
    if (nextLen > maxLen) {
      break;
    }
    selected.push(word);
    currentLen = nextLen;
    idx++;
  }

  return selected.join(" ");
}

/**
 * Builds worst-case formData per SEED_TEMPLATES §7 and §2.
 */
export function buildWorstCaseFormData(occasionType: OccasionType): PosterFormData {
  return {
    name: buildStressString(60),
    designation: buildStressString(60),
    partyOrOrganization: buildStressString(80),
    union: buildStressString(40),
    thana: buildStressString(40),
    district: buildStressString(40),
    headline: buildStressString(60),
    subtext: buildStressString(140),
    creditLine: buildStressString(120),
    occasionType,
  };
}

let cachedPlaceholderWebp: Buffer | null = null;

async function getPlaceholderWebp(): Promise<Buffer> {
  if (!cachedPlaceholderWebp) {
    const svgStr = getTemplateSvg("shared/placeholder_person.svg");
    cachedPlaceholderWebp = await sharp(Buffer.from(svgStr))
      .resize(800, 1000)
      .webp()
      .toBuffer();
  }
  return cachedPlaceholderWebp;
}

/**
 * Runs the fit lint (SEED_TEMPLATES §7) on a template by rendering the worst-case strings.
 * Catches and reports TEXT_OVERFLOW_AT_MIN if any non-truncating slot overflows at minFont.
 */
export async function runFitLintForTemplate(
  template: TemplateLayoutConfig,
  slug: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const occasionType: OccasionType =
      slug === "condolence-tribute"
        ? "condolence"
        : slug === "victory-day-classic"
        ? "victory_day"
        : "campaign";

    const formData = buildWorstCaseFormData(occasionType);
    const layoutPlan = getFallbackPlan(slug);
    const photoBuffer = await getPlaceholderWebp();

    await renderPoster({
      template,
      formData,
      layoutPlan,
      photos: [{ buffer: photoBuffer, focal: { x: 0.5, y: 0.3 }, zoom: 1.0 }],
    });

    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}
