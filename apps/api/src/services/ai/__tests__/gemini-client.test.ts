import { describe, it, expect } from "vitest";
import { GeminiError } from "../gemini-client.js";

describe("Gemini Client Wrapper (Chunk 4.10)", () => {
  it("creates GeminiError with code and message", () => {
    const err = new GeminiError("TIMEOUT", "Request timed out", "detail info");
    expect(err.name).toBe("GeminiError");
    expect(err.code).toBe("TIMEOUT");
    expect(err.message).toBe("Request timed out");
    expect(err.detail).toBe("detail info");
  });

  it("defaults message to code when not provided", () => {
    const err = new GeminiError("SAFETY_BLOCK");
    expect(err.code).toBe("SAFETY_BLOCK");
    expect(err.message).toBe("SAFETY_BLOCK");
  });
});
