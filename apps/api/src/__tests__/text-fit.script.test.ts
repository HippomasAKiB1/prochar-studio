import { describe, it, expect } from "vitest";
import { TEXT_FIT_SCRIPT } from "../services/render/text-fit.script.js";

describe("Text-fit Script (Chunk 4.3)", () => {
  it("is syntactically valid JavaScript (new Function does not throw)", () => {
    expect(() => {
      // Compiles the script string as JavaScript function body
      new Function(TEXT_FIT_SCRIPT);
    }).not.toThrow();
  });

  it("contains Range API line counting logic (countLines and getClientRects)", () => {
    expect(TEXT_FIT_SCRIPT).toContain("countLines");
    expect(TEXT_FIT_SCRIPT).toContain("getClientRects");
  });

  it("does not use scrollHeight line height division approximation", () => {
    expect(TEXT_FIT_SCRIPT).not.toContain("scrollHeight / ");
  });

  it("defines window.__fitText", () => {
    expect(TEXT_FIT_SCRIPT).toContain("window.__fitText = function");
  });

  it("does NOT contain webkitLineClamp inside testFit function body", () => {
    const testFitBodyMatch = TEXT_FIT_SCRIPT.match(/function testFit\(fontSize\)\s*\{([\s\S]*?)\}/);
    expect(testFitBodyMatch).not.toBeNull();
    expect(testFitBodyMatch![1]).not.toContain("webkitLineClamp");
  });

  it("DOES contain webkitLineClamp in the truncate fallback path", () => {
    const truncateSection = TEXT_FIT_SCRIPT.slice(TEXT_FIT_SCRIPT.indexOf("usedTruncate: true") - 300);
    expect(truncateSection).toContain("webkitLineClamp");
  });
});
