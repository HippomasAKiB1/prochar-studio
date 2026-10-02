const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "/": "&#x2F;",
};

/**
 * NFC Unicode normalization.
 */
export function normalizeNfc(input: string): string {
  if (!input) return "";
  return input.normalize("NFC");
}

/**
 * NFC Unicode normalization and stripping of control characters (\u0000-\u001F, \u007F-\u009F).
 */
export function normalizeAndSanitizeText(input: string): string {
  if (!input) return "";
  const normalized = normalizeNfc(input);
  return normalized.replace(/[\u0000-\u001F\u007F-\u009F]/g, "").trim();
}

/**
 * Deterministic HTML escaping for safe DOM text node injection (RENDERER_SPEC §5).
 * - Normalizes to NFC
 * - Strips Unicode control chars (\u0000-\u001F, \u007F-\u009F)
 * - Escapes: & < > " ' /
 * - Preserves Bangla conjuncts and characters safely
 */
export function escapeHtml(input: string): string {
  if (!input) return "";
  const normalized = normalizeNfc(input);
  const stripped = normalized.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
  return stripped.replace(/[&<>"'/]/g, (char) => ESCAPE_MAP[char] || char);
}
