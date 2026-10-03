import { describe, it, expect } from "vitest";
import { toBanglaNumber, formatBanglaDate } from "../format";

describe("toBanglaNumber", () => {
  it("maps 0-9 to Bangla digits", () => {
    expect(toBanglaNumber("0123456789")).toBe("০১২৩৪৫৬৭৮৯");
  });
  it("accepts numbers and leaves other characters", () => {
    expect(toBanglaNumber(42)).toBe("৪২");
    expect(toBanglaNumber("№ 2")).toBe("№ ২");
  });
});

describe("formatBanglaDate", () => {
  it("formats date to Bangla format", () => {
    const d = new Date(2026, 9, 3); // Oct 3, 2026
    expect(formatBanglaDate(d)).toBe("৩ অক্টোবর ২০২৬");
  });
  it("returns empty string on invalid date", () => {
    expect(formatBanglaDate("invalid")).toBe("");
  });
});

