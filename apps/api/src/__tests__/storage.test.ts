import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { app } from "../app.js";
import {
  LocalStorageProvider,
  CloudinaryStorageProvider,
  createStorageProvider,
  getStorageProvider,
} from "../services/storage/index.js";
import { env } from "../config/env.js";

// Mock cloudinary SDK
vi.mock("cloudinary", () => {
  return {
    v2: {
      config: vi.fn(),
      uploader: {
        upload_stream: vi.fn((_options, callback) => {
          const stream = {
            end: vi.fn((_buffer) => {
              callback(null, {
                secure_url: "https://res.cloudinary.com/demo/image/upload/sample.webp",
                public_id: "posters/uploads/user123/sample_uuid",
                width: 1200,
                height: 1800,
              });
            }),
          };
          return stream;
        }),
        destroy: vi.fn().mockResolvedValue({ result: "ok" }),
      },
      url: vi.fn((publicId) => `https://res.cloudinary.com/demo/image/upload/${publicId}`),
    },
  };
});

describe("Storage Providers", () => {
  describe("LocalStorageProvider", () => {
    let tmpDir: string;
    let localProvider: LocalStorageProvider;

    beforeEach(async () => {
      tmpDir = path.join(os.tmpdir(), `prochar-test-storage-${Date.now()}`);
      await fs.mkdir(tmpDir, { recursive: true });
      localProvider = new LocalStorageProvider(tmpDir);
    });

    afterEach(async () => {
      await fs.rm(tmpDir, { recursive: true, force: true });
    });

    it("uploads buffer to local disk and returns valid result", async () => {
      const buffer = Buffer.from("fake-image-bytes");
      const result = await localProvider.upload(buffer, {
        folder: "posters/uploads/usr1",
        publicId: "posters/uploads/usr1/test.webp",
      });

      expect(result.publicId).toBe("posters/uploads/usr1/test.webp");
      expect(result.url).toBe("/api/storage/posters/uploads/usr1/test.webp");

      // Verify file exists on disk
      const filePath = path.join(tmpDir, "posters/uploads/usr1/test.webp");
      const fileData = await fs.readFile(filePath);
      expect(fileData.toString()).toBe("fake-image-bytes");
    });

    it("deletes file from local disk", async () => {
      const buffer = Buffer.from("fake-image-bytes");
      const result = await localProvider.upload(buffer, {
        publicId: "uploads/delete-me.webp",
      });

      const filePath = path.join(tmpDir, result.publicId);
      await expect(fs.access(filePath)).resolves.toBeUndefined();

      await localProvider.delete(result.publicId);
      await expect(fs.access(filePath)).rejects.toThrow();
    });

    it("generates correct local url", () => {
      expect(localProvider.getUrl("uploads/file.webp")).toBe("/api/storage/uploads/file.webp");
    });

    it("rejects path traversal attempts", async () => {
      const buffer = Buffer.from("malicious");
      await expect(
        localProvider.upload(buffer, {
          publicId: "../../../malicious.webp",
        })
      ).rejects.toThrow("Invalid publicId path traversal detected");
    });
  });

  describe("CloudinaryStorageProvider", () => {
    it("uploads buffer via cloudinary upload_stream", async () => {
      const provider = new CloudinaryStorageProvider();
      const buffer = Buffer.from("fake-cloudinary-bytes");

      const result = await provider.upload(buffer, {
        folder: "posters/uploads/user123",
        publicId: "posters/uploads/user123/sample_uuid",
      });

      expect(result.publicId).toBe("posters/uploads/user123/sample_uuid");
      expect(result.url).toContain("res.cloudinary.com");
      expect(result.width).toBe(1200);
      expect(result.height).toBe(1800);
    });

    it("deletes asset via cloudinary uploader.destroy", async () => {
      const provider = new CloudinaryStorageProvider();
      await expect(provider.delete("posters/uploads/user123/sample_uuid")).resolves.toBeUndefined();
    });

    it("formats cloudinary URL via getUrl", () => {
      const provider = new CloudinaryStorageProvider();
      const url = provider.getUrl("posters/uploads/user123/sample_uuid");
      expect(url).toBe("https://res.cloudinary.com/demo/image/upload/posters/uploads/user123/sample_uuid");
    });
  });

  describe("createStorageProvider Factory", () => {
    let originalProvider: string;

    beforeEach(() => {
      originalProvider = env.STORAGE_PROVIDER;
    });

    afterEach(() => {
      (env as { STORAGE_PROVIDER: string }).STORAGE_PROVIDER = originalProvider;
    });

    it("creates LocalStorageProvider when STORAGE_PROVIDER=local", () => {
      (env as { STORAGE_PROVIDER: string }).STORAGE_PROVIDER = "local";
      const provider = createStorageProvider();
      expect(provider).toBeInstanceOf(LocalStorageProvider);
    });

    it("creates CloudinaryStorageProvider when STORAGE_PROVIDER=cloudinary", () => {
      (env as { STORAGE_PROVIDER: string }).STORAGE_PROVIDER = "cloudinary";
      const provider = createStorageProvider();
      expect(provider).toBeInstanceOf(CloudinaryStorageProvider);
    });
  });

  describe("GET /api/storage/* local file serving route", () => {
    it("returns 404 for non-existent file", async () => {
      const res = await request(app).get("/api/storage/non-existent-file.webp");
      expect(res.status).toBe(404);
      expect(res.body.error).toBe("NOT_FOUND");
    });

    it("returns 403 on directory traversal attempt", async () => {
      const res = await request(app).get("/api/storage/../../etc/passwd");
      expect(res.status).toBe(403);
      expect(res.body.error).toBe("FORBIDDEN");
    });

    it("serves uploaded file with 200", async () => {
      const provider = getStorageProvider();
      if (provider instanceof LocalStorageProvider) {
        const buffer = Buffer.from("sample webp content");
        const uploadResult = await provider.upload(buffer, {
          folder: "test-serve",
          publicId: "test-serve/sample.txt",
        });

        const res = await request(app).get(uploadResult.url);
        expect(res.status).toBe(200);
        expect(res.text).toBe("sample webp content");

        // Clean up
        await provider.delete(uploadResult.publicId);
      }
    });
  });
});
