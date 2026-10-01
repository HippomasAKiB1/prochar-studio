import { describe, it, expect } from "vitest";
import { validateSvgSafety } from "../utils/svg-safety.js";

describe("SVG Safety Validator (Chunk 3.2)", () => {
  it("allows valid basic svg: <svg><path d=\"M0 0\"/></svg> → ok", () => {
    const result = validateSvgSafety('<svg><path d="M0 0"/></svg>');
    expect(result.ok).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it("rejects script element: <svg><script>alert(1)</script></svg> → reasons include 'script'", () => {
    const result = validateSvgSafety("<svg><script>alert(1)</script></svg>");
    expect(result.ok).toBe(false);
    expect(result.reasons.some((r) => r.toLowerCase().includes("script"))).toBe(true);
  });

  it("rejects onload attribute: <svg onload=\"alert(1)\"></svg> → reasons include 'onload'", () => {
    const result = validateSvgSafety('<svg onload="alert(1)"></svg>');
    expect(result.ok).toBe(false);
    expect(result.reasons.some((r) => r.toLowerCase().includes("onload"))).toBe(true);
  });

  it("rejects external use href: <svg><use href=\"http://evil.com/x.svg\"/></svg> → rejected", () => {
    const result = validateSvgSafety('<svg><use href="http://evil.com/x.svg"/></svg>');
    expect(result.ok).toBe(false);
    expect(result.reasons.some((r) => r.toLowerCase().includes("href"))).toBe(true);
  });

  it("allows internal use href: <svg><use href=\"#local\"/></svg> → ok", () => {
    const result = validateSvgSafety('<svg><use href="#local"/></svg>');
    expect(result.ok).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it("rejects hardcoded hex color: <svg><path fill=\"#FF0000\"/></svg> → rejected", () => {
    const result = validateSvgSafety('<svg><path fill="#FF0000"/></svg>');
    expect(result.ok).toBe(false);
    expect(result.reasons.some((r) => r.toLowerCase().includes("hex"))).toBe(true);
  });

  it("allows CSS variable colors: <svg><path fill=\"var(--c-primary)\"/></svg> → ok", () => {
    const result = validateSvgSafety('<svg><path fill="var(--c-primary)"/></svg>');
    expect(result.ok).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it("rejects foreignObject element: <svg><foreignObject/></svg> → rejected", () => {
    const result = validateSvgSafety("<svg><foreignObject/></svg>");
    expect(result.ok).toBe(false);
    expect(result.reasons.some((r) => r.toLowerCase().includes("foreignobject"))).toBe(true);
  });

  it("rejects image element: <svg><image href=\"data:...\"/></svg> → rejected", () => {
    const result = validateSvgSafety('<svg><image href="data:image/png;base64,123"/></svg>');
    expect(result.ok).toBe(false);
    expect(
      result.reasons.some((r) => r.toLowerCase().includes("image") || r.toLowerCase().includes("href"))
    ).toBe(true);
  });

  it("validates id prefix against baseName", () => {
    const validWithBase = '<svg><path id="paddy-stalk-1" d="M0 0"/></svg>';
    expect(validateSvgSafety(validWithBase, "paddy").ok).toBe(true);

    const invalidWithBase = '<svg><path id="wrong-prefix-1" d="M0 0"/></svg>';
    const res = validateSvgSafety(invalidWithBase, "paddy");
    expect(res.ok).toBe(false);
    expect(res.reasons.some((r) => r.includes("paddy-"))).toBe(true);
  });
});
