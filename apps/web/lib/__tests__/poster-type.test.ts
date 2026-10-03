import { describe, it, expect } from "vitest";
import {
  PosterDetailResponse,
  PosterDetailResponseSchema,
  RegeneratePosterRequest,
  RegeneratePosterRequestSchema,
} from "@prochar/shared";
import type { PosterDetail } from "@/app/posters/[id]/client";

describe("Poster Type Alignment (PRD Phase 5 Schema)", () => {
  it("aligns client-side PosterDetail with shared PosterDetailResponse schema", () => {
    const fixture: PosterDetailResponse = {
      id: "507f1f77bcf86cd799439011",
      status: "completed",
      stage: "done",
      generatedImageUrl: "/api/storage/outputs/test-job.png",
      formData: {
        name: "কাজী নজরুল ইসলাম",
        designation: "জাতীয় কবি",
        partyOrOrganization: "বাংলাদেশ সাহিত্য পরিষদ",
        union: "ওয়ার্ড নং ১",
        thana: "ধানমন্ডি",
        district: "ঢাকা",
        occasionType: "campaign",
        headline: "বিদ্রোহী সুরের মূর্ছনায় জাগরণ",
        subtext: "বিশেষ স্মরণানুষ্ঠান",
        creditLine: "প্রচারে: সাহিত্য অনুরাগী সমাজ",
      },
      retriesLeft: 2,
      aiAssisted: true,
      error: undefined,
    };

    // Client PosterDetail must accept the shared PosterDetailResponse without casting
    const clientPoster: PosterDetail = fixture;
    expect(clientPoster.id).toBe("507f1f77bcf86cd799439011");
    expect(clientPoster.formData.headline).toBe("বিদ্রোহী সুরের মূর্ছনায় জাগরণ");

    // Runtime validation with zod schema
    const parsed = PosterDetailResponseSchema.parse(fixture);
    expect(parsed.status).toBe("completed");
    expect(parsed.formData.district).toBe("ঢাকা");
  });

  it("validates RegeneratePosterRequest schema for retry and reprint mutations", () => {
    // Empty body for retry-after-failure
    const emptyRetry: RegeneratePosterRequest = {};
    const parsedEmpty = RegeneratePosterRequestSchema.parse(emptyRetry);
    expect(parsedEmpty.formData).toBeUndefined();

    // Partial formData for edit-copy reprint
    const reprintRequest: RegeneratePosterRequest = {
      formData: {
        headline: "সংশোধিত নতুন শিরোনাম",
        subtext: "আপডেট বার্তা",
      },
    };
    const parsedReprint = RegeneratePosterRequestSchema.parse(reprintRequest);
    expect(parsedReprint.formData?.headline).toBe("সংশোধিত নতুন শিরোনাম");
  });
});
