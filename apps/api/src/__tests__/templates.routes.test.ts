import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { app } from "../app.js";
import { Template } from "../models/Template.js";
import { User } from "../models/User.js";
import { signToken, COOKIE_NAME } from "../services/auth.service.js";
import { SEED_TEMPLATES_DATA } from "../scripts/seed-data.js";
import { expandStandardFooterSlots, TemplateLayoutConfig } from "@prochar/shared";

let mongoServer: MongoMemoryServer;
let authCookie: string;

describe("Templates Routes (/api/templates)", () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Create a test user and obtain auth cookie
    const user = await User.create({
      name: "Template Tester",
      email: "tester@example.com",
      passwordHash: "dummyhash",
      role: "user",
    });
    const token = signToken({ sub: user._id.toString(), role: user.role });
    authCookie = `${COOKIE_NAME}=${token}; Path=/`;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Template.deleteMany({});

    // Seed the 3 standard templates
    for (const tpl of SEED_TEMPLATES_DATA) {
      const expandedSlots = expandStandardFooterSlots(
        (tpl.layoutConfig as any).textSlots
      );
      const layoutConfig: TemplateLayoutConfig = {
        ...(tpl.layoutConfig as any),
        textSlots: expandedSlots,
      };

      await Template.create({
        slug: tpl.slug,
        title: tpl.title,
        titleEn: tpl.titleEn,
        occasionType: tpl.occasionType,
        thumbnailUrl: `/api/templates/thumbnail/${tpl.slug}`,
        layoutConfig,
        isActive: tpl.isActive,
      });
    }
  });

  describe("GET /api/templates", () => {
    it("rejects unauthenticated requests with 401", async () => {
      const res = await request(app).get("/api/templates");
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("UNAUTHORIZED");
    });

    it("returns all active templates (3) with valid auth", async () => {
      const res = await request(app)
        .get("/api/templates")
        .set("Cookie", [authCookie]);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(3);

      const victory = res.body.find((t: any) => t.slug === "victory-day-classic");
      expect(victory).toBeDefined();
      expect(victory.title).toBe("বিজয় দিবস — ক্লাসিক");
      expect(victory.occasionType).toBe("victory_day");
      expect(victory.thumbnailUrl).toBe("/api/templates/thumbnail/victory-day-classic");
      // layoutConfig should not be included in the list view
      expect(victory.layoutConfig).toBeUndefined();
    });

    it("filters templates by valid occasion (victory_day -> 1)", async () => {
      const res = await request(app)
        .get("/api/templates?occasion=victory_day")
        .set("Cookie", [authCookie]);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].slug).toBe("victory-day-classic");
    });

    it("returns empty array for valid occasion with no templates (eid_festival -> 0)", async () => {
      const res = await request(app)
        .get("/api/templates?occasion=eid_festival")
        .set("Cookie", [authCookie]);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("rejects invalid occasion parameter with 400", async () => {
      const res = await request(app)
        .get("/api/templates?occasion=not_a_real_occasion")
        .set("Cookie", [authCookie]);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("VALIDATION_ERROR");
    });
  });

  describe("GET /api/templates/:id", () => {
    it("rejects unauthenticated requests with 401", async () => {
      const template = await Template.findOne({ slug: "victory-day-classic" });
      const res = await request(app).get(`/api/templates/${template!._id}`);
      expect(res.status).toBe(401);
    });

    it("returns full template with layoutConfig for valid ID", async () => {
      const template = await Template.findOne({ slug: "victory-day-classic" });
      const res = await request(app)
        .get(`/api/templates/${template!._id}`)
        .set("Cookie", [authCookie]);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(template!._id.toString());
      expect(res.body.slug).toBe("victory-day-classic");
      expect(res.body.layoutConfig).toBeDefined();
      expect(res.body.layoutConfig.canvas).toEqual({ width: 600, height: 800 });
      expect(res.body.layoutConfig.layoutFamily).toBe("triple-top");
      expect(res.body.layoutConfig.photoSlots).toBeDefined();
    });

    it("returns 400 for malformed/invalid ObjectId", async () => {
      const res = await request(app)
        .get("/api/templates/not-an-id")
        .set("Cookie", [authCookie]);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("VALIDATION_ERROR");
    });

    it("returns 404 for non-existent template ID", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/templates/${nonExistentId}`)
        .set("Cookie", [authCookie]);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("NOT_FOUND");
    });

    it("returns 404 for inactive template", async () => {
      const inactive = await Template.create({
        slug: "inactive-template",
        title: "Inactive",
        titleEn: "Inactive En",
        occasionType: "campaign",
        thumbnailUrl: "/thumb.png",
        layoutConfig: SEED_TEMPLATES_DATA[0].layoutConfig as any,
        isActive: false,
      });

      const res = await request(app)
        .get(`/api/templates/${inactive._id}`)
        .set("Cookie", [authCookie]);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("NOT_FOUND");
    });
  });
});
