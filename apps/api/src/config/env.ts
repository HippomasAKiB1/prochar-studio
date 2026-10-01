import dotenv from "dotenv";
import { z } from "zod";

// Load .env file if available
dotenv.config();

export const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(8080),
  LOG_LEVEL: z.string().default("info"),

  // Database
  MONGODB_URI: z.string().default("mongodb://localhost:27017/prochar-studio"),

  // Authentication
  JWT_SECRET: z
    .string()
    .min(32, { message: "JWT_SECRET must be at least 32 characters long" })
    .default("temporary_fallback_secret_min_32_characters_long_for_dev"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  COOKIE_DOMAIN: z.string().optional().default(""),
  CLIENT_ORIGIN: z.string().default("http://localhost:3000"),

  // Demo account
  DEMO_PASSWORD: z.string().default("ProcharDemo2026!"),

  // AI Integration
  AI_PROVIDER: z.enum(["gemini", "mock"]).default("mock"),
  GEMINI_API_KEY: z.string().optional().default(""),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  GEMINI_TIMEOUT_MS: z.coerce.number().default(20000),

  // Storage
  STORAGE_PROVIDER: z.enum(["cloudinary", "local"]).default("local"),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(""),
  CLOUDINARY_API_KEY: z.string().optional().default(""),
  CLOUDINARY_API_SECRET: z.string().optional().default(""),

  // Rate limits
  MAX_REGENERATIONS: z.coerce.number().default(3),
  GEN_RATE_PER_MIN: z.coerce.number().default(5),
  GEN_RATE_PER_DAY: z.coerce.number().default(30),

  // Puppeteer
  PUPPETEER_EXECUTABLE_PATH: z.string().optional().default(""),
});

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(rawEnv: Record<string, unknown> = process.env): Env {
  const result = EnvSchema.safeParse(rawEnv);
  if (!result.success) {
    const missingKeys = result.error.issues.map((issue) => issue.path.join("."));
    // Fail fast: Log missing/invalid key names ONLY; never log secret values
    process.stderr.write(
      `[FATAL] Invalid or missing environment configuration keys: ${missingKeys.join(", ")}\n`
    );
    throw new Error(`Invalid environment configuration keys: ${missingKeys.join(", ")}`);
  }
  return result.data;
}

export const env = validateEnv();
