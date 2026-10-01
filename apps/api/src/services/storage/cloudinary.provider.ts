import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import { StorageProvider, UploadOptions, UploadResult } from "./types.js";
import { env } from "../../config/env.js";

export class CloudinaryStorageProvider implements StorageProvider {
  constructor() {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }

  async upload(buffer: Buffer, opts: UploadOptions = {}): Promise<UploadResult> {
    return new Promise<UploadResult>((resolve, reject) => {
      const uploadOptions: Record<string, unknown> = {
        resource_type: "image",
      };

      if (opts.folder) {
        uploadOptions.folder = opts.folder;
      }
      if (opts.publicId) {
        uploadOptions.public_id = opts.publicId;
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            return reject(error || new Error("Cloudinary upload failed"));
          }
          resolve({
            url: result.secure_url || result.url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
          });
        }
      );

      uploadStream.end(buffer);
    });
  }

  async delete(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }

  getUrl(publicId: string, transforms: Record<string, unknown> = {}): string {
    return cloudinary.url(publicId, {
      secure: true,
      ...transforms,
    });
  }
}
