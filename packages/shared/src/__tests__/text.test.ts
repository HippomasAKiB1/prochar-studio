import { describe, it, expect } from "vitest";
import { escapeHtml, normalizeNfc } from "../utils/text.js";

describe("Text & HTML Escape Utilities (Chunk 4.2)", () => {
  it("escapes special HTML characters properly: <script>alert(\"x\")</script>", () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;&#x2F;script&gt;"
    );
  });

  it("preserves pure Bangla text unchanged without false positives: প্রচার", () => {
    expect(escapeHtml("প্রচার")).toBe("প্রচার");
  });

  it("escapes ampersands once without double-escape assumption: &amp; -> &amp;amp;", () => {
    expect(escapeHtml("&amp;")).toBe("&amp;amp;");
  });

  it("preserves Bangla conjuncts verbatim: ক্ষ দ্ধ শ্রদ্ধাঞ্জলি", () => {
    const conjuncts = "ক্ষ দ্ধ শ্রদ্ধাঞ্জলি";
    expect(escapeHtml(conjuncts)).toBe(conjuncts);
  });

  it("strips Unicode control characters: a\\u0007b -> ab", () => {
    expect(escapeHtml("a\u0007b")).toBe("ab");
    expect(escapeHtml("\u0000Hello\u001F World\u007F")).toBe("Hello World");
  });

  it("normalizes decomposed Unicode to NFC via normalizeNfc", () => {
    // "e" + combining acute accent -> "é"
    const decomposed = "e\u0301";
    const composed = "é";
    expect(normalizeNfc(decomposed)).toBe(composed);
    expect(normalizeNfc("প্রচার")).toBe("প্রচার");
  });
});
