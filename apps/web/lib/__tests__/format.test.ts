import { describe, it, expect } from "vitest";
import { toBanglaNumber } from "../format";

describe("toBanglaNumber", () => {
  it("maps 0-9 to Bangla digits", () => {
    expect(toBanglaNumber("0123456789")).toBe("০১২৩৪৫৬৭৮৯");
  });
  it("accepts numbers and leaves other characters", () => {
    expect(toBanglaNumber(42)).toBe("৪২");
    expect(toBanglaNumber("№ 2")).toBe("№ ২");
  });
});
