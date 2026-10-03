import { z } from "zod";
import { OccasionTypeEnum } from "./template.js";
import { normalizeAndSanitizeText } from "../utils/sanitize.js";

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export const PhotoItemSchema = z.object({
  url: z
    .string()
    .refine(
      (val) =>
        (val.startsWith("/api/storage/") && !val.includes("..")) ||
        /^https:\/\/res\.cloudinary\.com\//i.test(val),
      { message: "ছবির সঠিক URL আবশ্যক" }
    ),
  publicId: z.string().min(1, { message: "ছবির publicId আবশ্যক" }),
});

export type PhotoItem = z.infer<typeof PhotoItemSchema>;

export const PosterFormDataSchema = z.object({
  name: z
    .string()
    .transform(normalizeAndSanitizeText)
    .pipe(
      z
        .string()
        .min(2, { message: "নাম অন্তত ২ অক্ষরের হতে হবে" })
        .max(60, { message: "নাম সর্বোচ্চ ৬০ অক্ষরের হতে পারে" })
    ),
  designation: z
    .string()
    .transform(normalizeAndSanitizeText)
    .pipe(
      z
        .string()
        .min(2, { message: "পদবি অন্তত ২ অক্ষরের হতে হবে" })
        .max(60, { message: "পদবি সর্বোচ্চ ৬০ অক্ষরের হতে পারে" })
    ),
  partyOrOrganization: z
    .string()
    .transform(normalizeAndSanitizeText)
    .pipe(
      z
        .string()
        .min(2, { message: "দল বা সংগঠনের নাম অন্তত ২ অক্ষরের হতে হবে" })
        .max(80, { message: "দল বা সংগঠনের নাম সর্বোচ্চ ৮০ অক্ষরের হতে পারে" })
    ),
  union: z
    .string()
    .transform(normalizeAndSanitizeText)
    .pipe(z.string().max(40, { message: "ইউনিয়ন সর্বোচ্চ ৪০ অক্ষরের হতে পারে" }))
    .optional()
    .or(z.literal("")),
  thana: z
    .string()
    .transform(normalizeAndSanitizeText)
    .pipe(z.string().max(40, { message: "থানা সর্বোচ্চ ৪০ অক্ষরের হতে পারে" }))
    .optional()
    .or(z.literal("")),
  district: z
    .string()
    .transform(normalizeAndSanitizeText)
    .pipe(
      z
        .string()
        .min(2, { message: "জেলার নাম অন্তত ২ অক্ষরের হতে হবে" })
        .max(40, { message: "জেলার নাম সর্বোচ্চ ৪০ অক্ষরের হতে পারে" })
    ),
  occasionType: OccasionTypeEnum,
  headline: z
    .string()
    .transform(normalizeAndSanitizeText)
    .pipe(
      z
        .string()
        .min(2, { message: "শিরোনাম অন্তত ২ অক্ষরের হতে হবে" })
        .max(60, { message: "শিরোনাম সর্বোচ্চ ৬০ অক্ষরের হতে পারে" })
    ),
  subtext: z
    .string()
    .transform(normalizeAndSanitizeText)
    .pipe(z.string().max(140, { message: "সংক্ষিপ্ত বার্তা সর্বোচ্চ ১৪০ অক্ষরের হতে পারে" }))
    .optional()
    .or(z.literal("")),
  creditLine: z
    .string()
    .transform(normalizeAndSanitizeText)
    .pipe(z.string().max(120, { message: "প্রচারে লাইন সর্বোচ্চ ১২০ অক্ষরের হতে পারে" }))
    .optional()
    .or(z.literal("")),
});

export type PosterFormData = z.infer<typeof PosterFormDataSchema>;

export const CreatePosterRequestSchema = z.object({
  templateId: z.string().regex(OBJECT_ID_REGEX, { message: "সঠিক টেমপ্লেট আইডি প্রদান করুন" }),
  formData: PosterFormDataSchema,
  photos: z
    .array(PhotoItemSchema)
    .min(1, { message: "অন্তত ১টি ছবি আপলোড করতে হবে" })
    .max(3, { message: "সর্বোচ্চ ৩টি ছবি আপলোড করা যাবে" }),
  consent: z.literal(true, {
    message: "ছবি ও চিহ্ন ব্যবহারের অনুমতি স্বীকার করতে হবে",
  }),
});

export type CreatePosterRequest = z.infer<typeof CreatePosterRequestSchema>;

export const RegeneratePosterRequestSchema = z.object({
  formData: PosterFormDataSchema.partial().optional(),
  photoOrder: z.array(z.number().int().min(0).max(2)).max(3).optional(),
});

export type RegeneratePosterRequest = z.infer<typeof RegeneratePosterRequestSchema>;
