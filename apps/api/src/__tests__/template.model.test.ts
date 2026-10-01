import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Template } from "../models/Template.js";
import { TemplateLayoutConfig } from "@prochar/shared";

let mongoServer: MongoMemoryServer;

const sampleValidLayoutConfig: TemplateLayoutConfig = {
  schemaVersion: 1,
  canvas: { width: 600, height: 800 },
  layoutFamily: "triple-top",
  colorScheme: {
    background: "#FFF8E7",
    primary: "#006A4E",
    secondary: "#D61F31",
    accent: "#F7C948",
    textOnPrimary: "#FFFFFF",
    textOnLight: "#1A1A1A",
  },
  contrastPairs: [
    { fg: "textOnPrimary", bg: "primary", min: 4.5 },
    { fg: "textOnPrimary", bg: "secondary", min: 4.5 },
  ],
  layers: [
    { id: "base", type: "rect", x: 0, y: 0, w: 600, h: 800, fill: "$background" },
    { id: "band", type: "asset", asset: "test/asset.svg", x: 0, y: 0, w: 600, h: 300 },
    {
      id: "frame1",
      type: "frame",
      x: 10,
      y: 10,
      w: 580,
      h: 780,
      stroke: { width: 2, color: "$primary" },
    },
  ],
  photoSlots: [
    {
      id: "center",
      shape: "arch",
      x: 200,
      y: 50,
      w: 200,
      h: 250,
      z: 4,
      border: { width: 4, color: "$accent" },
    },
  ],
  photoAssignment: {
    "1": ["center"],
    "2": ["center"],
    "3": ["center"],
  },
  textSlots: [
    {
      id: "headline",
      source: "headline",
      x: 30,
      y: 350,
      w: 540,
      h: 100,
      fontFamily: "Hind Siliguri",
      fontWeight: 700,
      minFont: 24,
      maxFont: 64,
      maxLines: 2,
      lineHeight: 1.3,
      align: "center",
      valign: "middle",
      color: "$textOnPrimary",
    },
  ],
  footer: {
    preset: "standard-v1",
    fill: "$primary",
    topRule: { height: 4, color: "$accent" },
  },
  decorations: [
    {
      key: "doves",
      asset: "test/doves.svg",
      layer: "mid",
      opacity: 1,
      minIntensity: "low",
      placements: [{ x: 100, y: 500, w: 50, h: 50 }],
    },
  ],
  aiAllowedDecorations: ["doves"],
  maxPhotos: 3,
};

describe("Template Model (Chunk 3.1)", () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    await Template.init();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Template.deleteMany({});
  });

  it("creates a template successfully with valid layoutConfig", async () => {
    const template = await Template.create({
      slug: "victory-day-classic",
      title: "বিজয় দিবস — ক্লাসিক",
      titleEn: "Victory Day — Classic",
      occasionType: "victory_day",
      thumbnailUrl: "/api/templates/thumbnail/victory-day-classic",
      layoutConfig: sampleValidLayoutConfig,
    });

    expect(template._id).toBeDefined();
    expect(template.slug).toBe("victory-day-classic");
    expect(template.isActive).toBe(true);
    expect(template.createdAt).toBeInstanceOf(Date);
  });

  it("enforces unique index on slug", async () => {
    await Template.create({
      slug: "victory-day-classic",
      title: "Title 1",
      titleEn: "Title 1 En",
      occasionType: "victory_day",
      thumbnailUrl: "/thumb1.png",
      layoutConfig: sampleValidLayoutConfig,
    });

    await expect(
      Template.create({
        slug: "victory-day-classic",
        title: "Title 2",
        titleEn: "Title 2 En",
        occasionType: "victory_day",
        thumbnailUrl: "/thumb2.png",
        layoutConfig: sampleValidLayoutConfig,
      })
    ).rejects.toThrow();
  });

  it("rejects invalid occasionType", async () => {
    await expect(
      Template.create({
        slug: "invalid-occasion",
        title: "Invalid",
        titleEn: "Invalid En",
        occasionType: "not_a_valid_occasion" as any,
        thumbnailUrl: "/thumb.png",
        layoutConfig: sampleValidLayoutConfig,
      })
    ).rejects.toThrow();
  });

  it("rejects invalid layoutConfig via Zod pre-validate hook", async () => {
    const invalidConfig = {
      ...sampleValidLayoutConfig,
      canvas: { width: 500, height: 800 }, // Invalid: must be 600x800
    };

    await expect(
      Template.create({
        slug: "invalid-config",
        title: "Invalid Config",
        titleEn: "Invalid Config En",
        occasionType: "victory_day",
        thumbnailUrl: "/thumb.png",
        layoutConfig: invalidConfig,
      })
    ).rejects.toThrow(/Invalid layoutConfig/);
  });

  it("rejects layoutConfig with invalid color token", async () => {
    const invalidTokenConfig = {
      ...sampleValidLayoutConfig,
      layers: [
        {
          id: "base",
          type: "rect",
          x: 0,
          y: 0,
          w: 600,
          h: 800,
          fill: "$invalidToken", // Not in TokenEnum
        },
      ],
    };

    await expect(
      Template.create({
        slug: "invalid-token",
        title: "Invalid Token",
        titleEn: "Invalid Token En",
        occasionType: "victory_day",
        thumbnailUrl: "/thumb.png",
        layoutConfig: invalidTokenConfig,
      })
    ).rejects.toThrow(/Invalid layoutConfig/);
  });

  it("verifies compound index on occasionType and isActive exists", () => {
    const indexes = Template.schema.indexes();
    const hasCompound = indexes.some(
      ([fields]) => fields.occasionType === 1 && fields.isActive === 1
    );
    expect(hasCompound).toBe(true);
  });
});
