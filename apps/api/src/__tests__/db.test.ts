import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { app } from "../app.js";
import { connectDb, disconnectDb, isDbConnected } from "../config/db.js";

describe("Database Connection & Health Check", () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await connectDb(uri);
  }, 30000);

  afterAll(async () => {
    await disconnectDb();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  it("successfully connects to MongoDB in memory", () => {
    expect(isDbConnected()).toBe(true);
  });

  it("GET /api/health reflects db: 'up' when connected", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: "ok",
      db: "up",
      uptime: expect.any(Number),
    });
  });
});
