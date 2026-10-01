import { StorageProvider } from "./types.js";
import { LocalStorageProvider } from "./local.provider.js";
import { CloudinaryStorageProvider } from "./cloudinary.provider.js";
import { env } from "../../config/env.js";

export * from "./types.js";
export * from "./local.provider.js";
export * from "./cloudinary.provider.js";

/**
 * Factory function that instantiates the configured StorageProvider based on STORAGE_PROVIDER env.
 * Fails fast if STORAGE_PROVIDER is unset or invalid.
 */
export function createStorageProvider(): StorageProvider {
  const provider = env.STORAGE_PROVIDER;

  if (provider === "local") {
    return new LocalStorageProvider();
  }

  if (provider === "cloudinary") {
    return new CloudinaryStorageProvider();
  }

  throw new Error(
    `STORAGE_PROVIDER must be configured as 'local' or 'cloudinary'. Received: '${provider}'`
  );
}

let _storageProviderInstance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (!_storageProviderInstance) {
    _storageProviderInstance = createStorageProvider();
  }
  return _storageProviderInstance;
}
