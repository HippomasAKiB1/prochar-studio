const DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

/** Map ASCII digits 0-9 to Bangla ০-৯. For UI numerals only, never for API data. */
export function toBanglaNumber(n: number | string): string {
  return String(n).replace(/[0-9]/g, (d) => DIGITS[Number(d)]);
}
