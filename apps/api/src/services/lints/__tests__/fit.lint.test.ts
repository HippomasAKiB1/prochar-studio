import { describe, it, expect } from "vitest";
import {
  buildStressString,
  buildWorstCaseFormData,
  STRESS_WORDS,
} from "../fit.lint.js";

describe("Fit Lint & Worst-Case String Builder (Chunk 4.15)", () => {
  it("builds stress string within field max length for all field types", () => {
    const limits = [
      { name: "headline", max: 60 },
      { name: "subtext", max: 140 },
      { name: "name", max: 60 },
      { name: "designation", max: 60 },
      { name: "partyOrOrganization", max: 80 },
      { name: "union", max: 40 },
      { name: "thana", max: 40 },
      { name: "district", max: 40 },
      { name: "creditLine", max: 120 },
    ];

    for (const field of limits) {
      const str = buildStressString(field.max);
      const codepointCount = [...str].length;
      expect(codepointCount).toBeGreaterThan(0);
      expect(codepointCount).toBeLessThanOrEqual(field.max);

      // Verify that the string only contains words from STRESS_WORDS
      const wordsInResult = str.split(" ");
      for (const w of wordsInResult) {
        expect(STRESS_WORDS).toContain(w);
      }
    }
  });

  it("builds complete worst-case formData for an occasion", () => {
    const formData = buildWorstCaseFormData("victory_day");
    expect(formData.occasionType).toBe("victory_day");
    expect([...formData.name].length).toBeLessThanOrEqual(60);
    expect([...formData.designation].length).toBeLessThanOrEqual(60);
    expect([...formData.partyOrOrganization].length).toBeLessThanOrEqual(80);
    expect([...(formData.union || "")].length).toBeLessThanOrEqual(40);
    expect([...(formData.thana || "")].length).toBeLessThanOrEqual(40);
    expect([...formData.district].length).toBeLessThanOrEqual(40);
    expect([...formData.headline].length).toBeLessThanOrEqual(60);
    expect([...(formData.subtext || "")].length).toBeLessThanOrEqual(140);
    expect([...(formData.creditLine || "")].length).toBeLessThanOrEqual(120);
  });
});
