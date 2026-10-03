import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { StorageProvider, UploadOptions, UploadResult } from "./types.js";

/**
 * Resolve publicId under baseDir. Throws if it escapes the root.
 * Uses path.relative so sibling dirs like "<root>-evil" are rejected too.
 */
export function resolveInsideRoot(baseDir: string, publicId: string): string {
  if (typeof publicId !== "string" || publicId.length === 0 || publicId.includes("\0")) {
    throw new Error("Invalid publicId");
  }
  const root = path.resolve(baseDir);
  const full = path.resolve(root, publicId);
  const rel = path.relative(root, full);
  if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("Invalid publicId path traversal detected");
  }
  return full;
}

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

    const fullPath = resolveInsideRoot(this.baseDir, publicId);

    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);

    const url = `/api/storage/${publicId}`;
    return {
      url,
      publicId,
    };
  }

  async delete(publicId: string): Promise<void> {
    const fullPath = resolveInsideRoot(this.baseDir, publicId);

    try {
      await fs.unlink(fullPath);
    } catch (err: unknown) {
      if ((err as { code?: string }).code !== "ENOENT") {
        throw err;
      }
    }
  }

  getUrl(publicId: string): string {
    // Validates containment; throws on traversal.
    resolveInsideRoot(this.baseDir, publicId);
    return `/api/storage/${publicId}`;
  }

  async readFile(publicId: string): Promise<Buffer> {
    return fs.readFile(resolveInsideRoot(this.baseDir, publicId));
  }

  getBaseDir(): string {
    return this.baseDir;
  }
}
