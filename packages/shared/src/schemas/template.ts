import { z } from "zod";

export const OccasionTypeEnum = z.enum([
  "victory_day",
  "condolence",
  "campaign",
  "greetings",
  "eid_festival",
]);

export type OccasionType = z.infer<typeof OccasionTypeEnum>;

export const OCCASION_LABELS: Record<OccasionType, { bn: string; en: string }> = {
  victory_day: { bn: "বিজয় দিবস", en: "Victory Day" },
  condolence: { bn: "শোক/স্মরণ", en: "Condolence / Tribute" },
  campaign: { bn: "নির্বাচনী প্রচার", en: "Campaign" },
  greetings: { bn: "শুভেচ্ছা", en: "Greetings" },
  eid_festival: { bn: "ঈদ/উৎসব", en: "Eid / Festival" },
};
