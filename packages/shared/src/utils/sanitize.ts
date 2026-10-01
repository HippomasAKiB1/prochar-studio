const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "/": "&#x2F;",
};

/**
 * NFC Unicode normalization and stripping of control characters.
 */
export function normalizeAndSanitizeText(input: string): string {
  if (!input) return "";
  const normalized = input.normalize("NFC");
  return normalized.replace(/[\u0000-\u001F\u007F-\u009F]/g, "").trim();
}

/**
 * Deterministic HTML escaping for safe DOM text node injection (RENDERER_SPEC §5).
 */
export function escapeHtml(input: string): string {
  if (!input) return "";
  const sanitized = normalizeAndSanitizeText(input);
  return sanitized.replace(/[&<>"'/]/g, (char) => ESCAPE_MAP[char] || char);
}
