import type { GoogleGenAI } from "@google/genai" with { "resolution-mode": "import" };
import { env } from "../../config/env.js";

export type GeminiErrorCode =
  | "TIMEOUT"
  | "SAFETY_BLOCK"
  | "INVALID_JSON"
  | "SERVER_ERROR"
  | "RATE_LIMITED";

export class GeminiError extends Error {
  code: GeminiErrorCode;
  detail?: string;

  constructor(code: GeminiErrorCode, message?: string, detail?: string) {
    super(message || code);
    this.name = "GeminiError";
    this.code = code;
    this.detail = detail;
  }
}

let genAiInstance: GoogleGenAI | null = null;

export async function getGenAiClient(): Promise<GoogleGenAI> {
  if (!genAiInstance) {
    if (!env.GEMINI_API_KEY) {
      throw new GeminiError(
        "SERVER_ERROR",
        "GEMINI_API_KEY is not configured",
        "Missing GEMINI_API_KEY"
      );
    }
    const { GoogleGenAI: GenAIClass } = await import("@google/genai");
    genAiInstance = new GenAIClass({ apiKey: env.GEMINI_API_KEY });
  }
  return genAiInstance;
}

export function resetGenAiClient(): void {
  genAiInstance = null;
}

export interface CallGeminiInput {
  systemInstruction: string;
  userPrompt: string;
  photos: Buffer[];
  responseSchema: object;
  timeoutMs: number;
}

/**
 * Calls Gemini with system instruction, user prompt, inline images, and responseSchema.
 * Throws GeminiError on timeout, safety block, invalid JSON, server error, or rate limiting.
 */
export async function callGeminiForLayout(input: {
  systemInstruction: string;
  userPrompt: string;
  photos: Buffer[];
  responseSchema: object;
  timeoutMs: number;
}): Promise<unknown> {
  const client = await getGenAiClient();

  const inlineImages = input.photos.map((buf) => ({
    inlineData: {
      mimeType: "image/webp",
      data: buf.toString("base64"),
    },
  }));

  const contents = [...inlineImages, input.userPrompt];

  let timer: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(
        new GeminiError(
          "TIMEOUT",
          `Gemini request timed out after ${input.timeoutMs}ms`
        )
      );
    }, input.timeoutMs);
  });

  const apiPromise = (async () => {
    try {
      const response = await client.models.generateContent({
        model: env.GEMINI_MODEL,
        contents,
        config: {
          systemInstruction: input.systemInstruction,
          responseMimeType: "application/json",
          responseSchema: input.responseSchema,
        },
      });

      const candidate = response.candidates?.[0];
      if (candidate?.finishReason === "SAFETY") {
        throw new GeminiError(
          "SAFETY_BLOCK",
          "Gemini response blocked by safety filters"
        );
      }

      const text = response.text || candidate?.content?.parts?.[0]?.text;

      if (!text || !text.trim()) {
        throw new GeminiError(
          "INVALID_JSON",
          "Empty response text received from Gemini"
        );
      }

      try {
        return JSON.parse(text);
      } catch (parseErr: unknown) {
        throw new GeminiError(
          "INVALID_JSON",
          "Failed to parse Gemini response as JSON",
          parseErr instanceof Error ? parseErr.message : String(parseErr)
        );
      }
    } catch (err: unknown) {
      if (err instanceof GeminiError) {
        throw err;
      }

      const msg = err instanceof Error ? err.message : String(err);
      const status = (err as { status?: number })?.status;

      if (status === 429 || /429|resource_exhausted|quota/i.test(msg)) {
        throw new GeminiError("RATE_LIMITED", "Gemini API rate limit exceeded", msg);
      }
      if (/safety/i.test(msg)) {
        throw new GeminiError("SAFETY_BLOCK", "Gemini call blocked by safety filter", msg);
      }
      if ((status && status >= 500) || /5\d{2}|internal|unavailable/i.test(msg)) {
        throw new GeminiError("SERVER_ERROR", "Gemini server error", msg);
      }
      throw new GeminiError("SERVER_ERROR", `Gemini request failed: ${msg}`, msg);
    }
  })();

  try {
    return await Promise.race([apiPromise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
