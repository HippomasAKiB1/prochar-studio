import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { StorageProvider, UploadOptions, UploadResult } from "./types.js";

export class LocalStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor(customDir?: string) {
    if (customDir) {
      this.baseDir = customDir;
    } else {
      const currentCwd = process.cwd();
      this.baseDir = currentCwd.endsWith("apps/api")
        ? path.resolve(currentCwd, ".local-storage")
        : path.resolve(currentCwd, "apps/api/.local-storage");
    }
  }

  async init(): Promise<void> {
    await fs.mkdir(this.baseDir, { recursive: true });
  }

  async upload(buffer: Buffer, opts: UploadOptions = {}): Promise<UploadResult> {
    await this.init();

    let publicId = opts.publicId;
    if (!publicId) {
      const folder = opts.folder ? opts.folder.replace(/^\/+|\/+$/g, "") : "uploads";
      const filename = `${crypto.randomUUID()}.webp`;
      publicId = `${folder}/${filename}`;
    }

    const fullPath = path.resolve(this.baseDir, publicId);
    // Security check: Guard against path traversal
    if (!fullPath.startsWith(path.resolve(this.baseDir))) {
      throw new Error("Invalid publicId path traversal detected");
    }

    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);

    const url = `/api/storage/${publicId}`;
    return {
      url,
      publicId,
    };
  }

  async delete(publicId: string): Promise<void> {
    const fullPath = path.resolve(this.baseDir, publicId);
    if (!fullPath.startsWith(path.resolve(this.baseDir))) {
      throw new Error("Invalid publicId path traversal detected");
    }

    try {
      await fs.unlink(fullPath);
    } catch (err: unknown) {
      if ((err as { code?: string }).code !== "ENOENT") {
        throw err;
      }
    }
  }

  getUrl(publicId: string): string {
    return `/api/storage/${publicId}`;
  }

  getBaseDir(): string {
    return this.baseDir;
  }
}
