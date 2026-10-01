import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../app.js";

describe("GET /api/health", () => {
  it("returns exactly { status: 'ok', db: 'up', uptime: <n> }", async () => {
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: "ok",
      db: "up",
      uptime: expect.any(Number),
    });

    // Ensure no additional fields exist (PRD / Phase 1 constraint)
    const keys = Object.keys(res.body);
    expect(keys.sort()).toEqual(["db", "status", "uptime"]);
  });
});
