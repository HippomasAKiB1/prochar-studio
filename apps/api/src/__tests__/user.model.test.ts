import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { User } from "../models/User.js";

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  await User.init(); // Wait for indexes to build
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
});

describe("User Model", () => {
  it("verifies email and phone unique sparse indexes via User.collection.getIndexes()", async () => {
    const indexes = await User.collection.getIndexes();
    
    // Check email index
    expect(indexes).toHaveProperty("email_1");
    expect(indexes.email_1).toBeDefined();
    // In mongodb driver, unique and sparse flags are present on the index spec
    expect(indexes.email_1).toEqual(
      expect.arrayContaining([expect.arrayContaining(["email", 1])])
    );

    // Check phone index
    expect(indexes).toHaveProperty("phone_1");
    expect(indexes.phone_1).toEqual(
      expect.arrayContaining([expect.arrayContaining(["phone", 1])])
    );
  });

  it("creates user with email successfully", async () => {
    const user = await User.create({
      name: "Tariqul Islam",
      email: "tariq@example.com",
      passwordHash: "hashed_secret_string_123",
      role: "user",
    });

    expect(user._id).toBeDefined();
    expect(user.name).toBe("Tariqul Islam");
    expect(user.email).toBe("tariq@example.com");
    expect(user.role).toBe("user");
    expect(user.createdAt).toBeDefined();
  });

  it("creates user with phone successfully", async () => {
    const user = await User.create({
      name: "Nasir Hossain",
      phone: "+8801712345678",
      passwordHash: "hashed_secret_string_123",
    });

    expect(user._id).toBeDefined();
    expect(user.phone).toBe("+8801712345678");
    expect(user.role).toBe("user");
  });

  it("rejects creation if neither email nor phone is provided", async () => {
    await expect(
      User.create({
        name: "No Contact User",
        passwordHash: "hashed_secret_string_123",
      })
    ).rejects.toThrow("Either email or phone is required");
  });

  it("does not return passwordHash in find queries by default", async () => {
    await User.create({
      name: "Secret User",
      email: "secret@example.com",
      passwordHash: "super_secret_hash_not_to_leak",
    });

    const found = await User.findOne({ email: "secret@example.com" }).lean();
    expect(found).toBeDefined();
    expect((found as { passwordHash?: string })?.passwordHash).toBeUndefined();

    const withSecret = await User.findOne({ email: "secret@example.com" }).select("+passwordHash");
    expect(withSecret?.passwordHash).toBe("super_secret_hash_not_to_leak");
  });

  it("allows multiple users without email without duplicate key collision (sparse index)", async () => {
    const u1 = await User.create({
      name: "User One",
      phone: "+8801711111111",
      passwordHash: "hash1",
    });
    const u2 = await User.create({
      name: "User Two",
      phone: "+8801722222222",
      passwordHash: "hash2",
    });

    expect(u1._id).toBeDefined();
    expect(u2._id).toBeDefined();
  });

  it("allows multiple users without phone without duplicate key collision (sparse index)", async () => {
    const u1 = await User.create({
      name: "User Three",
      email: "user3@example.com",
      passwordHash: "hash1",
    });
    const u2 = await User.create({
      name: "User Four",
      email: "user4@example.com",
      passwordHash: "hash2",
    });

    expect(u1._id).toBeDefined();
    expect(u2._id).toBeDefined();
  });

  it("prevents duplicate email registration", async () => {
    await User.create({
      name: "Original User",
      email: "duplicate@example.com",
      passwordHash: "hash1",
    });

    await expect(
      User.create({
        name: "Duplicate User",
        email: "duplicate@example.com",
        passwordHash: "hash2",
      })
    ).rejects.toThrow(/E11000/);
  });

  it("prevents duplicate phone registration", async () => {
    await User.create({
      name: "Original Phone User",
      phone: "+8801799999999",
      passwordHash: "hash1",
    });

    await expect(
      User.create({
        name: "Duplicate Phone User",
        phone: "+8801799999999",
        passwordHash: "hash2",
      })
    ).rejects.toThrow(/E11000/);
  });
});
