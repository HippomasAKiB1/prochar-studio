import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { app } from "../app.js";
import { Template } from "../models/Template.js";
import { User } from "../models/User.js";
import { seedDatabase } from "../scripts/seed.js";

let mongoServer: MongoMemoryServer;
let uri: string;

describe("Phase 3 Integration Verification Suite (PRD §9.2, §11.2 & SEED_TEMPLATES)", () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    uri = mongoServer.getUri();
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoServer.stop();
  });

  describe("Seed Idempotency & Demo User Provisioning", () => {
    let firstRunTemplates: any[];
    let firstRunDemoUser: any;

    it("runs seed on a fresh DB and completes exit 0", async () => {
      const res = await seedDatabase({ uri, silent: true });
      expect(res.templatesCount).toBe(3);
      expect(res.demoUserStatus).toBe("created");

      firstRunTemplates = await Template.find({}).sort({ slug: 1 }).lean();
      expect(firstRunTemplates).toHaveLength(3);

      firstRunDemoUser = await User.findOne({ email: "demo@prochar.studio" })
        .select("+passwordHash")
        .lean();
      expect(firstRunDemoUser).toBeDefined();
      expect(firstRunDemoUser.passwordHash).toBeDefined();
    }, 30000);

    it("runs seed a second time and produces identical templates & preserves demo credentials", async () => {
      const res = await seedDatabase({ uri, silent: true });
      expect(res.templatesCount).toBe(3);
      expect(res.demoUserStatus).toBe("existing_preserved");

      const secondRunTemplates = await Template.find({}).sort({ slug: 1 }).lean();
      expect(secondRunTemplates).toHaveLength(3);

      // Verify identical IDs and properties
      for (let i = 0; i < 3; i++) {
        expect(secondRunTemplates[i]._id.toString()).toBe(
          firstRunTemplates[i]._id.toString()
        );
        expect(secondRunTemplates[i].slug).toBe(firstRunTemplates[i].slug);
        expect(secondRunTemplates[i].title).toBe(firstRunTemplates[i].title);
        expect(secondRunTemplates[i].occasionType).toBe(
          firstRunTemplates[i].occasionType
        );
      }

      // Verify demo user unchanged
      const secondRunDemoUser = await User.findOne({ email: "demo@prochar.studio" })
        .select("+passwordHash")
        .lean();
      expect(secondRunDemoUser!._id.toString()).toBe(
        firstRunDemoUser._id.toString()
      );
      expect(secondRunDemoUser!.passwordHash).toBe(firstRunDemoUser.passwordHash);
    }, 30000);

    it("allows demo user login via POST /api/auth/login with demo credentials -> 200", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          identifier: "demo@prochar.studio",
          password: "ProcharDemo2026!",
        });

      expect(res.status).toBe(200);
      expect(res.headers["set-cookie"]).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe("demo@prochar.studio");
      expect(res.body.user.name).toBe("Prochar Demo");
      expect(res.body.user.role).toBe("user");
      expect(res.body.user.passwordHash).toBeUndefined();
    });
  });

  describe("Template API End-to-End Flow", () => {
    let demoCookie: string;

    beforeAll(async () => {
      // Login as demo user to obtain session cookie
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
          identifier: "demo@prochar.studio",
          password: "ProcharDemo2026!",
        });
      demoCookie = loginRes.headers["set-cookie"][0].split(";")[0];
    });

    it("rejects unauthenticated requests to GET /api/templates with 401", async () => {
      const res = await request(app).get("/api/templates");
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("UNAUTHORIZED");
    });

    it("GET /api/templates returns exactly 3 templates with auth", async () => {
      const res = await request(app)
        .get("/api/templates")
        .set("Cookie", [demoCookie]);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(3);

      const slugs = res.body.map((t: any) => t.slug);
      expect(slugs).toContain("victory-day-classic");
      expect(slugs).toContain("condolence-tribute");
      expect(slugs).toContain("campaign-bold");
    });

    it("GET /api/templates?occasion=victory_day returns exactly 1 template", async () => {
      const res = await request(app)
        .get("/api/templates?occasion=victory_day")
        .set("Cookie", [demoCookie]);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].slug).toBe("victory-day-classic");
      expect(res.body[0].occasionType).toBe("victory_day");
    });

    it("GET /api/templates?occasion=condolence returns exactly 1 template", async () => {
      const res = await request(app)
        .get("/api/templates?occasion=condolence")
        .set("Cookie", [demoCookie]);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].slug).toBe("condolence-tribute");
    });

    it("GET /api/templates?occasion=campaign returns exactly 1 template", async () => {
      const res = await request(app)
        .get("/api/templates?occasion=campaign")
        .set("Cookie", [demoCookie]);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].slug).toBe("campaign-bold");
    });

    it("GET /api/templates?occasion=greetings returns empty array 200 []", async () => {
      const res = await request(app)
        .get("/api/templates?occasion=greetings")
        .set("Cookie", [demoCookie]);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("GET /api/templates?occasion=invalid_enum returns 400 VALIDATION_ERROR", async () => {
      const res = await request(app)
        .get("/api/templates?occasion=birthday_party")
        .set("Cookie", [demoCookie]);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("VALIDATION_ERROR");
    });

    it("GET /api/templates/:id returns full layoutConfig for valid template", async () => {
      const listRes = await request(app)
        .get("/api/templates")
        .set("Cookie", [demoCookie]);

      const target = listRes.body[0];

      const res = await request(app)
        .get(`/api/templates/${target.id}`)
        .set("Cookie", [demoCookie]);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(target.id);
      expect(res.body.slug).toBe(target.slug);
      expect(res.body.layoutConfig).toBeDefined();
      expect(res.body.layoutConfig.schemaVersion).toBe(1);
      expect(res.body.layoutConfig.canvas).toEqual({ width: 600, height: 800 });
      expect(res.body.layoutConfig.textSlots).toBeDefined();
      expect(res.body.layoutConfig.photoSlots).toBeDefined();
      expect(res.body.layoutConfig.decorations).toBeDefined();
    });

    it("GET /api/templates/:id returns 400 for invalid ObjectId format", async () => {
      const res = await request(app)
        .get("/api/templates/invalid-mongo-id")
        .set("Cookie", [demoCookie]);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("VALIDATION_ERROR");
    });

    it("GET /api/templates/:id returns 404 for non-existent template ID", async () => {
      const randomId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/templates/${randomId}`)
        .set("Cookie", [demoCookie]);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("NOT_FOUND");
    });

    it("GET /api/templates/:id returns 404 for inactive template", async () => {
      const activeTemplate = await Template.findOne({ slug: "victory-day-classic" });
      const inactive = await Template.create({
        slug: "inactive-template-test",
        title: "Inactive Test",
        titleEn: "Inactive Test En",
        occasionType: "greetings",
        thumbnailUrl: "/thumb.png",
        layoutConfig: activeTemplate!.layoutConfig,
        isActive: false,
      });

      const res = await request(app)
        .get(`/api/templates/${inactive._id}`)
        .set("Cookie", [demoCookie]);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("NOT_FOUND");
    });
  });
});
