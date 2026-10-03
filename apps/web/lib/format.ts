const DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

const BANGLA_MONTHS = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"
];

/** Map ASCII digits 0-9 to Bangla ০-৯. For UI numerals only, never for API data. */
export function toBanglaNumber(n: number | string): string {
  return String(n).replace(/[0-9]/g, (d) => DIGITS[Number(d)]);
}

/** Formats a date into Bangla: '৩ অক্টোবর ২০২৬' */
export function formatBanglaDate(dateInput: string | Date): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  const day = toBanglaNumber(d.getDate());
  const month = BANGLA_MONTHS[d.getMonth()];
  const year = toBanglaNumber(d.getFullYear());
  return `${day} ${month} ${year}`;
}

