import { describe, it, expect, vi } from "vitest";
import { validateEnv } from "../config/env.js";

describe("Environment Validation", () => {
  it("fails fast and logs missing key name when JWT_SECRET is too short", () => {
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

    expect(() =>
      validateEnv({
        JWT_SECRET: "too_short",
      })
    ).toThrowError(/Invalid environment configuration keys/);

    expect(stderrSpy).toHaveBeenCalled();
    const loggedMessage = stderrSpy.mock.calls[0][0] as string;
    expect(loggedMessage).toContain("JWT_SECRET");
    expect(loggedMessage).not.toContain("too_short"); // Never logs the secret value

    stderrSpy.mockRestore();
  });

  it("validates successfully with compliant configuration", () => {
    const valid = validateEnv({
      JWT_SECRET: "secure_random_jwt_secret_min_32_characters_long",
      PORT: 9090,
      NODE_ENV: "test",
    });

    expect(valid.PORT).toBe(9090);
    expect(valid.NODE_ENV).toBe("test");
  });

  it("fails fast when AI_PROVIDER is gemini and GEMINI_API_KEY is missing", () => {
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

    expect(() =>
      validateEnv({
        JWT_SECRET: "secure_random_jwt_secret_min_32_characters_long",
        AI_PROVIDER: "gemini",
        GEMINI_API_KEY: "",
      })
    ).toThrowError(/GEMINI_API_KEY/);

    stderrSpy.mockRestore();
  });

  it("passes when AI_PROVIDER is mock and GEMINI_API_KEY is empty", () => {
    const valid = validateEnv({
      JWT_SECRET: "secure_random_jwt_secret_min_32_characters_long",
      AI_PROVIDER: "mock",
      GEMINI_API_KEY: "",
    });

    expect(valid.AI_PROVIDER).toBe("mock");
  });
});
