import { describe, it, expect } from "vitest";
import {
  RegisterSchema,
  LoginSchema,
  normalizeBangladeshiPhone,
  PosterFormDataSchema,
  CreatePosterRequestSchema,
  RegeneratePosterRequestSchema,
  LayoutPlanSchema,
  escapeHtml,
  normalizeAndSanitizeText,
  assertUserOwnsPublicId,
} from "../index.js";

describe("Authentication Schemas", () => {
  it("normalizes valid Bangladeshi phone numbers correctly (FR-A5: 6 valid, 4+ invalid)", () => {
    // 6 valid inputs
    expect(normalizeBangladeshiPhone("01712345678")).toBe("+8801712345678");
    expect(normalizeBangladeshiPhone("8801812345678")).toBe("+8801812345678");
    expect(normalizeBangladeshiPhone("+8801912345678")).toBe("+8801912345678");
    expect(normalizeBangladeshiPhone("01300000000")).toBe("+8801300000000");
    expect(normalizeBangladeshiPhone("8801500000000")).toBe("+8801500000000");
    expect(normalizeBangladeshiPhone("+8801600000000")).toBe("+8801600000000");

    // 5 invalid inputs
    expect(normalizeBangladeshiPhone("12345")).toBeNull();
    expect(normalizeBangladeshiPhone("0212345678")).toBeNull();
    expect(normalizeBangladeshiPhone("017123456")).toBeNull();
    expect(normalizeBangladeshiPhone("017123456789")).toBeNull();
    expect(normalizeBangladeshiPhone("+880212345678")).toBeNull();
  });

  it("validates correct registration with email", () => {
    const valid = RegisterSchema.safeParse({
      name: "রাফিক আহমেদ",
      email: "rafiq@example.com",
      password: "Password123",
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.name).toBe("রাফিক আহমেদ");
      expect(valid.data.email).toBe("rafiq@example.com");
    }
  });

  it("validates correct registration with phone", () => {
    const valid = RegisterSchema.safeParse({
      name: "করিম মিয়া",
      phone: "01712345678",
      password: "Password123",
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.phone).toBe("+8801712345678");
    }
  });

  it("rejects registration without email or phone", () => {
    const invalid = RegisterSchema.safeParse({
      name: "করিম মিয়া",
      password: "Password123",
    });
    expect(invalid.success).toBe(false);
  });

  it("rejects registration with weak password", () => {
    const invalid = RegisterSchema.safeParse({
      name: "করিম মিয়া",
      email: "karim@example.com",
      password: "short",
    });
    expect(invalid.success).toBe(false);
  });

  it("validates login with valid credentials", () => {
    const valid = LoginSchema.safeParse({
      identifier: "01712345678",
      password: "Password123",
    });
    expect(valid.success).toBe(true);
  });

  it("rejects login with short identifier or password", () => {
    const invalid = LoginSchema.safeParse({
      identifier: "a",
      password: "123",
    });
    expect(invalid.success).toBe(false);
  });
});

describe("Poster Form Schemas", () => {
  const validFormData = {
    name: "নমুনা নাম",
    designation: "সাধারণ সম্পাদক",
    partyOrOrganization: "নমুনা সংগঠন",
    union: "নমুনা ইউনিয়ন",
    thana: "নমুনা থানা",
    district: "নমুনা জেলা",
    occasionType: "victory_day" as const,
    headline: "মহান বিজয় দিবস",
    subtext: "সকলকে বিজয় দিবসের শুভেচ্ছা",
    creditLine: "প্রচারে: নমুনা নাম",
  };

  it("validates correct poster form data", () => {
    const result = PosterFormDataSchema.safeParse(validFormData);
    expect(result.success).toBe(true);
  });

  it("rejects poster form data with headline shorter than 2 chars", () => {
    const result = PosterFormDataSchema.safeParse({
      ...validFormData,
      headline: "ক",
    });
    expect(result.success).toBe(false);
  });

  it("rejects poster form data when district is missing", () => {
    const result = PosterFormDataSchema.safeParse({
      ...validFormData,
      district: "",
    });
    expect(result.success).toBe(false);
  });

  it("validates CreatePosterRequestSchema with photos and consent", () => {
    const result = CreatePosterRequestSchema.safeParse({
      templateId: "507f1f77bcf86cd799439011",
      formData: validFormData,
      photos: [
        { url: "https://res.cloudinary.com/demo/image/upload/sample.jpg", publicId: "sample" },
      ],
      consent: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects CreatePosterRequestSchema if consent is false", () => {
    const result = CreatePosterRequestSchema.safeParse({
      templateId: "507f1f77bcf86cd799439011",
      formData: validFormData,
      photos: [
        { url: "https://res.cloudinary.com/demo/image/upload/sample.jpg", publicId: "sample" },
      ],
      consent: false,
    });
    expect(result.success).toBe(false);
  });

  it("rejects CreatePosterRequestSchema with empty photos array", () => {
    const result = CreatePosterRequestSchema.safeParse({
      templateId: "507f1f77bcf86cd799439011",
      formData: validFormData,
      photos: [],
      consent: true,
    });
    expect(result.success).toBe(false);
  });

  it("validates RegeneratePosterRequestSchema with partial form data", () => {
    const result = RegeneratePosterRequestSchema.safeParse({
      formData: {
        headline: "নতুন শিরোনাম",
      },
      photoOrder: [1, 0],
    });
    expect(result.success).toBe(true);
  });
});

describe("Layout Plan Schema", () => {
  const validPlan = {
    photos: [{ index: 0, focal: { x: 0.5, y: 0.3 }, zoom: 1.2 }],
    colors: {
      primary: "#006A4E",
      secondary: "#D61F31",
      accent: "#F7C948",
      textOnPrimary: "#FFFFFF",
      textOnLight: "#1A1A1A",
    },
    decorations: ["paddy", "doves"],
    decorationIntensity: "medium" as const,
    headlineTier: "xlarge" as const,
  };

  it("validates a compliant layout plan", () => {
    const result = LayoutPlanSchema.safeParse(validPlan);
    expect(result.success).toBe(true);
  });

  it("rejects a layout plan with zoom out of bounds (> 1.6)", () => {
    const result = LayoutPlanSchema.safeParse({
      ...validPlan,
      photos: [{ index: 0, focal: { x: 0.5, y: 0.3 }, zoom: 1.8 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a layout plan with invalid hex color", () => {
    const result = LayoutPlanSchema.safeParse({
      ...validPlan,
      colors: {
        ...validPlan.colors,
        primary: "not-a-hex-color",
      },
    });
    expect(result.success).toBe(false);
  });
});

describe("Sanitization and HTML Escape", () => {
  it("escapes all HTML special characters safely", () => {
    const dangerous = `<script>alert("XSS & danger's / path")</script>`;
    const escaped = escapeHtml(dangerous);
    expect(escaped).toBe(
      "&lt;script&gt;alert(&quot;XSS &amp; danger&#39;s &#x2F; path&quot;)&lt;&#x2F;script&gt;"
    );
  });

  it("strips control characters during normalization", () => {
    const textWithControl = "Hello\u0000\u001F World\u007F";
    expect(normalizeAndSanitizeText(textWithControl)).toBe("Hello World");
  });
});

describe("assertUserOwnsPublicId (FR-U3 / CHECK 4)", () => {
  const userId = "user123";

  it("valid path → true", () => {
    expect(assertUserOwnsPublicId(`posters/uploads/${userId}/photo_abc.webp`, userId)).toBe(true);
  });

  it("other user → false", () => {
    expect(assertUserOwnsPublicId(`posters/uploads/otherUser456/photo_abc.webp`, userId)).toBe(false);
  });

  it("wrong folder (generated/) → false", () => {
    expect(assertUserOwnsPublicId(`posters/generated/${userId}/photo_abc.webp`, userId)).toBe(false);
  });

  it("no trailing slash → false", () => {
    expect(assertUserOwnsPublicId(`posters/uploads/${userId}evil/photo_abc.webp`, userId)).toBe(false);
    expect(assertUserOwnsPublicId(`posters/uploads/${userId}`, userId)).toBe(false);
  });

  it("path traversal (../) → false", () => {
    expect(assertUserOwnsPublicId(`posters/uploads/${userId}/../../victim/photo.webp`, userId)).toBe(false);
  });
});

