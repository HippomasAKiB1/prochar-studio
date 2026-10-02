/**
 * Content blocklist for Prochar Studio.
 * Applied to all text fields before poster creation.
 * FR-M2: matches → 422 CONTENT_REJECTED (reason is generic).
 *
 * The list is intentionally minimal for MVP. Expand via config or DB in a later phase.
 * Terms are stored in lowercase; matching is case-insensitive with NFC normalisation.
 */

// A small set of obvious violence / incitement terms (Bangla + English)
// Add more via environment variable BLOCKLIST_EXTRA (comma-separated) if needed.
const BUILT_IN_TERMS: string[] = [
  // Violence / incitement (Bangla)
  "হত্যা করো",
  "হত্যা কর",
  "খুন করো",
  "খুন কর",
  "জ্বালিয়ে দাও",
  "পুড়িয়ে দাও",
  "বোমা মারো",
  "সন্ত্রাস",
  "জঙ্গি",
  "জিহাদ",
  // Violence / incitement (English)
  "kill",
  "murder",
  "bomb",
  "terrorist",
  "jihad",
  "genocide",
  "massacre",
  "shoot them",
];

function buildList(): string[] {
  const list = [...BUILT_IN_TERMS];

  // Allow optional runtime extension via env (comma-separated)
  const extra = process.env.BLOCKLIST_EXTRA;
  if (extra) {
    extra
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .forEach((t) => list.push(t));
  }

  return list.map((t) => t.normalize("NFC").toLowerCase());
}

const BLOCKLIST = buildList();

/**
 * Checks whether any blocklisted term appears in any of the provided text values.
 * @param texts - array of string values to check (undefined/empty strings are skipped)
 * @returns true if at least one match is found
 */
export function containsBlocklistedContent(texts: (string | undefined | null)[]): boolean {
  const normalised = texts
    .filter((t): t is string => typeof t === "string" && t.length > 0)
    .map((t) => t.normalize("NFC").toLowerCase());

  for (const text of normalised) {
    for (const term of BLOCKLIST) {
      if (text.includes(term)) {
        return true;
      }
    }
  }
  return false;
}
