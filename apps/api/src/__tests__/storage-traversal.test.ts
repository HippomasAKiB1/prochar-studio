import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { LocalStorageProvider, resolveInsideRoot } from "../services/storage/local.provider.js";

describe("LocalStorageProvider path traversal", () => {
  let tmp: string;
  let root: string;
  let provider: LocalStorageProvider;

  beforeAll(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "prochar-trav-"));
    root = path.join(tmp, "store");
    await fs.mkdir(root, { recursive: true });
    // Sibling dir sharing the root's string prefix (defeats naive startsWith)
    await fs.mkdir(path.join(tmp, "store-evil"), { recursive: true });
    await fs.writeFile(path.join(tmp, "store-evil", "secret.txt"), "secret");
    provider = new LocalStorageProvider(root);
    await provider.init();
  });

  afterAll(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it("getUrl('../../../etc/passwd') throws", () => {
    expect(() => provider.getUrl("../../../etc/passwd")).toThrow(/traversal/i);
  });

  it("readFile('../../etc/passwd') rejects", async () => {
    await expect(provider.readFile("../../etc/passwd")).rejects.toThrow(/traversal/i);
  });

  it("rejects sibling-prefix escape (store-evil)", async () => {
    expect(() => resolveInsideRoot(root, "../store-evil/secret.txt")).toThrow(/traversal/i);
    await expect(provider.readFile("../store-evil/secret.txt")).rejects.toThrow(/traversal/i);
  });

  it("rejects absolute paths, empty ids and null bytes", () => {
    expect(() => provider.getUrl(path.resolve("/etc/passwd"))).toThrow();
    expect(() => provider.getUrl("")).toThrow();
    expect(() => provider.getUrl("a\0b")).toThrow();
  });

  it("delete and upload reject traversal", async () => {
    await expect(provider.delete("../../x")).rejects.toThrow(/traversal/i);
    await expect(
      provider.upload(Buffer.from("x"), { publicId: "../escape.txt" }),
    ).rejects.toThrow(/traversal/i);
  });

  it("legit publicId round-trips", async () => {
    const r = await provider.upload(Buffer.from("hello"), { publicId: "uploads/u1/a.txt" });
    expect(provider.getUrl(r.publicId)).toBe("/api/storage/uploads/u1/a.txt");
    expect((await provider.readFile(r.publicId)).toString()).toBe("hello");
  });
});
