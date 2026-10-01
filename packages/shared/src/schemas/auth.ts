import { z } from "zod";
import { normalizeAndSanitizeText } from "../utils/sanitize.js";

const BD_PHONE_REGEX = /^(?:\+?88)?(01\d{9})$/;

export function normalizeBangladeshiPhone(input: string): string | null {
  const cleaned = input.replace(/[\s-]/g, "");
  const match = cleaned.match(BD_PHONE_REGEX);
  if (!match) return null;
  return `+88${match[1]}`;
}

export const PasswordSchema = z
  .string()
  .min(8, { message: "পাসওয়ার্ড অন্তত ৮ অক্ষরের হতে হবে" })
  .regex(/[A-Za-z]/, { message: "পাসওয়ার্ডে অন্তত একটি অক্ষর থাকতে হবে" })
  .regex(/[0-9]/, { message: "পাসওয়ার্ডে অন্তত একটি সংখ্যা থাকতে হবে" })
  .refine((val) => Buffer.byteLength(val, "utf8") <= 72, {
    message: "পাসওয়ার্ড সর্বোচ্চ ৭২ বাইটের হতে পারে",
  });

export const RegisterSchema = z
  .object({
    name: z
      .string()
      .transform(normalizeAndSanitizeText)
      .pipe(
        z
          .string()
          .min(2, { message: "নাম অন্তত ২ অক্ষরের হতে হবে" })
          .max(60, { message: "নাম সর্বোচ্চ ৬০ অক্ষরের হতে পারে" })
      ),
    email: z
      .string()
      .transform((val) => val.trim().toLowerCase())
      .refine(
        (val) => !val || z.string().email().safeParse(val).success || normalizeBangladeshiPhone(val) !== null,
        { message: "সঠিক ইমেইল ঠিকানা দিন" }
      )
      .optional()
      .or(z.literal("")),
    phone: z
      .string()
      .transform((val) => val.trim())
      .refine((val) => !val || normalizeBangladeshiPhone(val) !== null, {
        message: "সঠিক বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 01712345678)",
      })
      .transform((val) => (val ? normalizeBangladeshiPhone(val)! : undefined))
      .optional(),
    password: PasswordSchema,
  })
  .refine((data) => Boolean(data.email || data.phone), {
    message: "ইমেইল অথবা মোবাইল নম্বর যেকোনো একটি আবশ্যক",
    path: ["email"],
  });

export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  identifier: z
    .string()
    .min(3, { message: "সঠিক ইমেইল বা ফোন নম্বর দিন" })
    .transform((val) => val.trim()),
  password: z
    .string()
    .min(8, { message: "পাসওয়ার্ড অন্তত ৮ অক্ষরের হতে হবে" })
    .max(72, { message: "পাসওয়ার্ড সর্বোচ্চ ৭২ অক্ষরের হতে পারে" }),
});

export type LoginInput = z.infer<typeof LoginSchema>;
